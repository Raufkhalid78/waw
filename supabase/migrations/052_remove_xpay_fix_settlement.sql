-- ==============================================================================
-- 052: Remove XPay remnants; fix settle_order_payment (self-contained)
-- ==============================================================================
-- PostEx XPay was removed from the application in commit de50564, but the
-- database retained its webhook ledger. That caused a real production bug:
--
--   * settle_order_payment (045) REQUIRED a row in xpay_webhooks_log with
--     status='received' before it would settle an order, and nothing has
--     inserted those rows since the XPay removal — so every APG settlement
--     returned 'event-not-found' and digital payments could never confirm
--     on any database built from migrations 000-051.
--   * The RPC also UPDATEd xpay_webhooks_log.updated_at — a column that
--     never existed (041 added status/rejection_reason/payload_hash/attempt/
--     created_at only), so even the historic path would have errored.
--   * The RPC never settled the corresponding `payments` row, leaving it
--     PENDING forever after the order was marked PAID.
--
-- This migration:
--   1. Rewrites settle_order_payment as self-contained: locks the ORDER row
--      only, idempotency via orders.payment_status, amount verified against
--      the authoritative order total, and flips the matching payment row
--      to PAID in the same transaction.
--   2. Drops xpay_webhooks_log outright (the sole writer and reader were
--      the deleted XPay service and the old RPC above; no API code or other
--      migration references it — verified across apps/api/src and 000-051).
--
-- The grants on settle_order_payment are preserved (service_role only, per
-- the 049 hardening — 049 revoked it from PUBLIC/anon/authenticated).
-- ==============================================================================

CREATE OR REPLACE FUNCTION settle_order_payment(
  p_order_id TEXT,
  p_transaction_id TEXT,
  p_amount_pkr NUMERIC,
  p_payload_hash TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Single axis of concurrency: the order row itself. No external event
  -- table is consulted — the API is the only caller (service_role) and it
  -- invokes this after verifying the provider's IPN/webhook signature.
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'order-not-found');
  END IF;

  -- Idempotency: an already-paid order is a no-op (replayed IPNs, buyer
  -- return-page polls, and reconciliation sweeps all converge here).
  IF v_order.payment_status = 'PAID' THEN
    RETURN jsonb_build_object('action', 'already-paid');
  END IF;

  -- Amount must match the authoritative order total (paisa tolerance).
  IF ABS(p_amount_pkr - v_order.total_amount_pkr) > 0.005 THEN
    RETURN jsonb_build_object(
      'action', 'amount-mismatch',
      'expected', v_order.total_amount_pkr,
      'received', p_amount_pkr
    );
  END IF;

  -- Settle the order (row already locked).
  UPDATE orders SET
    payment_status = 'PAID',
    global_status = 'CONFIRMED',
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Settle the payment intent row in the same transaction. gateway_reference
  -- is preferred (the APG AuthToken / provider transaction id); fall back to
  -- the newest pending payment for the order so a gateway_reference set at
  -- initiation time is never silently duplicated.
  UPDATE payments SET
    status = 'PAID',
    gateway_response = COALESCE(
      gateway_response, '{}'::jsonb
    ) || jsonb_build_object(
      'settled_transaction_id', p_transaction_id,
      'settled_at', NOW()
    ),
    updated_at = NOW()
  WHERE id = (
    SELECT id FROM payments
    WHERE order_id = p_order_id
      AND (gateway_reference = p_transaction_id OR status = 'PENDING')
    ORDER BY (gateway_reference = p_transaction_id) DESC, created_at DESC
    LIMIT 1
  );

  RETURN jsonb_build_object('action', 'settled');
END;
$$;

-- Preserve the 049 security posture: service_role only.
REVOKE ALL ON FUNCTION public.settle_order_payment(TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_order_payment(TEXT, TEXT, NUMERIC, TEXT) TO service_role;

-- Drop the XPay webhook ledger. Policies on it (001/016) are dropped
-- automatically with the table.
DROP TABLE IF EXISTS public.xpay_webhooks_log CASCADE;

INSERT INTO schema_migrations (version, applied_at)
VALUES ('052_remove_xpay_fix_settlement', NOW())
ON CONFLICT (version) DO NOTHING;
