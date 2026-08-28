-- ============================================================================
-- WAW TRANSACTIONAL CHECKOUT RPC (SERVER-AUTHORITATIVE & ATOMIC)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.checkout_transaction(
    p_buyer_id TEXT,
    p_buyer_name TEXT,
    p_buyer_phone TEXT,
    p_shipping_address TEXT,
    p_shipping_city TEXT,
    p_payment_method TEXT,
    p_items JSONB, -- Array of { offer_variant_id: TEXT, quantity: INTEGER }
    p_coupon_code TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_order_id TEXT;
    v_order_number TEXT;
    v_city_active BOOLEAN;
    v_city_cod BOOLEAN;
    v_item_json JSONB;
    v_variant_id TEXT;
    v_qty INTEGER;
    v_variant_rec RECORD;
    v_available_stock INTEGER;
    v_unit_price INTEGER;
    v_item_total INTEGER;
    v_order_subtotal INTEGER := 0;
    v_shipping_fee INTEGER := 200;
    v_cod_fee INTEGER := 0;
    v_coupon_discount INTEGER := 0;
    v_final_total INTEGER := 0;
    v_store_id TEXT;
    v_store_subtotal INTEGER;
    v_store_commission INTEGER;
    v_store_payout INTEGER;
    v_commission_rate NUMERIC;
    v_store_order_id TEXT;
    v_outbox_id TEXT;
BEGIN
    -- 1. Destination Serviceability Check
    SELECT is_active, is_cod_eligible 
    INTO v_city_active, v_city_cod 
    FROM public.serviceable_cities 
    WHERE city_name = p_shipping_city;

    IF v_city_active IS NULL OR v_city_active = false THEN
        RAISE EXCEPTION 'Destination city "%" is not currently serviceable', p_shipping_city;
    END IF;

    IF p_payment_method = 'COD' AND (v_city_cod IS NULL OR v_city_cod = false) THEN
        RAISE EXCEPTION 'Cash on Delivery is not available in "%"', p_shipping_city;
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cannot checkout with an empty cart';
    END IF;

    -- 2. Validate Items, Lock Rows, Check Stock & Authoritative Pricing
    -- Create temporary table to store verified item lines for this checkout
    CREATE TEMPORARY TABLE temp_checkout_items (
        variant_id TEXT,
        offer_id TEXT,
        store_id TEXT,
        catalog_title TEXT,
        variant_name TEXT,
        quantity INTEGER,
        unit_price INTEGER,
        total_price INTEGER,
        commission_rate NUMERIC
    ) ON COMMIT DROP;

    FOR v_item_json IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id := COALESCE(v_item_json->>'offer_variant_id', v_item_json->>'variant_id', v_item_json->>'variantId');
        v_qty := COALESCE((v_item_json->>'quantity')::INTEGER, (v_item_json->>'qty')::INTEGER, 1);

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than 0';
        END IF;

        -- Lock offer variant and fetch authoritative listing & store details
        SELECT 
            v.id AS variant_id,
            v.variant_name,
            COALESCE(v.price_adjustment_pkr, 0) AS price_adj,
            o.id AS offer_id,
            o.store_id,
            o.price_pkr AS base_offer_price,
            o.status AS offer_status,
            cp.id AS product_id,
            cp.title AS catalog_title,
            cp.is_active AS catalog_active,
            COALESCE(s.commission_rate_percentage, 10) AS commission_rate
        INTO v_variant_rec
        FROM public.offer_variants v
        JOIN public.seller_offers o ON o.id = v.offer_id
        JOIN public.catalog_products cp ON cp.id = o.catalog_product_id
        JOIN public.stores s ON s.id = o.store_id
        WHERE v.id = v_variant_id
        FOR UPDATE OF v;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Offer variant ID "%" not found', v_variant_id;
        END IF;

        IF v_variant_rec.offer_status <> 'ACTIVE' OR v_variant_rec.catalog_active <> true THEN
            RAISE EXCEPTION 'Product "%" is not currently active for purchase', v_variant_rec.catalog_title;
        END IF;

        -- Check available stock in double-entry inventory ledger
        SELECT COALESCE(SUM(quantity), 0) INTO v_available_stock
        FROM public.inventory_ledger
        WHERE offer_variant_id = v_variant_id;

        IF v_available_stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for "%": % available, % requested', 
                v_variant_rec.catalog_title, v_available_stock, v_qty;
        END IF;

        -- Calculate authoritative server price
        v_unit_price := v_variant_rec.base_offer_price + v_variant_rec.price_adj;
        v_item_total := v_unit_price * v_qty;
        v_order_subtotal := v_order_subtotal + v_item_total;

        INSERT INTO temp_checkout_items VALUES (
            v_variant_rec.variant_id,
            v_variant_rec.offer_id,
            v_variant_rec.store_id,
            v_variant_rec.catalog_title,
            v_variant_rec.variant_name,
            v_qty,
            v_unit_price,
            v_item_total,
            v_variant_rec.commission_rate
        );
    END LOOP;

    -- 3. Calculate Authoritative Fees & Policies
    -- Free delivery policy >= PKR 5,000
    IF v_order_subtotal >= 5000 THEN
        v_shipping_fee := 0;
    ELSE
        v_shipping_fee := 200;
    END IF;

    -- COD fee policy
    IF p_payment_method = 'COD' THEN
        v_cod_fee := 100;
    ELSE
        v_cod_fee := 0;
    END IF;

    v_final_total := v_order_subtotal + v_shipping_fee + v_cod_fee - v_coupon_discount;

    -- 4. Create Parent Order
    v_order_id := 'ord_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 4);
    v_order_number := 'WAW-' || floor(random() * 899999 + 100000)::text;

    INSERT INTO public.orders (
        id, order_number, buyer_id, buyer_name, buyer_phone, shipping_address, shipping_city,
        total_amount_pkr, payment_method, payment_status, global_status, created_at
    ) VALUES (
        v_order_id, v_order_number, p_buyer_id, p_buyer_name, p_buyer_phone, p_shipping_address, p_shipping_city,
        v_final_total, p_payment_method, 
        CASE WHEN p_payment_method = 'COD' THEN 'COD_PENDING' ELSE 'PENDING' END,
        'CONFIRMED', NOW()
    );

    -- 5. Split Sub-Orders by Seller Store
    FOR v_store_id IN SELECT DISTINCT store_id FROM temp_checkout_items
    LOOP
        v_store_order_id := 'sord_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 4);

        SELECT 
            SUM(total_price),
            MAX(commission_rate)
        INTO v_store_subtotal, v_commission_rate
        FROM temp_checkout_items
        WHERE store_id = v_store_id;

        v_store_commission := round(v_store_subtotal * (v_commission_rate / 100.0));
        v_store_payout := v_store_subtotal - v_store_commission;

        INSERT INTO public.store_orders (
            id, order_id, store_id, order_number, subtotal_pkr, commission_pkr, seller_payout_pkr, status
        ) VALUES (
            v_store_order_id, v_order_id, v_store_id, 
            v_order_number || '-' || upper(substr(v_store_id, -4)),
            v_store_subtotal, v_store_commission, v_store_payout, 'CONFIRMED'
        );

        -- Insert order items & ledger reserves for this store
        FOR v_item_json IN SELECT row_to_json(t) FROM temp_checkout_items t WHERE t.store_id = v_store_id
        LOOP
            INSERT INTO public.order_items (
                id, store_order_id, offer_variant_id, quantity, price_pkr, product_title, variant_name
            ) VALUES (
                'item_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 4),
                v_store_order_id, 
                v_item_json->>'variant_id', 
                (v_item_json->>'quantity')::INTEGER,
                (v_item_json->>'unit_price')::INTEGER, 
                v_item_json->>'catalog_title', 
                v_item_json->>'variant_name'
            );

            -- Double-entry stock reservation
            INSERT INTO public.inventory_ledger (
                offer_variant_id, store_id, transaction_type, quantity, reference_id, notes
            ) VALUES (
                v_item_json->>'variant_id', 
                v_store_id, 
                'RESERVE', 
                -((v_item_json->>'quantity')::INTEGER), 
                v_order_id, 
                'Authoritative checkout stock reserve'
            );
        END LOOP;

        -- Financial Ledger Double-Entry Audit
        INSERT INTO public.financial_ledger (store_id, transaction_type, amount_pkr, entry_type, reference_id, description)
        VALUES 
        (v_store_id, 'SALE', v_store_subtotal, 'CREDIT', v_store_order_id, 'Store order subtotal gross value'),
        (v_store_id, 'COMMISSION', v_store_commission, 'DEBIT', v_store_order_id, 'Marketplace commission fee');

        -- Payout record initialized in SCHEDULED state pending delivery & returns SLA
        INSERT INTO public.payouts (store_id, amount_pkr, status, scheduled_for)
        VALUES (v_store_id, v_store_payout, 'SCHEDULED', NOW() + INTERVAL '7 days');

    END LOOP;

    -- 6. Insert Outbox Event for Asynchronous Notification / Dispatch Processing
    v_outbox_id := 'evt_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 4);
    INSERT INTO public.outbox_events (id, event_type, payload)
    VALUES (
        v_outbox_id, 
        'ORDER_CREATED', 
        jsonb_build_object(
            'order_id', v_order_id,
            'order_number', v_order_number,
            'total_amount_pkr', v_final_total,
            'shipping_city', p_shipping_city,
            'payment_method', p_payment_method
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount_pkr', v_final_total,
        'subtotal_pkr', v_order_subtotal,
        'shipping_fee_pkr', v_shipping_fee,
        'cod_fee_pkr', v_cod_fee
    );
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Checkout transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
