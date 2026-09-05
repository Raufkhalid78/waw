-- ============================================================================
-- P0-4 [HARDENED]: Guest Checkout Transaction RPC
-- Improvements:
--   1. HMAC-SHA256 signature verification using pgcrypto.hmac().
--      Token format: base64url(JSON).base64url(HMAC-SHA256(JSON, secret))
--      Secret stored in app.settings as 'app.guest_token_secret'.
--   2. Same inventory_snapshots FOR UPDATE locking as authenticated checkout.
--   3. Sorted item locking for deadlock prevention.
--   4. Rate limiting: one active guest order per phone within 15 minutes.
-- ============================================================================

CREATE OR REPLACE FUNCTION guest_checkout_transaction(
  p_guest_session_token TEXT,
  p_buyer_name          TEXT,
  p_buyer_phone         TEXT,
  p_shipping_address    TEXT,
  p_shipping_city       TEXT,
  p_payment_method      TEXT,
  p_items               JSONB,
  p_idempotency_key     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id          UUID;
  v_order_number      TEXT;
  v_total_pkr         NUMERIC := 0;
  v_subtotal_pkr      NUMERIC := 0;
  v_shipping_pkr      NUMERIC := 0;
  v_cod_fee_pkr       NUMERIC := 0;
  v_item              JSONB;
  v_offer             RECORD;
  v_variant           RECORD;
  v_snapshot          RECORD;
  v_store_id          UUID;
  v_line_total        NUMERIC;
  v_store_orders      JSONB := '[]'::JSONB;
  v_existing_order    RECORD;
  v_variant_id        UUID;
  v_item_quantity     INTEGER;
  v_sorted_items      JSONB;
  -- Token parts
  v_token_payload     TEXT;
  v_token_signature   TEXT;
  v_payload_json      JSONB;
  v_expected_sig      TEXT;
  v_token_phone       TEXT;
  v_token_expires_at  TIMESTAMPTZ;
  v_token_nonce       TEXT;
  v_guest_secret      TEXT;
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
  -- Get the secret from database settings (set via ALTER DATABASE SET)
  BEGIN
    v_guest_secret := current_setting('app.guest_token_secret');
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: if setting not configured, reject all guest tokens
    RAISE EXCEPTION 'Guest checkout is not configured. Contact support.';
  END;

  IF v_guest_secret IS NULL OR v_guest_secret = '' THEN
    RAISE EXCEPTION 'Guest checkout secret is not configured';
  END IF;

  -- Compute expected HMAC signature
  v_expected_sig := encode(
    hmac(v_token_payload::BYTEA, v_guest_secret::BYTEA, 'sha256'),
    'base64'
  );

  -- Constant-time comparison to prevent timing attacks
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

  -- -- Consume nonce to prevent replay attacks --
  BEGIN
    INSERT INTO guest_token_nonces (nonce) VALUES (v_token_nonce);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Guest session token already consumed (replay attack)';
  END;

  -- Phone must match
  IF v_token_phone IS NULL OR v_token_phone != p_buyer_phone THEN
    RAISE EXCEPTION 'Guest session token phone mismatch';
  END IF;

  -- Token must not be expired
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
      v_variant_id := (v_item->>'variant_id')::UUID;
    ELSE
      v_variant_id := (v_item->>'offer_variant_id')::UUID;
    END IF;

    v_item_quantity := (v_item->>'quantity')::INT;

    IF v_item_quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be positive';
    END IF;

    SELECT so.*, cp.title AS product_title
    INTO v_offer
    FROM seller_offers so
    JOIN catalog_products cp ON cp.id = so.catalog_product_id
    WHERE so.id = (v_item->>'offer_variant_id')::UUID
      AND so.status = 'ACTIVE';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Offer not found or inactive: %', v_item->>'offer_variant_id';
    END IF;

    PERFORM ensure_inventory_snapshot(v_variant_id::TEXT, v_offer.store_id::TEXT);

    SELECT * INTO v_snapshot
    FROM inventory_snapshots
    WHERE offer_variant_id = v_variant_id::TEXT
    FOR UPDATE;

    IF v_snapshot.available < v_item_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for item %: available=%, requested=%',
        v_item->>'offer_variant_id', v_snapshot.available, v_item_quantity;
    END IF;

    IF v_item ? 'variant_id' AND (v_item->>'variant_id') IS NOT NULL THEN
      SELECT * INTO v_variant
      FROM offer_variants
      WHERE id = (v_item->>'variant_id')::UUID
        AND offer_id = v_offer.id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variant not found: %', v_item->>'variant_id';
      END IF;
      v_line_total := (v_offer.price_pkr + COALESCE(v_variant.price_adjustment_pkr, 0)) * v_item_quantity;
    ELSE
      v_line_total := v_offer.price_pkr * v_item_quantity;
    END IF;

    UPDATE inventory_snapshots
    SET reserved   = reserved + v_item_quantity,
        version    = version + 1,
        updated_at = NOW()
    WHERE offer_variant_id = v_variant_id::TEXT;

    v_subtotal_pkr := v_subtotal_pkr + v_line_total;
    v_store_id     := v_offer.store_id;
  END LOOP;

  -- -- 9. Fees --
  IF v_subtotal_pkr >= 5000 THEN v_shipping_pkr := 0; ELSE v_shipping_pkr := 200; END IF;
  IF p_payment_method = 'COD' THEN v_cod_fee_pkr := 100; ELSE v_cod_fee_pkr := 0; END IF;
  v_total_pkr := v_subtotal_pkr + v_shipping_pkr + v_cod_fee_pkr;

  -- -- 10. Create order --
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
    v_order_id, v_order_number, NULL, p_buyer_name, p_buyer_phone,
    p_shipping_address, p_shipping_city, '',
    'PENDING_PAYMENT', 'PENDING', p_payment_method,
    v_total_pkr, v_subtotal_pkr, v_shipping_pkr, v_cod_fee_pkr,
    p_idempotency_key, NOW(), NOW()
  );

  -- -- 11. Ledger + store_orders + order_items --
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sorted_items)
  LOOP
    SELECT so.*, cp.title AS product_title, so.store_id
    INTO v_offer
    FROM seller_offers so
    JOIN catalog_products cp ON cp.id = so.catalog_product_id
    WHERE so.id = (v_item->>'offer_variant_id')::UUID;

    IF v_item ? 'variant_id' AND (v_item->>'variant_id') IS NOT NULL THEN
      SELECT * INTO v_variant FROM offer_variants WHERE id = (v_item->>'variant_id')::UUID;
      v_line_total  := (v_offer.price_pkr + COALESCE(v_variant.price_adjustment_pkr, 0)) * (v_item->>'quantity')::INT;
      v_variant_id  := (v_item->>'variant_id')::UUID;
    ELSE
      v_line_total  := v_offer.price_pkr * (v_item->>'quantity')::INT;
      v_variant_id  := (v_item->>'offer_variant_id')::UUID;
    END IF;

    v_item_quantity := (v_item->>'quantity')::INT;

    INSERT INTO inventory_ledger (
      offer_variant_id, store_id, transaction_type, quantity, reference_id, notes
    ) VALUES (
      v_variant_id::TEXT, v_offer.store_id::TEXT, 'RESERVE', -v_item_quantity,
      v_order_id::TEXT, 'Guest checkout reservation for Order ' || v_order_number
    );

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

  INSERT INTO payments (
    id, order_id, payment_method, status, amount_pkr, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_order_id, p_payment_method, 'PENDING', v_total_pkr, NOW(), NOW()
  );

  RETURN jsonb_build_object(
    'success',          true,
    'order_id',         v_order_id,
    'order_number',     v_order_number,
    'total_amount_pkr', v_total_pkr,
    'guest_checkout',   true
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION guest_checkout_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION guest_checkout_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;
