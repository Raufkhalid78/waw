-- ============================================================================
-- P0-2 + P0-3 [HARDENED]: Atomic checkout transaction RPC with snapshot-based
-- inventory reservation.
--
-- Key improvements over previous version:
--   1. Locks inventory_snapshots row FOR UPDATE (not aggregate ledger rows).
--      A snapshot row ALWAYS exists (created by ensure_inventory_snapshot before
--      the lock), so zero-stock variants still get a row-level lock.
--   2. Items sorted by offer_variant_id UUID before locking to prevent deadlocks
--      when two concurrent carts lock the same variants in opposite order.
--   3. Guest checkout rejected explicitly -- use guest_checkout_transaction RPC.
--   4. Idempotency checked BEFORE any inventory lock.
-- ============================================================================

CREATE OR REPLACE FUNCTION checkout_transaction(
  p_buyer_id        UUID,
  p_buyer_name      TEXT,
  p_buyer_phone     TEXT,
  p_shipping_address TEXT,
  p_shipping_city   TEXT,
  p_payment_method  TEXT,
  p_items           JSONB,
  p_coupon_code     TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id        UUID;
  v_order_number    TEXT;
  v_total_pkr       NUMERIC := 0;
  v_subtotal_pkr    NUMERIC := 0;
  v_shipping_pkr    NUMERIC := 0;
  v_cod_fee_pkr     NUMERIC := 0;
  v_item            JSONB;
  v_offer           RECORD;
  v_variant         RECORD;
  v_snapshot        RECORD;
  v_store_id        UUID;
  v_line_total      NUMERIC;
  v_store_orders    JSONB := '[]'::JSONB;
  v_existing_order  RECORD;
  v_variant_id      UUID;
  v_item_quantity   INTEGER;
  -- Sorted items array for deterministic lock ordering
  v_sorted_items    JSONB;
BEGIN
  -- -- 1. Caller identity --
  IF p_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Guest checkout not available here. Use guest_checkout_transaction.';
  END IF;

  IF p_buyer_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: buyer identity mismatch';
  END IF;

  -- -- 2. Idempotency check (before any lock) --
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, order_number, total_amount_pkr
    INTO v_existing_order
    FROM orders
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success',           true,
        'order_id',          v_existing_order.id,
        'order_number',      v_existing_order.order_number,
        'total_amount_pkr',  v_existing_order.total_amount_pkr,
        'idempotent_replay', true
      );
    END IF;
  END IF;

  -- -- 3. Sort items by offer_variant_id for deterministic lock ordering --
  -- Prevents deadlocks when concurrent carts contain the same variants
  -- in different sequence.
  SELECT jsonb_agg(elem ORDER BY (elem->>'offer_variant_id') ASC)
  INTO v_sorted_items
  FROM jsonb_array_elements(p_items) AS elem;

  -- -- 4. Ensure snapshot rows exist + lock them in sorted order --
  -- Lock phase: iterate sorted items, ensure snapshot row, lock it, check stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sorted_items)
  LOOP
    -- Resolve variant_id
    IF v_item ? 'variant_id' AND (v_item->>'variant_id') IS NOT NULL THEN
      v_variant_id := (v_item->>'variant_id')::UUID;
    ELSE
      v_variant_id := (v_item->>'offer_variant_id')::UUID;
    END IF;

    v_item_quantity := (v_item->>'quantity')::INT;

    IF v_item_quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be positive';
    END IF;

    -- Verify offer is active (server-authoritative)
    SELECT so.*, cp.title AS product_title
    INTO v_offer
    FROM seller_offers so
    JOIN catalog_products cp ON cp.id = so.catalog_product_id
    WHERE so.id = (v_item->>'offer_variant_id')::UUID
      AND so.status = 'ACTIVE';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Offer not found or inactive: %', v_item->>'offer_variant_id';
    END IF;

    -- Ensure snapshot row exists (INSERT ... ON CONFLICT DO NOTHING)
    PERFORM ensure_inventory_snapshot(v_variant_id::TEXT, v_offer.store_id::TEXT);

    -- Lock the snapshot row deterministically
    SELECT * INTO v_snapshot
    FROM inventory_snapshots
    WHERE offer_variant_id = v_variant_id::TEXT
    FOR UPDATE;

    -- Check stock against the locked snapshot
    IF v_snapshot.available < v_item_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for item %: available=%, requested=%',
        v_item->>'offer_variant_id', v_snapshot.available, v_item_quantity;
    END IF;

    -- Reserve in snapshot immediately
    UPDATE inventory_snapshots
    SET reserved   = reserved + v_item_quantity,
        version    = version + 1,
        updated_at = NOW()
    WHERE offer_variant_id = v_variant_id::TEXT;
  END LOOP;

  -- -- 5. Compute pricing --
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sorted_items)
  LOOP
    SELECT so.*, cp.title AS product_title
    INTO v_offer
    FROM seller_offers so
    JOIN catalog_products cp ON cp.id = so.catalog_product_id
    WHERE so.id = (v_item->>'offer_variant_id')::UUID;

    IF v_item ? 'variant_id' AND (v_item->>'variant_id') IS NOT NULL THEN
      SELECT * INTO v_variant
      FROM offer_variants
      WHERE id = (v_item->>'variant_id')::UUID
        AND offer_id = v_offer.id;

      v_line_total := (v_offer.price_pkr + COALESCE(v_variant.price_adjustment_pkr, 0))
                       * (v_item->>'quantity')::INT;
    ELSE
      v_line_total := v_offer.price_pkr * (v_item->>'quantity')::INT;
    END IF;

    v_subtotal_pkr := v_subtotal_pkr + v_line_total;
  END LOOP;

  IF v_subtotal_pkr >= 5000 THEN v_shipping_pkr := 0; ELSE v_shipping_pkr := 200; END IF;
  IF p_payment_method = 'COD' THEN v_cod_fee_pkr := 100; ELSE v_cod_fee_pkr := 0; END IF;
  v_total_pkr := v_subtotal_pkr + v_shipping_pkr + v_cod_fee_pkr;

  -- -- 6. Create order --
  v_order_id     := gen_random_uuid();
  v_order_number := 'WAW-' || TO_CHAR(NOW(), 'YYMMDD') || '-'
                    || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');

  INSERT INTO orders (
    id, order_number, buyer_id, buyer_name, buyer_phone,
    shipping_address, shipping_city, shipping_province,
    global_status, payment_status, payment_method,
    total_amount_pkr, subtotal_pkr, shipping_fee_pkr, cod_fee_pkr,
    idempotency_key, created_at, updated_at
  ) VALUES (
    v_order_id, v_order_number, p_buyer_id, p_buyer_name, p_buyer_phone,
    p_shipping_address, p_shipping_city, '',
    'PENDING_PAYMENT', 'PENDING', p_payment_method,
    v_total_pkr, v_subtotal_pkr, v_shipping_pkr, v_cod_fee_pkr,
    p_idempotency_key, NOW(), NOW()
  );

  -- -- 7. Create inventory_ledger RESERVE entries + store_orders + order_items
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sorted_items)
  LOOP
    SELECT so.*, cp.title AS product_title, so.store_id
    INTO v_offer
    FROM seller_offers so
    JOIN catalog_products cp ON cp.id = so.catalog_product_id
    WHERE so.id = (v_item->>'offer_variant_id')::UUID;

    IF v_item ? 'variant_id' AND (v_item->>'variant_id') IS NOT NULL THEN
      SELECT * INTO v_variant
      FROM offer_variants WHERE id = (v_item->>'variant_id')::UUID;
      v_line_total   := (v_offer.price_pkr + COALESCE(v_variant.price_adjustment_pkr, 0))
                         * (v_item->>'quantity')::INT;
      v_variant_id   := (v_item->>'variant_id')::UUID;
    ELSE
      v_line_total   := v_offer.price_pkr * (v_item->>'quantity')::INT;
      v_variant_id   := (v_item->>'offer_variant_id')::UUID;
    END IF;

    v_item_quantity := (v_item->>'quantity')::INT;

    -- Write audit ledger entry
    INSERT INTO inventory_ledger (
      offer_variant_id, store_id, transaction_type, quantity, reference_id, notes
    ) VALUES (
      v_variant_id::TEXT, v_offer.store_id::TEXT, 'RESERVE', -v_item_quantity,
      v_order_id::TEXT, 'Checkout reservation for Order ' || v_order_number
    );

    -- Create store_order if not yet created for this store
    IF NOT (v_store_orders @> jsonb_build_array(jsonb_build_object('store_id', v_offer.store_id))) THEN
      DECLARE v_store_order_id UUID := gen_random_uuid();
      BEGIN
        INSERT INTO store_orders (
          id, order_id, store_id, status, subtotal_pkr, commission_pkr, created_at, updated_at
        ) VALUES (
          v_store_order_id, v_order_id, v_offer.store_id, 'PENDING', 0, 0, NOW(), NOW()
        );
        v_store_orders := v_store_orders || jsonb_build_array(
          jsonb_build_object('store_id', v_offer.store_id, 'store_order_id', v_store_order_id)
        );
      END;
    END IF;

    DECLARE v_so_id UUID;
    BEGIN
      SELECT (elem->>'store_order_id')::UUID INTO v_so_id
      FROM jsonb_array_elements(v_store_orders) AS elem
      WHERE (elem->>'store_id')::UUID = v_offer.store_id;

      INSERT INTO order_items (
        id, order_id, store_order_id, offer_variant_id, product_id,
        quantity, unit_price_pkr, total_price_pkr, created_at
      ) VALUES (
        gen_random_uuid(), v_order_id, v_so_id,
        (v_item->>'offer_variant_id'), v_offer.catalog_product_id,
        v_item_quantity, v_offer.price_pkr, v_line_total, NOW()
      );

      UPDATE store_orders
      SET subtotal_pkr   = subtotal_pkr + v_line_total,
          commission_pkr = commission_pkr + ROUND(v_line_total * 0.10, 2)
      WHERE id = v_so_id;
    END;
  END LOOP;

  -- -- 8. Payment intent --
  INSERT INTO payments (
    id, order_id, payment_method, status, amount_pkr, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_order_id, p_payment_method, 'PENDING', v_total_pkr, NOW(), NOW()
  );

  RETURN jsonb_build_object(
    'success',          true,
    'order_id',         v_order_id,
    'order_number',     v_order_number,
    'total_amount_pkr', v_total_pkr
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION checkout_transaction(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION checkout_transaction(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) FROM anon;
