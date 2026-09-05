-- ============================================================================
-- P0-PHASE6-T1: Atomic Financial Reversals
-- Ensures refunds, chargebacks, and commission reversals are processed atomically.
-- ============================================================================

CREATE OR REPLACE FUNCTION reverse_order_atomic(
  p_order_id UUID,
  p_reason TEXT,
  p_reversal_type TEXT -- 'REFUND', 'CHARGEBACK'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS \$\$
DECLARE
  v_order RECORD;
  v_store_order RECORD;
  v_net_amount INTEGER;
  v_commission INTEGER;
  v_total_refund INTEGER := 0;
BEGIN
  -- Lock the order row
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_order.status IN ('REFUNDED', 'CHARGEBACK') THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'order_id', p_order_id
    );
  END IF;

  -- Process all store sub-orders
  FOR v_store_order IN 
    SELECT * FROM store_orders WHERE order_id = p_order_id FOR UPDATE
  LOOP
    v_net_amount := v_store_order.subtotal_pkr - v_store_order.commission_pkr;
    v_commission := v_store_order.commission_pkr;
    v_total_refund := v_total_refund + v_store_order.subtotal_pkr;

    -- Create double-entry financial ledger entries
    INSERT INTO financial_ledger (
      store_id, transaction_type, amount_pkr, entry_type, reference_id, description
    ) VALUES (
      v_store_order.store_id, p_reversal_type, v_net_amount, 'DEBIT', p_order_id::TEXT,
      p_reversal_type || ' for Order ' || p_order_id::TEXT || ' (' || p_reason || ')'
    ), (
      v_store_order.store_id, 'COMMISSION_REVERSAL', -v_commission, 'DEBIT', p_order_id::TEXT,
      'Platform commission reversal for Order ' || p_order_id::TEXT
    );

    -- Hold or reverse payouts
    UPDATE payouts
    SET status = 'HELD', updated_at = NOW()
    WHERE store_order_id = v_store_order.id AND status IN ('SCHEDULED', 'PROCESSING');
  END LOOP;

  -- Update order statuses
  UPDATE orders SET status = p_reversal_type, updated_at = NOW() WHERE id = p_order_id;
  UPDATE store_orders SET order_status = p_reversal_type, updated_at = NOW() WHERE order_id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'total_refund_pkr', v_total_refund
  );
END;
\$\$;

INSERT INTO schema_migrations (version, applied_at) VALUES ('026_financial_reversals_atomic', NOW()) ON CONFLICT DO NOTHING;
