CREATE OR REPLACE FUNCTION checkout_transaction(
    p_buyer_id TEXT,
    p_buyer_name TEXT,
    p_buyer_phone TEXT,
    p_shipping_address TEXT,
    p_shipping_city TEXT,
    p_payment_method TEXT,
    p_items JSONB -- Array of { offer_variant_id, quantity, store_id, price_pkr, product_title, variant_name, commission_pkr, seller_payout_pkr }
) RETURNS JSONB AS $$
DECLARE
    v_order_id TEXT;
    v_order_number TEXT;
    v_total_amount INTEGER := 0;
    v_item RECORD;
    v_item_json JSONB;
    v_store_order_id TEXT;
    v_store_subtotal INTEGER;
    v_store_commission INTEGER;
    v_store_payout INTEGER;
    v_store_id TEXT;
    v_outbox_id TEXT;
BEGIN
    -- 1. Create Parent Order
    v_order_id := 'ord_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 4);
    v_order_number := 'WAW-' || floor(random() * 899999 + 100000)::text;

    -- Calculate total
    FOR v_item_json IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_total_amount := v_total_amount + ((v_item_json->>'price_pkr')::INTEGER * (v_item_json->>'quantity')::INTEGER);
    END LOOP;

    INSERT INTO orders (
        id, buyer_id, buyer_name, buyer_phone, shipping_address, shipping_city,
        total_amount_pkr, payment_method, payment_status, global_status, created_at
    ) VALUES (
        v_order_id, p_buyer_id, p_buyer_name, p_buyer_phone, p_shipping_address, p_shipping_city,
        v_total_amount, p_payment_method, 'PENDING', 'PENDING', NOW()
    );

    -- 2. Group items by store_id and create store_orders
    -- (In a real advanced setup, we'd do complex grouping, but for simplicity we assume the caller passes pre-calculated totals per store or we loop and group)
    -- Actually, simpler to just insert store_orders and items. 
    -- Assuming caller passes grouped data or we group here.
    -- Let's just create a generic outbox event and let a worker do the split, or do the split here.
    
    FOR v_store_id IN SELECT DISTINCT v->>'store_id' FROM jsonb_array_elements(p_items) AS v
    LOOP
        v_store_order_id := 'sord_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 4);
        
        -- Calculate store totals
        SELECT 
            SUM((v->>'price_pkr')::INTEGER * (v->>'quantity')::INTEGER),
            SUM((v->>'commission_pkr')::INTEGER),
            SUM((v->>'seller_payout_pkr')::INTEGER)
        INTO v_store_subtotal, v_store_commission, v_store_payout
        FROM jsonb_array_elements(p_items) AS v
        WHERE v->>'store_id' = v_store_id;

        INSERT INTO store_orders (
            id, order_id, store_id, order_number, subtotal_pkr, commission_pkr, seller_payout_pkr, status
        ) VALUES (
            v_store_order_id, v_order_id, v_store_id, v_order_number || '-' || substr(v_store_id, 1, 4),
            v_store_subtotal, v_store_commission, v_store_payout, 'PENDING'
        );

        -- Insert Items and Inventory Ledger
        FOR v_item_json IN SELECT * FROM jsonb_array_elements(p_items) WHERE value->>'store_id' = v_store_id
        LOOP
            INSERT INTO order_items (
                id, store_order_id, offer_variant_id, quantity, price_pkr, product_title, variant_name
            ) VALUES (
                'item_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 4),
                v_store_order_id, v_item_json->>'offer_variant_id', (v_item_json->>'quantity')::INTEGER,
                (v_item_json->>'price_pkr')::INTEGER, v_item_json->>'product_title', v_item_json->>'variant_name'
            );

            INSERT INTO inventory_ledger (
                offer_variant_id, store_id, transaction_type, quantity, reference_id, notes
            ) VALUES (
                v_item_json->>'offer_variant_id', v_store_id, 'RESERVE', -(v_item_json->>'quantity')::INTEGER, v_order_id, 'Order placed'
            );
        END LOOP;
        
        -- Add to Financial Ledger
        INSERT INTO financial_ledger (store_id, transaction_type, amount_pkr, entry_type, reference_id, description)
        VALUES 
        (v_store_id, 'COMMISSION', v_store_commission, 'DEBIT', v_store_order_id, 'Platform commission fee'),
        (v_store_id, 'PAYOUT', v_store_payout, 'CREDIT', v_store_order_id, 'Seller payout reserved');

        -- Add to Payouts
        INSERT INTO payouts (store_id, amount_pkr, status, scheduled_for)
        VALUES (v_store_id, v_store_payout, 'SCHEDULED', NOW() + INTERVAL '7 days');

    END LOOP;

    -- 3. Create Outbox Event
    v_outbox_id := 'evt_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 4);
    INSERT INTO outbox_events (id, event_type, payload)
    VALUES (v_outbox_id, 'ORDER_CREATED', jsonb_build_object('order_id', v_order_id));

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number
    );
EXCEPTION WHEN OTHERS THEN
    -- Rollback is automatic in Postgres functions
    RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
