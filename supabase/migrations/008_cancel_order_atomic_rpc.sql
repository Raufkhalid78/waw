-- ============================================================================
-- P0-2 + P0-5 [HARDENED]: Atomic cancel order RPC with snapshot release
-- Improvements over previous version:
--   1. Releases inventory_snapshots.reserved on cancellation (not just ledger).
--   2. Uses GREATEST(0, reserved - qty) to prevent negative reserved counts.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION cancel_order(
  p_order_id UUID,
  p_reason   TEXT DEFAULT 'Customer cancelled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order           RECORD;
  v_cancellable     TEXT[] := ARRAY['PENDING','PENDING_PAYMENT','CONFIRMED','PROCESSING'];
  v_item            RECORD;
  v_store_order     RECORD;
  v_released_count  INTEGER := 0;
BEGIN
  -- Lock order row to prevent concurrent modifications
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Verify caller owns the order (or is service_role / admin)
  IF v_order.buyer_id IS NOT NULL AND v_order.buyer_id != auth.uid()::TEXT THEN
    RAISE EXCEPTION 'Unauthorized to cancel this order';
  END IF;

  IF v_order.global_status <> ALL(v_cancellable) THEN
    RAISE EXCEPTION 'Order cannot be cancelled in % status', v_order.global_status;
  END IF;

  -- Update parent order status
  UPDATE orders
  SET global_status  = 'CANCELLED',
      payment_status = CASE
        WHEN payment_status = 'PAID' THEN 'REFUNDED'
        ELSE payment_status
      END,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Update child store orders
  UPDATE store_orders
  SET status = 'CANCELLED', updated_at = NOW()
  WHERE order_id = p_order_id;

  -- Release reserved inventory: both ledger and snapshot
  FOR v_store_order IN
    SELECT so.id AS store_order_id, so.store_id
    FROM store_orders so
    WHERE so.order_id = p_order_id
  LOOP
    FOR v_item IN
      SELECT oi.offer_variant_id, oi.quantity
      FROM order_items oi
      WHERE oi.store_order_id = v_store_order.store_order_id
        AND oi.offer_variant_id IS NOT NULL
    LOOP
      -- Audit ledger entry (positive quantity = restored stock)
      INSERT INTO inventory_ledger (
        offer_variant_id, store_id, transaction_type, quantity, reference_id, notes
      ) VALUES (
        v_item.offer_variant_id, v_store_order.store_id::TEXT, 'RELEASE', v_item.quantity,
        p_order_id::TEXT, 'Order cancelled: ' || p_reason
      );

      -- Release from snapshot (authoritative balance)
      UPDATE inventory_snapshots
      SET reserved   = GREATEST(0, reserved - v_item.quantity),
          version    = version + 1,
          updated_at = NOW()
      WHERE offer_variant_id = v_item.offer_variant_id;

      v_released_count := v_released_count + 1;
    END LOOP;
  END LOOP;

  -- Outbox event for notification
  INSERT INTO outbox_events (event_type, payload, status, created_at)
  VALUES (
    'ORDER_CANCELLED',
    jsonb_build_object(
      'order_id',        p_order_id,
      'order_number',    v_order.order_number,
      'buyer_phone',     v_order.buyer_phone,
      'reason',          p_reason,
      'items_released',  v_released_count
    ),
    'PENDING',
    NOW()
  );

  RETURN jsonb_build_object(
    'success',              true,
    'orderId',              p_order_id,
    'status',               'CANCELLED',
    'inventory_released',   v_released_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_order(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION cancel_order(UUID, TEXT) FROM anon;

COMMIT;
