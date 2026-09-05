-- ============================================================================
-- P0-PHASE0-T5: Checkout Session Expiry RPC
-- Releases inventory_snapshots.reserved for orders that have been in
-- PENDING_PAYMENT status for more than 15 minutes without payment.
-- Called by inventory-cleanup.cron.ts every 2 minutes.
-- Uses SKIP LOCKED so multiple workers never double-process the same order.
-- ============================================================================

CREATE OR REPLACE FUNCTION release_expired_checkout_reservations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order          RECORD;
  v_store_order    RECORD;
  v_item           RECORD;
  v_expired_count  INTEGER := 0;
  v_items_released INTEGER := 0;
BEGIN
  -- Process expired PENDING_PAYMENT orders.
  -- FOR UPDATE SKIP LOCKED ensures concurrent workers never double-process.
  FOR v_order IN
    SELECT id, order_number, buyer_phone
    FROM orders
    WHERE global_status = 'PENDING_PAYMENT'
      AND created_at < NOW() - INTERVAL '15 minutes'
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Cancel parent order
    UPDATE orders
    SET global_status = 'CANCELLED',
        updated_at    = NOW()
    WHERE id = v_order.id;

    -- Cancel store orders
    UPDATE store_orders
    SET status     = 'CANCELLED',
        updated_at = NOW()
    WHERE order_id = v_order.id;

    -- Release inventory from snapshots
    FOR v_store_order IN
      SELECT so.id AS store_order_id, so.store_id
      FROM store_orders so
      WHERE so.order_id = v_order.id
    LOOP
      FOR v_item IN
        SELECT oi.offer_variant_id, oi.quantity
        FROM order_items oi
        WHERE oi.store_order_id = v_store_order.store_order_id
          AND oi.offer_variant_id IS NOT NULL
      LOOP
        -- Release from snapshot
        UPDATE inventory_snapshots
        SET reserved   = GREATEST(0, reserved - v_item.quantity),
            version    = version + 1,
            updated_at = NOW()
        WHERE offer_variant_id = v_item.offer_variant_id;

        -- Audit ledger entry
        INSERT INTO inventory_ledger (
          offer_variant_id, store_id, transaction_type, quantity, reference_id, notes
        ) VALUES (
          v_item.offer_variant_id, v_store_order.store_id::TEXT,
          'RELEASE', v_item.quantity, v_order.id::TEXT,
          'Checkout session expired: 15-minute payment timeout'
        );

        v_items_released := v_items_released + 1;
      END LOOP;
    END LOOP;

    -- Outbox event for notification
    INSERT INTO outbox_events (event_type, payload, status, created_at)
    VALUES (
      'ORDER_CANCELLED',
      jsonb_build_object(
        'order_id',       v_order.id,
        'order_number',   v_order.order_number,
        'buyer_phone',    v_order.buyer_phone,
        'reason',         'Checkout session expired after 15 minutes'
      ),
      'PENDING',
      NOW()
    );

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'expired_orders',    v_expired_count,
    'items_released',    v_items_released,
    'ran_at',            NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION release_expired_checkout_reservations() TO service_role;

-- Record migration
INSERT INTO schema_migrations (version, applied_at)
VALUES ('021_checkout_session_expiry_rpc', NOW())
ON CONFLICT (version) DO NOTHING;
