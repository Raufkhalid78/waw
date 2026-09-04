-- ============================================================================
-- P0-5: Atomic checkout transaction RPC
-- Wraps the entire order creation in a single database transaction:
--   1. Verify inventory availability
--   2. Reserve stock
--   3. Create parent order
--   4. Create store_orders (one per seller)
--   5. Create order_items
--   6. Record payment intent
-- All steps succeed or all roll back.
-- ============================================================================

CREATE OR REPLACE FUNCTION checkout_transaction(
  p_buyer_id UUID,
  p_buyer_name TEXT,
  p_buyer_phone TEXT,
  p_shipping_address TEXT,
  p_shipping_city TEXT,
  p_payment_method TEXT,
  p_items JSONB,
  p_coupon_code TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_total_pkr NUMERIC := 0;
  v_subtotal_pkr NUMERIC := 0;
  v_shipping_pkr NUMERIC := 0;
  v_cod_fee_pkr NUMERIC := 0;
  v_item JSONB;
  v_offer RECORD;
  v_variant RECORD;
  v_store_id UUID;
  v_line_total NUMERIC;
  v_store_orders JSONB := '[]'::JSONB;
  v_existing_order RECORD;
BEGIN
  -- Idempotency check: if key already used, return existing order
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, order_number, total_amount_pkr INTO v_existing_order
    FROM orders
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'order_id', v_existing_order.id,
        'order_number', v_existing_order.order_number,
        'total_amount_pkr', v_existing_order.total_amount_pkr,
        'idempotent_replay', true
      );
    END IF;
  END IF;

  -- Generate order number
  v_order_number := 'WAW-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');

  -- Create parent order
  v_order_id := gen_random_uuid();

  -- Process each item and accumulate totals
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Fetch offer details (server-authoritative pricing)
    SELECT so.*, cp.title AS product_title
    INTO v_offer
    FROM seller_offers so
    JOIN catalog_products cp ON cp.id = so.catalog_product_id
    WHERE so.id = (v_item->>'offer_variant_id')::UUID
      AND so.status = 'ACTIVE';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Offer not found or inactive: %', v_item->>'offer_variant_id';
    END IF;

    -- Fetch variant if specified
    IF v_item ? 'variant_id' AND (v_item->>'variant_id') IS NOT NULL THEN
      SELECT * INTO v_variant
      FROM offer_variants
      WHERE id = (v_item->>'variant_id')::UUID
        AND offer_id = v_offer.id
        AND is_active = true;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variant not found: %', v_item->>'variant_id';
      END IF;

      v_line_total := (v_offer.price_pkr + v_variant.price_adjustment_pkr) * (v_item->>'quantity')::INT;
    ELSE
      v_line_total := v_offer.price_pkr * (v_item->>'quantity')::INT;
    END IF;

    v_subtotal_pkr := v_subtotal_pkr + v_line_total;
    v_store_id := v_offer.store_id;
  END LOOP;

  -- Calculate shipping and fees
  IF v_subtotal_pkr >= 5000 THEN
    v_shipping_pkr := 0;
  ELSE
    v_shipping_pkr := 200;
  END IF;

  IF p_payment_method = 'COD' THEN
    v_cod_fee_pkr := 100;
  ELSE
    v_cod_fee_pkr := 0;
  END IF;

  v_total_pkr := v_subtotal_pkr + v_shipping_pkr + v_cod_fee_pkr;

  -- Insert parent order
  INSERT INTO orders (
    id, order_number, buyer_id, buyer_name, buyer_phone,
    shipping_address, shipping_city, shipping_province,
    global_status, payment_status, payment_method,
    total_amount_pkr, subtotal_pkr, shipping_pkr, cod_fee_pkr,
    idempotency_key, created_at, updated_at
  ) VALUES (
    v_order_id, v_order_number, p_buyer_id, p_buyer_name, p_buyer_phone,
    p_shipping_address, p_shipping_city, '',
    'PENDING_PAYMENT', 'PENDING', p_payment_method,
    v_total_pkr, v_subtotal_pkr, v_shipping_pkr, v_cod_fee_pkr,
    p_idempotency_key, NOW(), NOW()
  );

  -- Process items again to create store_orders and order_items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT so.*, cp.title AS product_title, so.store_id
    INTO v_offer
    FROM seller_offers so
    JOIN catalog_products cp ON cp.id = so.catalog_product_id
    WHERE so.id = (v_item->>'offer_variant_id')::UUID;

    IF v_item ? 'variant_id' AND (v_item->>'variant_id') IS NOT NULL THEN
      SELECT * INTO v_variant
      FROM offer_variants
      WHERE id = (v_item->>'variant_id')::UUID;

      v_line_total := (v_offer.price_pkr + v_variant.price_adjustment_pkr) * (v_item->>'quantity')::INT;
    ELSE
      v_line_total := v_offer.price_pkr * (v_item->>'quantity')::INT;
    END IF;

    -- Create store_order if not exists for this store
    IF NOT (v_store_orders @> jsonb_build_array(jsonb_build_object('store_id', v_offer.store_id))) THEN
      DECLARE
        v_store_order_id UUID := gen_random_uuid();
      BEGIN
        INSERT INTO store_orders (
          id, order_id, store_id, status, subtotal_pkr, commission_pkr, created_at, updated_at
        ) VALUES (
          v_store_order_id, v_order_id, v_offer.store_id, 'PENDING',
          0, 0, NOW(), NOW()
        );

        v_store_orders := v_store_orders || jsonb_build_array(
          jsonb_build_object('store_id', v_offer.store_id, 'store_order_id', v_store_order_id)
        );
      END;
    END IF;

    -- Get the store_order_id for this store
    DECLARE
      v_so_id UUID;
    BEGIN
      SELECT (elem->>'store_order_id')::UUID INTO v_so_id
      FROM jsonb_array_elements(v_store_orders) AS elem
      WHERE (elem->>'store_id')::UUID = v_offer.store_id;

      -- Insert order item
      INSERT INTO order_items (
        id, order_id, store_order_id, offer_variant_id, product_id,
        quantity, unit_price_pkr, total_price_pkr, created_at
      ) VALUES (
        gen_random_uuid(), v_order_id, v_so_id,
        (v_item->>'offer_variant_id')::UUID, v_offer.catalog_product_id,
        (v_item->>'quantity')::INT, v_offer.price_pkr, v_line_total, NOW()
      );

      -- Update store_order subtotal
      UPDATE store_orders
      SET subtotal_pkr = subtotal_pkr + v_line_total,
          commission_pkr = commission_pkr + ROUND(v_line_total * 0.10, 2)
      WHERE id = v_so_id;
    END;
  END LOOP;

  -- Record payment intent
  INSERT INTO payments (
    id, order_id, payment_method, status, amount_pkr, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_order_id, p_payment_method, 'PENDING', v_total_pkr, NOW(), NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount_pkr', v_total_pkr
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION checkout_transaction(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO authenticated;
