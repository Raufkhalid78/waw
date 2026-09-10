-- ============================================================================
-- Migration 035: Checkout discounts + config-driven money values
--
-- Fixes overcharge bug: checkout_transaction recomputed pricing with hardcoded
-- values (shipping 200, free >= 5000, COD 100, GST 0.18) and NEVER applied the
-- coupon/loyalty discounts from the server-signed quote JWT, so users quoted a
-- discounted total were charged full price.
--
-- Changes (all existing parameters preserved in the same order; new params
-- APPENDED with defaults so existing callers keep working):
--   1. New trailing params: p_coupon_discount_pkr, p_loyalty_discount_pkr,
--      p_loyalty_points_used (all DEFAULT 0).
--   2. Hardcoded money values replaced with reads from marketplace_settings
--      (key/value JSONB) with the previous hardcoded values as fallbacks.
--   3. Total computation subtracts the discounts; shipping is waived when the
--      POST-discount subtotal meets the free-delivery threshold; GST is
--      computed on the post-discount taxable amount (subtotal - discounts
--      + shipping + cod), matching quote.service.ts.
--   4. Discounts clamped so (subtotal - discounts) can never go negative.
--
-- NOTE: p_coupon_code was already accepted by the RPC but never used in its
-- pricing logic (no internal coupon validation exists), so the server-signed
-- p_coupon_discount_pkr is authoritative — no double-apply risk.
-- ============================================================================

-- Safety: orders.discount_pkr was added conditionally in migration 012
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_pkr NUMERIC(12,2) DEFAULT 0;

CREATE OR REPLACE FUNCTION checkout_transaction(
  p_buyer_id        TEXT,
  p_buyer_name      TEXT,
  p_buyer_phone     TEXT,
  p_shipping_address TEXT,
  p_shipping_city   TEXT,
  p_payment_method  TEXT,
  p_items           JSONB,
  p_coupon_code     TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_coupon_discount_pkr  NUMERIC DEFAULT 0,
  p_loyalty_discount_pkr NUMERIC DEFAULT 0,
  p_loyalty_points_used  INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id        TEXT;
  v_order_number    TEXT;
  v_total_pkr       NUMERIC := 0;
  v_subtotal_pkr    NUMERIC := 0;
  v_shipping_pkr    NUMERIC := 0;
  v_cod_fee_pkr     NUMERIC := 0;
  v_gst_pkr         NUMERIC := 0;
  v_item            JSONB;
  v_offer           RECORD;
  v_variant         RECORD;
  v_snapshot        RECORD;
  v_store_id        TEXT;
  v_line_total      NUMERIC;
  v_store_orders    JSONB := '[]'::JSONB;
  v_existing_order  RECORD;
  v_variant_id      TEXT;
  v_item_quantity   INTEGER;
  -- Sorted items array for deterministic lock ordering
  v_sorted_items    JSONB;
  -- ── Discounts from the server-signed checkout quote (authoritative) ──
  v_coupon_discount_pkr   NUMERIC := 0;
  v_loyalty_discount_pkr  NUMERIC := 0;
  v_total_discount_pkr    NUMERIC := 0;
  -- ── Config-driven values from marketplace_settings (JSONB scalars),
  --    falling back to the previously hardcoded defaults ──
  v_free_delivery_threshold NUMERIC := COALESCE(
    (SELECT NULLIF(value #>> '{}', '')::NUMERIC FROM marketplace_settings WHERE key = 'free_delivery_threshold_pkr'),
    5000);
  v_default_shipping_fee NUMERIC := COALESCE(
    (SELECT NULLIF(value #>> '{}', '')::NUMERIC FROM marketplace_settings WHERE key = 'default_shipping_fee_pkr'),
    200);
  v_cod_handling_fee NUMERIC := COALESCE(
    (SELECT NULLIF(value #>> '{}', '')::NUMERIC FROM marketplace_settings WHERE key = 'cod_handling_fee_pkr'),
    100);
  v_gst_rate_pct NUMERIC := COALESCE(
    (SELECT NULLIF(value #>> '{}', '')::NUMERIC FROM marketplace_settings WHERE key = 'gst_rate_percentage'),
    18);
BEGIN
  -- -- 1. Caller identity --
  IF p_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Guest checkout not available here. Use guest_checkout_transaction.';
  END IF;

  IF p_buyer_id != auth.uid()::TEXT THEN
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
      v_variant_id := v_item->>'variant_id';
    ELSE
      v_variant_id := v_item->>'offer_variant_id';
    END IF;

    v_item_quantity := (v_item->>'quantity')::INT;

    IF v_item_quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be positive';
    END IF;

    -- Verify offer is active (server-authoritative)
    -- Resolve the offer THROUGH the variant (API sends offer_variants.id)
    SELECT so.*, cp.title AS product_title, ov.price_adjustment_pkr AS variant_adjustment_pkr
    INTO v_offer
    FROM offer_variants ov
    JOIN seller_offers so ON so.id = ov.offer_id
    JOIN catalog_products cp ON cp.id = so.catalog_product_id
    WHERE ov.id = v_item->>'offer_variant_id'
      AND so.status = 'ACTIVE';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Offer not found or inactive: %', v_item->>'offer_variant_id';
    END IF;

    -- Ensure snapshot row exists (INSERT ... ON CONFLICT DO NOTHING)
    PERFORM ensure_inventory_snapshot(v_variant_id, v_offer.store_id);

    -- Lock the snapshot row deterministically
    SELECT * INTO v_snapshot
    FROM inventory_snapshots
    WHERE offer_variant_id = v_variant_id
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
    WHERE offer_variant_id = v_variant_id;
  END LOOP;

  -- -- 5. Compute pricing --
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sorted_items)
  LOOP
    -- Resolve the offer THROUGH the variant (API sends offer_variants.id)
    SELECT so.*, cp.title AS product_title, ov.price_adjustment_pkr AS variant_adjustment_pkr
    INTO v_offer
    FROM offer_variants ov
    JOIN seller_offers so ON so.id = ov.offer_id
    JOIN catalog_products cp ON cp.id = so.catalog_product_id
    WHERE ov.id = v_item->>'offer_variant_id';

    IF v_item ? 'variant_id' AND (v_item->>'variant_id') IS NOT NULL THEN
      SELECT * INTO v_variant
      FROM offer_variants
      WHERE id = v_item->>'variant_id'
        AND offer_id = v_offer.id;

      v_line_total := (v_offer.price_pkr + COALESCE(v_variant.price_adjustment_pkr, 0))
                       * (v_item->>'quantity')::INT;
    ELSE
      -- The variant adjustment was already resolved via the offer lookup
      v_line_total := (v_offer.price_pkr + COALESCE(v_offer.variant_adjustment_pkr, 0))
                       * (v_item->>'quantity')::INT;
    END IF;

    v_subtotal_pkr := v_subtotal_pkr + v_line_total;
  END LOOP;

  -- -- 5. Calculate Order-level totals --
  -- Apply the discounts from the server-signed quote (authoritative amounts).
  v_coupon_discount_pkr  := GREATEST(COALESCE(p_coupon_discount_pkr, 0), 0);
  v_loyalty_discount_pkr := GREATEST(COALESCE(p_loyalty_discount_pkr, 0), 0);
  -- Clamp so the post-discount subtotal can never go negative
  v_coupon_discount_pkr  := LEAST(v_coupon_discount_pkr, v_subtotal_pkr);
  v_loyalty_discount_pkr := LEAST(v_loyalty_discount_pkr, GREATEST(v_subtotal_pkr - v_coupon_discount_pkr, 0));
  v_total_discount_pkr   := v_coupon_discount_pkr + v_loyalty_discount_pkr;

  -- Shipping is waived when the POST-discount subtotal meets the configured threshold
  IF (v_subtotal_pkr - v_total_discount_pkr) >= v_free_delivery_threshold THEN
    v_shipping_pkr := 0;
  ELSE
    v_shipping_pkr := v_default_shipping_fee;
  END IF;

  IF p_payment_method = 'COD' THEN v_cod_fee_pkr := v_cod_handling_fee; ELSE v_cod_fee_pkr := 0; END IF;

  -- Calculate GST on the POST-discount taxable amount (Subtotal - Discounts + Shipping + COD)
  -- so the user is not taxed on the discounted amount.
  v_gst_pkr := ROUND(((v_subtotal_pkr - v_total_discount_pkr) + v_shipping_pkr + v_cod_fee_pkr)
                      * (v_gst_rate_pct / 100.0));

  v_total_pkr := (v_subtotal_pkr - v_total_discount_pkr) + v_shipping_pkr + v_cod_fee_pkr + v_gst_pkr;

  -- -- 6. Create order --
  v_order_id     := uuid_generate_v4()::TEXT;
  v_order_number := 'WAW-' || TO_CHAR(NOW(), 'YYMMDD') || '-'
                    || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');

  INSERT INTO orders (
    id, order_number, buyer_id, buyer_name, buyer_phone,
    shipping_address, shipping_city, shipping_province,
    global_status, payment_status, payment_method,
    total_amount_pkr, subtotal_pkr, shipping_fee_pkr, cod_fee_pkr, gst_pkr,
    discount_pkr,
    idempotency_key, created_at, updated_at
  ) VALUES (
    v_order_id, v_order_number, p_buyer_id, p_buyer_name, p_buyer_phone,
    p_shipping_address, p_shipping_city, '',
    'PENDING_PAYMENT', 'PENDING', p_payment_method,
    v_total_pkr, v_subtotal_pkr, v_shipping_pkr, v_cod_fee_pkr, v_gst_pkr,
    v_total_discount_pkr,
    p_idempotency_key, NOW(), NOW()
  );

  -- -- 7. Create inventory_ledger RESERVE entries + store_orders + order_items
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sorted_items)
  LOOP
    -- Resolve the offer THROUGH the variant (API sends offer_variants.id)
    SELECT so.*, cp.title AS product_title, so.store_id,
           ov.price_adjustment_pkr AS variant_adjustment_pkr
    INTO v_offer
    FROM offer_variants ov
    JOIN seller_offers so ON so.id = ov.offer_id
    JOIN catalog_products cp ON cp.id = so.catalog_product_id
    WHERE ov.id = v_item->>'offer_variant_id';

    IF v_item ? 'variant_id' AND (v_item->>'variant_id') IS NOT NULL THEN
      SELECT * INTO v_variant
      FROM offer_variants WHERE id = v_item->>'variant_id';
      v_line_total   := (v_offer.price_pkr + COALESCE(v_variant.price_adjustment_pkr, 0))
                         * (v_item->>'quantity')::INT;
      v_variant_id   := v_item->>'variant_id';
    ELSE
      v_line_total   := (v_offer.price_pkr + COALESCE(v_offer.variant_adjustment_pkr, 0))
                         * (v_item->>'quantity')::INT;
      v_variant_id   := v_item->>'offer_variant_id';
    END IF;

    v_item_quantity := (v_item->>'quantity')::INT;

    -- Write audit ledger entry
    INSERT INTO inventory_ledger (
      offer_variant_id, store_id, transaction_type, quantity, reference_id, notes
    ) VALUES (
      v_variant_id, v_offer.store_id, 'RESERVE', -v_item_quantity,
      v_order_id, 'Checkout reservation for Order ' || v_order_number
    );

    -- Create store_order if not yet created for this store
    IF NOT (v_store_orders @> jsonb_build_array(jsonb_build_object('store_id', v_offer.store_id))) THEN
      DECLARE v_store_order_id TEXT := uuid_generate_v4()::TEXT;
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

    DECLARE v_so_id TEXT;
    BEGIN
      SELECT elem->>'store_order_id' INTO v_so_id
      FROM jsonb_array_elements(v_store_orders) AS elem
      WHERE elem->>'store_id' = v_offer.store_id;

      INSERT INTO order_items (
        id, order_id, store_order_id, offer_variant_id, product_id,
        quantity, unit_price_pkr, total_price_pkr, created_at
      ) VALUES (
        uuid_generate_v4()::TEXT, v_order_id, v_so_id,
        v_variant_id, v_offer.catalog_product_id,
        v_item_quantity,
        v_offer.price_pkr + COALESCE(v_offer.variant_adjustment_pkr, 0),
        v_line_total, NOW()
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
    uuid_generate_v4()::TEXT, v_order_id, p_payment_method, 'PENDING', v_total_pkr, NOW(), NOW()
  );

  RETURN jsonb_build_object(
    'success',          true,
    'order_id',         v_order_id,
    'order_number',     v_order_number,
    'total_amount_pkr', v_total_pkr,
    'discount_pkr',     v_total_discount_pkr
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- The signature changed (new trailing params), so CREATE OR REPLACE above
-- created a NEW 12-arg overload. Drop the legacy 9-arg function so every
-- caller (including those passing only the original 9 args, which now resolve
-- via the new defaults) routes to the discount-aware version.
DROP FUNCTION IF EXISTS checkout_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT);

GRANT EXECUTE ON FUNCTION checkout_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, INTEGER) TO authenticated;
REVOKE EXECUTE ON FUNCTION checkout_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, INTEGER) FROM anon;

INSERT INTO schema_migrations (version, applied_at) VALUES ('035_checkout_discount_and_config', NOW()) ON CONFLICT DO NOTHING;
