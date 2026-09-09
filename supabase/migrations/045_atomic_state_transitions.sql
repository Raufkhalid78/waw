-- Migration 045: Atomic courier status transitions + payment settlement
-- Closes the multi-step write races: a courier webhook updating shipment +
-- order + store_order + payout in four separate statements can interleave
-- with a concurrent webhook or crash mid-sequence, leaving related tables
-- disagreeing (shipment DELIVERED, order still SHIPPED, payout never matured).
-- Same class of risk for payment settlement (order -> PAID + webhook row ->
-- applied). Each RPC below runs in ONE transaction with row locks.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Courier event dedupe ledger
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courier_events (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  provider TEXT NOT NULL DEFAULT 'POSTEX',
  event_id TEXT NOT NULL,
  tracking_number TEXT,
  new_status TEXT,
  payload_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, event_id)
);

ALTER TABLE courier_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON courier_events FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Status rank helper (must match ORDER_STATUS_RANK in courier.service.ts)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION courier_status_rank(s TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE s
    WHEN 'PENDING' THEN 0
    WHEN 'CONFIRMED' THEN 1
    WHEN 'PROCESSING' THEN 2
    WHEN 'SHIPPED' THEN 3
    WHEN 'OUT_FOR_DELIVERY' THEN 4
    WHEN 'DELIVERED' THEN 5
    WHEN 'RETURN_REQUESTED' THEN 6
    WHEN 'RETURNED' THEN 7
    WHEN 'CANCELLED' THEN 8
    ELSE -1
  END;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Atomic courier status transition
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION apply_courier_status_event(
  p_tracking_number TEXT,
  p_new_status TEXT,
  p_event_id TEXT,
  p_payload_hash TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_shipment RECORD;
BEGIN
  -- Event-level idempotency: a replayed provider event (same event_id) is a
  -- no-op even if the shipment has since moved further forward.
  BEGIN
    INSERT INTO courier_events (provider, event_id, tracking_number, new_status, payload_hash)
    VALUES ('POSTEX', p_event_id, p_tracking_number, p_new_status, p_payload_hash);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'action', 'ignore-duplicate-event',
      'message', 'Event already processed (event idempotency)'
    );
  END;

  -- Lock the shipment row for the whole transition.
  SELECT * INTO v_shipment FROM shipments
    WHERE tracking_number = p_tracking_number
    FOR UPDATE;
  IF NOT FOUND THEN
    -- Event row persists; the reconciliation sweep can match it later.
    RETURN jsonb_build_object('action', 'shipment-not-found');
  END IF;

  IF v_shipment.status = p_new_status THEN
    RETURN jsonb_build_object(
      'action', 'ignore-duplicate',
      'message', 'Duplicate milestone ignored',
      'status', v_shipment.status
    );
  END IF;

  IF courier_status_rank(v_shipment.status) > courier_status_rank(p_new_status) THEN
    RETURN jsonb_build_object(
      'action', 'reject-regression',
      'message', 'Stale event rejected',
      'status', v_shipment.status
    );
  END IF;

  UPDATE shipments SET
    status = p_new_status,
    updated_at = NOW()
  WHERE id = v_shipment.id;

  UPDATE orders SET
    global_status = p_new_status,
    payment_status = CASE
      WHEN v_shipment.is_cod AND p_new_status = 'DELIVERED'
        THEN 'COD_COLLECTED'
      ELSE orders.payment_status
    END,
    delivered_at = CASE
      WHEN p_new_status = 'DELIVERED' THEN NOW()
      ELSE orders.delivered_at
    END,
    updated_at = NOW()
  WHERE id = v_shipment.order_id;

  IF v_shipment.store_order_id IS NOT NULL THEN
    UPDATE store_orders SET
      status = p_new_status,
      updated_at = NOW()
    WHERE id = v_shipment.store_order_id;

    IF p_new_status = 'DELIVERED' THEN
      UPDATE payouts SET
        status = 'SCHEDULED',
        scheduled_for = NOW() + INTERVAL '7 days',
        updated_at = NOW()
      WHERE store_id = (SELECT store_id FROM store_orders WHERE id = v_shipment.store_order_id)
        AND status = 'HELD_PENDING_DELIVERY';
    END IF;
  END IF;

  RETURN jsonb_build_object('action', 'applied', 'status', p_new_status);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Atomic payment settlement
-- Locks the webhook row and the order row, verifies state + amount, then
-- flips both in the same transaction. No partial-commit path exists.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION settle_order_payment(
  p_order_id TEXT,
  p_transaction_id TEXT,
  p_amount_pkr NUMERIC,
  p_payload_hash TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
  v_event RECORD;
BEGIN
  -- Lock the webhook event row first (single axis of concurrency).
  SELECT * INTO v_event FROM xpay_webhooks_log
    WHERE transaction_id = p_transaction_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'event-not-found');
  END IF;

  IF v_event.status = 'applied' THEN
    RETURN jsonb_build_object('action', 'already-applied');
  END IF;
  IF v_event.status <> 'received' THEN
    RETURN jsonb_build_object('action', 'event-not-received-state', 'status', v_event.status);
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'order-not-found');
  END IF;

  IF v_order.payment_status = 'PAID' THEN
    RETURN jsonb_build_object('action', 'already-paid');
  END IF;

  IF p_amount_pkr <> v_order.total_amount_pkr THEN
    RETURN jsonb_build_object(
      'action', 'amount-mismatch',
      'expected', v_order.total_amount_pkr,
      'received', p_amount_pkr
    );
  END IF;

  UPDATE orders SET
    payment_status = 'PAID',
    global_status = 'CONFIRMED',
    updated_at = NOW()
  WHERE id = p_order_id;

  UPDATE xpay_webhooks_log SET
    status = 'applied',
    updated_at = NOW()
  WHERE transaction_id = p_transaction_id;

  RETURN jsonb_build_object('action', 'settled');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Retry leasing for BOOKING_PENDING sweep (FOR UPDATE SKIP LOCKED)
-- Claims rows by leasing next_retry_at for the worker; a crashed worker's
-- lease expires and the row becomes eligible again.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_pending_bookings(
  p_limit INTEGER DEFAULT 20,
  p_lease_minutes INTEGER DEFAULT 15,
  p_max_attempts INTEGER DEFAULT 5
) RETURNS TABLE (
  id TEXT,
  order_id TEXT,
  is_cod BOOLEAN,
  cod_amount_pkr NUMERIC,
  booking_attempts INTEGER
)
LANGUAGE sql
AS $$
  WITH claimed AS (
    SELECT s.id
    FROM shipments s
    WHERE s.status = 'BOOKING_PENDING'
      AND s.booking_attempts < p_max_attempts
      AND (s.next_retry_at IS NULL OR s.next_retry_at <= NOW())
    ORDER BY s.booking_attempts ASC, s.updated_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE shipments s
    SET next_retry_at = NOW() + make_interval(mins => p_lease_minutes),
        updated_at = NOW()
  FROM claimed
  WHERE s.id = claimed.id
  RETURNING s.id, s.order_id, s.is_cod, s.cod_amount_pkr, s.booking_attempts;
$$;

GRANT EXECUTE ON FUNCTION claim_pending_bookings(INTEGER, INTEGER, INTEGER) TO service_role;

-- 6. Notification idempotency ledger (FCM fan-out dedupe)
CREATE TABLE IF NOT EXISTS notification_events (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  idempotency_key TEXT NOT NULL,
  user_id TEXT,
  channel TEXT NOT NULL DEFAULT 'push',
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel, idempotency_key)
);

ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON notification_events FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_notification_events_created
  ON notification_events (created_at);

-- 7. Notification idempotency: atomically claims a notification slot.
-- Returns true exactly once per (channel, idempotency_key); replays get
-- false so duplicate pushes are impossible.
CREATE OR REPLACE FUNCTION record_notification_event(
  p_idempotency_key TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT 'push'
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    INSERT INTO notification_events (idempotency_key, user_id, channel)
    VALUES (p_idempotency_key, p_user_id, p_channel);
    RETURN TRUE;
  EXCEPTION WHEN unique_violation THEN
    RETURN FALSE;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION record_notification_event(TEXT, TEXT, TEXT) TO service_role;
