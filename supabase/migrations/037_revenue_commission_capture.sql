-- ============================================================================
-- Migration 037: Proper revenue capture
--
-- 1. Per-category commission: categories.commission_percentage (nullable,
--    NULL = inherit platform default). Seeded with marketplace-standard
--    rates. Subcategories inherit the nearest ancestor's rate.
-- 2. Per-store negotiated override: stores.commission_rate_percentage is now
--    nullable — NULL means "no override, use category/default".
-- 3. Subscription benefit: active seller subscription's commission_reduction
--    is subtracted from the resolved rate (clamped >= 0).
-- 4. FIRST_PARTY (Waw retail) stores earn 0% commission.
-- 5. Both checkout RPCs now resolve commission per item via
--    waw_commission_rate() instead of the hardcoded 0.10, and write
--    store_orders.seller_payout_pkr.
-- 6. guest_checkout_transaction: fees/GST now config-driven (matching the
--    authenticated RPC — guests previously got hardcoded 5000/200/100/0.18)
--    and accepts coupon/loyalty discounts from the signed quote.
-- ============================================================================

-- ── 1. Category commission rates ───────────────────────────────────────────
ALTER TABLE categories ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5,2);

-- Marketplace-standard rates (top-level categories; subcategories inherit
-- via the nearest-ancestor walk in waw_commission_rate).
UPDATE categories SET commission_percentage = 3.00  WHERE slug = 'mobiles-tech';
UPDATE categories SET commission_percentage = 15.00 WHERE slug = 'fashion';
UPDATE categories SET commission_percentage = 12.00 WHERE slug = 'leather-craft';
UPDATE categories SET commission_percentage = 10.00 WHERE slug = 'beauty-fragrance';
UPDATE categories SET commission_percentage = 8.00  WHERE slug = 'sialkot-sports';
UPDATE categories SET commission_percentage = 10.00 WHERE slug = 'home-living';
UPDATE categories SET commission_percentage = 10.00 WHERE slug = 'home-heritage';

-- ── 2. Store override is now opt-in (NULL = no negotiated rate) ────────────
ALTER TABLE stores ALTER COLUMN commission_rate_percentage DROP DEFAULT;
ALTER TABLE stores ALTER COLUMN commission_rate_percentage DROP NOT NULL;
-- Existing rows all hold the old hardcoded default; clear them so category
-- rates take effect. Admins can set explicit negotiated per-store rates
-- afterwards via the admin Stores/KYC screens.
UPDATE stores SET commission_rate_percentage = NULL
WHERE commission_rate_percentage = 10.00;

-- seller_payout_pkr may not exist in every environment (FIX_MISSING_COLUMNS added it conditionally)
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS seller_payout_pkr NUMERIC(12,2) DEFAULT 0;

-- ── 3. Commission resolution helper ────────────────────────────────────────
-- Resolution order: FIRST_PARTY → 0% | store override → nearest ancestor
-- category rate → platform default, minus active subscription reduction.
CREATE OR REPLACE FUNCTION waw_commission_rate(
  p_store_id    TEXT,
  p_category_id TEXT
)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_type   TEXT;
  v_override     NUMERIC(5,2);
  v_cat_rate     NUMERIC(5,2);
  v_walk_id      TEXT;
  v_default_pct  NUMERIC(5,2) := 10;
  v_reduction    NUMERIC(5,2) := 0;
BEGIN
  -- 0% commission for Waw's own first-party retail
  SELECT seller_type, commission_rate_percentage
  INTO v_store_type, v_override
  FROM stores WHERE id = p_store_id;

  IF v_store_type = 'FIRST_PARTY' THEN
    RETURN 0;
  END IF;

  -- Platform default from marketplace_settings
  v_default_pct := COALESCE(
    (SELECT NULLIF(value #>> '{}', '')::NUMERIC FROM marketplace_settings WHERE key = 'default_commission_pct'),
    10);

  -- Per-category rate: walk up the category tree from the product's
  -- category to the nearest ancestor with an explicit rate.
  v_cat_rate := NULL;
  v_walk_id  := p_category_id;
  FOR i IN 1..6 LOOP
    EXIT WHEN v_walk_id IS NULL;
    SELECT c.commission_percentage, c.parent_id
    INTO v_cat_rate, v_walk_id
    FROM categories c
    WHERE c.id = v_walk_id;
    EXIT WHEN v_cat_rate IS NOT NULL;
  END LOOP;

  -- Subscription benefit: active (non-expired) plan's commission reduction
  SELECT COALESCE(sp.commission_reduction, 0)
  INTO v_reduction
  FROM seller_subscriptions ss
  JOIN subscription_plans sp ON sp.id = ss.plan_id
  WHERE ss.store_id = p_store_id
    AND ss.status = 'ACTIVE'
    AND (ss.expires_at IS NULL OR ss.expires_at > NOW())
  ORDER BY ss.started_at DESC
  LIMIT 1;

  RETURN GREATEST(
    LEAST(COALESCE(v_override, v_cat_rate, v_default_pct) - COALESCE(v_reduction, 0), 50),
    0
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. checkout_transaction — commission resolved per item + seller payout
--    (full body carried forward from migration 035; only the commission
--    line and the payout write changed)
-- ═══════════════════════════════════════════════════════════════════════════
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
  v_sorted_items    JSONB;
  v_coupon_discount_pkr   NUMERIC := 0;
  v_loyalty_discount_pkr  NUMERIC := 0;
  v_total_discount_pkr    NUMERIC := 0;
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
  SELECT jsonb_agg(elem ORDER BY (elem->>'offer_variant_id') ASC)
  INTO v_sorted_items
  FROM jsonb_array_elements(p_items) AS elem;

  -- -- 4. Ensure snapshot rows exist + lock them in sorted order --
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sorted_items)
  LOOP
    IF v_item ? 'variant_id' AND (v_item->>'variant_id') IS NOT NULL THEN
      v_variant_id := v_item->>'variant_id';
    ELSE
      v_variant_id := v_item->>'offer_variant_id';
    END IF;

    v_item_quantity := (v_item->>'quantity')::INT;

    IF v_item_quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be positive';
    END IF;

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

    PERFORM ensure_inventory_snapshot(v_variant_id, v_offer.store_id);

    SELECT * INTO v_snapshot
    FROM inventory_snapshots
    WHERE offer_variant_id = v_variant_id
    FOR UPDATE;

    IF v_snapshot.available < v_item_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for item %: available=%, requested=%',
        v_item->>'offer_variant_id', v_snapshot.available, v_item_quantity;
    END IF;

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

  -- -- 5b. Order-level totals --
  v_coupon_discount_pkr  := GREATEST(COALESCE(p_coupon_discount_pkr, 0), 0);
  v_loyalty_discount_pkr := GREATEST(COALESCE(p_loyalty_discount_pkr, 0), 0);
  v_coupon_discount_pkr  := LEAST(v_coupon_discount_pkr, v_subtotal_pkr);
  v_loyalty_discount_pkr := LEAST(v_loyalty_discount_pkr, GREATEST(v_subtotal_pkr - v_coupon_discount_pkr, 0));
  v_total_discount_pkr   := v_coupon_discount_pkr + v_loyalty_discount_pkr;

  IF (v_subtotal_pkr - v_total_discount_pkr) >= v_free_delivery_threshold THEN
    v_shipping_pkr := 0;
  ELSE
    v_shipping_pkr := v_default_shipping_fee;
  END IF;

  IF p_payment_method = 'COD' THEN v_cod_fee_pkr := v_cod_handling_fee; ELSE v_cod_fee_pkr := 0; END IF;

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

  -- -- 7. Ledger + store_orders + order_items (commission resolved per item) --
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sorted_items)
  LOOP
    -- Resolve the offer THROUGH the variant (API sends offer_variants.id)
    SELECT so.*, cp.title AS product_title, so.store_id, cp.category_id AS product_category_id,
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

    INSERT INTO inventory_ledger (
      offer_variant_id, store_id, transaction_type, quantity, reference_id, notes
    ) VALUES (
      v_variant_id, v_offer.store_id, 'RESERVE', -v_item_quantity,
      v_order_id, 'Checkout reservation for Order ' || v_order_number
    );

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
          commission_pkr = commission_pkr + ROUND(
            v_line_total * waw_commission_rate(v_offer.store_id, v_offer.product_category_id) / 100.0, 2)
      WHERE id = v_so_id;
    END;
  END LOOP;

  -- -- 7b. Seller payout net per store sub-order (subtotal - commission) --
  UPDATE store_orders
  SET seller_payout_pkr = GREATEST(subtotal_pkr - commission_pkr, 0)
  WHERE order_id = v_order_id;

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

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. guest_checkout_transaction — config-driven fees, quote discounts,
--    commission resolution, seller payout (previously hardcoded 5000/200/
--    100/0.18 and 10% commission — guests saw different pricing than
--    logged-in buyers)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION guest_checkout_transaction(
  p_guest_session_token TEXT,
  p_buyer_name          TEXT,
  p_buyer_phone         TEXT,
  p_shipping_address    TEXT,
  p_shipping_city       TEXT,
  p_payment_method      TEXT,
  p_items               JSONB,
  p_idempotency_key     TEXT DEFAULT NULL,
  p_coupon_discount_pkr  NUMERIC DEFAULT 0,
  p_loyalty_discount_pkr NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id          TEXT;
  v_order_number      TEXT;
  v_total_pkr         NUMERIC := 0;
  v_subtotal_pkr      NUMERIC := 0;
  v_shipping_pkr      NUMERIC := 0;
  v_cod_fee_pkr       NUMERIC := 0;
  v_gst_pkr           NUMERIC := 0;
  v_item              JSONB;
  v_offer             RECORD;
  v_variant           RECORD;
  v_snapshot          RECORD;
  v_store_id          TEXT;
  v_line_total        NUMERIC;
  v_store_orders      JSONB := '[]'::JSONB;
  v_existing_order    RECORD;
  v_variant_id        TEXT;
  v_item_quantity     INTEGER;
  v_sorted_items      JSONB;
  v_token_payload     TEXT;
  v_token_signature   TEXT;
  v_payload_json      JSONB;
  v_expected_sig      TEXT;
  v_token_phone       TEXT;
  v_token_expires_at  TIMESTAMPTZ;
  v_token_nonce       TEXT;
  v_guest_secret      TEXT;
  v_coupon_discount_pkr   NUMERIC := 0;
  v_loyalty_discount_pkr  NUMERIC := 0;
  v_total_discount_pkr    NUMERIC := 0;
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
  -- -- 1. Validate token presence --
  IF p_guest_session_token IS NULL OR p_guest_session_token = '' THEN
    RAISE EXCEPTION 'Guest session token is required';
  END IF;

  -- -- 2. Split token into payload.signature --
  v_token_payload   := split_part(p_guest_session_token, '.', 1);
  v_token_signature := split_part(p_guest_session_token, '.', 2);

  IF v_token_payload = '' OR v_token_signature = '' THEN
    RAISE EXCEPTION 'Invalid guest session token format';
  END IF;

  -- -- 3. HMAC-SHA256 signature verification --
  BEGIN
    v_guest_secret := current_setting('app.guest_token_secret');
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Guest checkout is not configured. Contact support.';
  END;

  IF v_guest_secret IS NULL OR v_guest_secret = '' THEN
    RAISE EXCEPTION 'Guest checkout secret is not configured';
  END IF;

  v_expected_sig := encode(
    hmac(v_token_payload::BYTEA, v_guest_secret::BYTEA, 'sha256'),
    'base64'
  );

  IF v_token_signature != v_expected_sig THEN
    RAISE EXCEPTION 'Guest session token signature invalid';
  END IF;

  -- -- 4. Decode and validate payload --
  BEGIN
    v_payload_json := convert_from(decode(v_token_payload, 'base64'), 'UTF8')::JSONB;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid guest session token payload encoding';
  END;

  v_token_phone      := v_payload_json->>'phone';
  v_token_expires_at := (v_payload_json->>'expires_at')::TIMESTAMPTZ;
  v_token_nonce      := v_payload_json->>'nonce';

  IF v_token_nonce IS NULL OR v_token_nonce = '' THEN
    RAISE EXCEPTION 'Guest session token is missing cryptographic nonce';
  END IF;

  BEGIN
    INSERT INTO guest_token_nonces (nonce, expires_at)
    VALUES (v_token_nonce, v_token_expires_at);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Guest session token already consumed (replay attack)';
  END;

  IF v_token_phone IS NULL OR v_token_phone != p_buyer_phone THEN
    RAISE EXCEPTION 'Guest session token phone mismatch';
  END IF;

  IF v_token_expires_at IS NULL OR v_token_expires_at < NOW() THEN
    RAISE EXCEPTION 'Guest session token has expired';
  END IF;

  -- -- 5. Rate limiting: one active guest order per phone per 15 minutes --
  IF EXISTS (
    SELECT 1 FROM orders
    WHERE buyer_phone = p_buyer_phone
      AND buyer_id IS NULL
      AND global_status = 'PENDING_PAYMENT'
      AND created_at > NOW() - INTERVAL '15 minutes'
  ) THEN
    RAISE EXCEPTION 'A pending guest order already exists for this phone. Please complete or wait.';
  END IF;

  -- -- 6. Idempotency check --
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, order_number, total_amount_pkr INTO v_existing_order
    FROM orders WHERE idempotency_key = p_idempotency_key LIMIT 1;

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

  -- -- 7. Sort items for deterministic lock ordering --
  SELECT jsonb_agg(elem ORDER BY (elem->>'offer_variant_id') ASC)
  INTO v_sorted_items
  FROM jsonb_array_elements(p_items) AS elem;

  -- -- 8. Ensure snapshots + lock in sorted order + check stock --
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sorted_items)
  LOOP
    IF v_item ? 'variant_id' AND (v_item->>'variant_id') IS NOT NULL THEN
      v_variant_id := v_item->>'variant_id';
    ELSE
      v_variant_id := v_item->>'offer_variant_id';
    END IF;

    v_item_quantity := (v_item->>'quantity')::INT;

    IF v_item_quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be positive';
    END IF;

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

    PERFORM ensure_inventory_snapshot(v_variant_id, v_offer.store_id);

    SELECT * INTO v_snapshot
    FROM inventory_snapshots
    WHERE offer_variant_id = v_variant_id
    FOR UPDATE;

    IF v_snapshot.available < v_item_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for item %: available=%, requested=%',
        v_item->>'offer_variant_id', v_snapshot.available, v_item_quantity;
    END IF;

    IF v_item ? 'variant_id' AND (v_item->>'variant_id') IS NOT NULL THEN
      SELECT * INTO v_variant
      FROM offer_variants
      WHERE id = v_item->>'variant_id'
        AND offer_id = v_offer.id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variant not found: %', v_item->>'variant_id';
      END IF;
      v_line_total := (v_offer.price_pkr + COALESCE(v_variant.price_adjustment_pkr, 0)) * v_item_quantity;
    ELSE
      -- The variant adjustment was already resolved via the offer lookup
      v_line_total := (v_offer.price_pkr + COALESCE(v_offer.variant_adjustment_pkr, 0)) * v_item_quantity;
    END IF;

    UPDATE inventory_snapshots
    SET reserved   = reserved + v_item_quantity,
        version    = version + 1,
        updated_at = NOW()
    WHERE offer_variant_id = v_variant_id;

    v_subtotal_pkr := v_subtotal_pkr + v_line_total;
    v_store_id     := v_offer.store_id;
  END LOOP;

  -- -- 9. Fees (config-driven, discounts respected — mirrors auth checkout) --
  v_coupon_discount_pkr  := GREATEST(COALESCE(p_coupon_discount_pkr, 0), 0);
  v_loyalty_discount_pkr := GREATEST(COALESCE(p_loyalty_discount_pkr, 0), 0);
  v_coupon_discount_pkr  := LEAST(v_coupon_discount_pkr, v_subtotal_pkr);
  v_loyalty_discount_pkr := LEAST(v_loyalty_discount_pkr, GREATEST(v_subtotal_pkr - v_coupon_discount_pkr, 0));
  v_total_discount_pkr   := v_coupon_discount_pkr + v_loyalty_discount_pkr;

  IF (v_subtotal_pkr - v_total_discount_pkr) >= v_free_delivery_threshold THEN
    v_shipping_pkr := 0;
  ELSE
    v_shipping_pkr := v_default_shipping_fee;
  END IF;

  IF p_payment_method = 'COD' THEN v_cod_fee_pkr := v_cod_handling_fee; ELSE v_cod_fee_pkr := 0; END IF;

  v_gst_pkr := ROUND(((v_subtotal_pkr - v_total_discount_pkr) + v_shipping_pkr + v_cod_fee_pkr)
                      * (v_gst_rate_pct / 100.0));

  v_total_pkr := (v_subtotal_pkr - v_total_discount_pkr) + v_shipping_pkr + v_cod_fee_pkr + v_gst_pkr;

  -- -- 10. Create order --
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
    v_order_id, v_order_number, NULL, p_buyer_name, p_buyer_phone,
    p_shipping_address, p_shipping_city, '',
    'PENDING_PAYMENT', 'PENDING', p_payment_method,
    v_total_pkr, v_subtotal_pkr, v_shipping_pkr, v_cod_fee_pkr, v_gst_pkr,
    v_total_discount_pkr,
    p_idempotency_key, NOW(), NOW()
  );

  -- -- 11. Ledger + store_orders + order_items (commission resolved per item) --
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sorted_items)
  LOOP
    -- Resolve the offer THROUGH the variant (API sends offer_variants.id)
    SELECT so.*, cp.title AS product_title, so.store_id, cp.category_id AS product_category_id,
           ov.price_adjustment_pkr AS variant_adjustment_pkr
    INTO v_offer
    FROM offer_variants ov
    JOIN seller_offers so ON so.id = ov.offer_id
    JOIN catalog_products cp ON cp.id = so.catalog_product_id
    WHERE ov.id = v_item->>'offer_variant_id';

    IF v_item ? 'variant_id' AND (v_item->>'variant_id') IS NOT NULL THEN
      SELECT * INTO v_variant FROM offer_variants WHERE id = v_item->>'variant_id';
      v_line_total  := (v_offer.price_pkr + COALESCE(v_variant.price_adjustment_pkr, 0)) * (v_item->>'quantity')::INT;
      v_variant_id  := v_item->>'variant_id';
    ELSE
      v_line_total  := (v_offer.price_pkr + COALESCE(v_offer.variant_adjustment_pkr, 0)) * (v_item->>'quantity')::INT;
      v_variant_id  := v_item->>'offer_variant_id';
    END IF;

    v_item_quantity := (v_item->>'quantity')::INT;

    INSERT INTO inventory_ledger (
      offer_variant_id, store_id, transaction_type, quantity, reference_id, notes
    ) VALUES (
      v_variant_id, v_offer.store_id, 'RESERVE', -v_item_quantity,
      v_order_id, 'Guest checkout reservation for Order ' || v_order_number
    );

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
          commission_pkr = commission_pkr + ROUND(
            v_line_total * waw_commission_rate(v_offer.store_id, v_offer.product_category_id) / 100.0, 2)
      WHERE id = v_so_id;
    END;
  END LOOP;

  -- -- 11b. Seller payout net per store sub-order --
  UPDATE store_orders
  SET seller_payout_pkr = GREATEST(subtotal_pkr - commission_pkr, 0)
  WHERE order_id = v_order_id;

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
    'discount_pkr',     v_total_discount_pkr,
    'guest_checkout',   true
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- Function identities changed (guest RPC gained 2 trailing params) —
-- drop legacy overloads and re-grant.
DROP FUNCTION IF EXISTS guest_checkout_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT);
DROP FUNCTION IF EXISTS checkout_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT);

GRANT EXECUTE ON FUNCTION checkout_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, INTEGER) TO authenticated;
REVOKE EXECUTE ON FUNCTION checkout_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, INTEGER) FROM anon;

GRANT EXECUTE ON FUNCTION guest_checkout_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, NUMERIC) TO anon;
GRANT EXECUTE ON FUNCTION guest_checkout_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, NUMERIC) TO authenticated;

-- Grant on categories/stores commission columns for admin tooling reads
GRANT SELECT ON subscription_plans TO authenticated;

INSERT INTO schema_migrations (version, applied_at) VALUES ('037_revenue_commission_capture', NOW()) ON CONFLICT DO NOTHING;
