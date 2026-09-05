-- ============================================================================
-- P0-PHASE3-T1: Atomic Payout Settlement RPC
-- Replaces non-atomic NodeJS inserts with a strict PL/pgSQL transaction.
-- Locks the payout row, updates status, and inserts balanced ledger entries.
-- ============================================================================

CREATE OR REPLACE FUNCTION settle_payout_atomic(
  p_payout_id UUID,
  p_provider_transfer_id TEXT,
  p_provider_payload_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout RECORD;
  v_net_payout INTEGER;
  v_commission INTEGER;
  v_order_ref TEXT;
BEGIN
  -- Lock the payout row
  SELECT * INTO v_payout
  FROM payouts
  WHERE id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout % not found', p_payout_id;
  END IF;

  -- Idempotency check: if already settled, just return success
  IF v_payout.status = 'SETTLED' THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'payout_id', p_payout_id
    );
  END IF;

  -- Ensure valid state transition
  IF v_payout.status NOT IN ('SCHEDULED', 'PROCESSING') THEN
    RAISE EXCEPTION 'Cannot settle payout in % state', v_payout.status;
  END IF;

  v_net_payout := COALESCE(v_payout.amount_pkr, 0) - COALESCE(v_payout.commission_pkr, 0);
  v_commission := COALESCE(v_payout.commission_pkr, 0);
  v_order_ref := COALESCE(v_payout.order_id::TEXT, v_payout.id::TEXT);

  -- 1. Insert double-entry ledger rows
  INSERT INTO financial_ledger (
    store_id, transaction_type, amount_pkr, entry_type, reference_id, description
  ) VALUES (
    v_payout.store_id, 'PAYOUT_SETTLED', -v_net_payout, 'DEBIT', p_payout_id::TEXT,
    'Seller payout settled for Order ' || v_order_ref
  ), (
    v_payout.store_id, 'COMMISSION_EARNED', v_commission, 'CREDIT', p_payout_id::TEXT,
    'Platform commission for Order ' || v_order_ref
  );

  -- 2. Update payout status
  UPDATE payouts
  SET status = 'SETTLED',
      provider_transfer_id = COALESCE(p_provider_transfer_id, provider_transfer_id),
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_payout_id;

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', p_payout_id,
    'net_payout_pkr', v_net_payout,
    'commission_pkr', v_commission
  );
END;
$$;

INSERT INTO schema_migrations (version, applied_at) VALUES ('023_payout_settlement_atomic_rpc', NOW()) ON CONFLICT DO NOTHING;
