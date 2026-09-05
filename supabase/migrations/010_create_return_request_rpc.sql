-- ============================================================================
-- P0-3 + P0-4 + P0-5: Atomic return request creation RPC with seller-level allocation
-- Wraps return request + return items in a single transaction.
-- Prevents orphaned return_items without a return_request, or
-- return_requests without line items.
-- Validates: delivered status, 7-day window, no duplicate returns,
--            seller-level grouping for multi-vendor orders.
-- Locks order items with FOR UPDATE to prevent concurrent over-returns.
-- Allocates refund economics per line (unit price, proportional shipping/tax).
-- ============================================================================

CREATE OR REPLACE FUNCTION create_return_request(
  p_order_id UUID,
  p_buyer_id UUID,
  p_reason TEXT,
  p_comments TEXT DEFAULT NULL,
  p_evidence_images JSONB DEFAULT '[]'::JSONB,
  p_refund_preference TEXT DEFAULT 'ORIGINAL_PAYMENT',
  p_pickup_address TEXT DEFAULT NULL,
  p_pickup_city TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_return_request_id UUID;
  v_total_refund NUMERIC := 0;
  v_item JSONB;
  v_order_item RECORD;
  v_return_items JSONB := '[]'::JSONB;
  v_store_order RECORD;
  v_seller_return_id UUID;
  v_seller_refund NUMERIC;
  v_seller_items JSONB;
  v_already_returned_qty INTEGER;
  v_item_refund NUMERIC;
  v_shipping_per_line NUMERIC;
  v_cod_fee_per_line NUMERIC;
  v_proportional_shipping NUMERIC;
  v_proportional_cod_fee NUMERIC;
  v_line_subtotal NUMERIC;
BEGIN
  -- ── P0-3: Verify caller identity ────────────────────────────────────────
  IF p_buyer_id IS NULL OR p_buyer_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: buyer identity mismatch';
  END IF;

  -- ── P0-5: Lock order row to prevent concurrent status changes ───────────
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.buyer_id IS NOT NULL AND v_order.buyer_id != p_buyer_id THEN
    RAISE EXCEPTION 'Unauthorized to return this order';
  END IF;

  -- Validate order is delivered
  IF v_order.delivered_at IS NULL THEN
    RAISE EXCEPTION 'Cannot return an order that has not been delivered';
  END IF;

  -- Validate 7-day return window
  IF NOW() - v_order.delivered_at > INTERVAL '7 days' THEN
    RAISE EXCEPTION 'The 7-day return window for this order has expired';
  END IF;

  -- Validate order is in a returnable state
  IF v_order.global_status NOT IN ('DELIVERED', 'RETURN_REQUESTED') THEN
    RAISE EXCEPTION 'Order cannot be returned in % status', v_order.global_status;
  END IF;

  -- Validate items array is non-empty
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one item must be specified for return';
  END IF;

  -- ── Calculate proportional shipping and COD fee per line ─────────────────
  -- Total line subtotal for proportional allocation
  v_line_subtotal := 0;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT oi.unit_price_pkr INTO v_line_subtotal
    FROM order_items oi
    WHERE oi.id = (v_item->>'order_item_id')::UUID;
    v_line_subtotal := v_line_subtotal + (v_line_subtotal * (v_item->>'quantity')::INT);
  END LOOP;

  -- Recalculate total sub from all items for proportional split
  DECLARE v_total_order_sub NUMERIC;
  BEGIN
    SELECT COALESCE(SUM(oi.unit_price_pkr * oi.quantity), 1) INTO v_total_order_sub
    FROM order_items oi
    WHERE oi.order_id = p_order_id;
    v_line_subtotal := GREATEST(v_total_order_sub, 1);
  END;

  -- ── P0-4: Process items with seller-level grouping ──────────────────────
  -- First pass: validate all items and accumulate per-seller totals
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- ── P0-5: Lock order item row to prevent concurrent over-returns ──────
    SELECT oi.*, so.store_id INTO v_order_item
    FROM order_items oi
    JOIN store_orders so ON so.id = oi.store_order_id
    WHERE oi.id = (v_item->>'order_item_id')::UUID
      AND oi.order_id = p_order_id
    FOR UPDATE OF oi;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order item % does not belong to this order', v_item->>'order_item_id';
    END IF;

    -- Validate positive quantity
    IF (v_item->>'quantity')::INT <= 0 THEN
      RAISE EXCEPTION 'Return quantity must be positive for item %', v_item->>'order_item_id';
    END IF;

    -- Reject duplicate item IDs in one request
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_return_items) AS existing
      WHERE (existing->>'order_item_id')::UUID = (v_item->>'order_item_id')::UUID
    ) THEN
      RAISE EXCEPTION 'Duplicate order item % in return request', v_item->>'order_item_id';
    END IF;

    -- ── P0-4: Check not already returned ───────────────────────────────
    SELECT COALESCE(SUM(ri.quantity), 0) INTO v_already_returned_qty
    FROM return_items ri
    JOIN return_requests rr ON rr.id = ri.return_request_id
    WHERE ri.order_item_id = (v_item->>'order_item_id')::UUID
      AND rr.order_id = p_order_id
      AND rr.status NOT IN ('REJECTED', 'CANCELLED');

    IF v_already_returned_qty + (v_item->>'quantity')::INT > v_order_item.quantity THEN
      RAISE EXCEPTION 'Return quantity (%) exceeds remaining returnable quantity (%) for item %',
        (v_item->>'quantity')::INT,
        v_order_item.quantity - v_already_returned_qty,
        v_item->>'order_item_id';
    END IF;

    -- Calculate base refund for this line item
    v_item_refund := v_order_item.unit_price_pkr * (v_item->>'quantity')::INT;

    -- Calculate proportional shipping and COD fee allocation
    v_proportional_shipping := ROUND(
      (v_order_item.unit_price_pkr * (v_item->>'quantity')::INT / v_line_subtotal)
      * COALESCE(v_order.shipping_fee_pkr, 0), 2
    );
    v_proportional_cod_fee := ROUND(
      (v_order_item.unit_price_pkr * (v_item->>'quantity')::INT / v_line_subtotal)
      * COALESCE(v_order.cod_fee_pkr, 0), 2
    );

    -- Total refund includes proportional shipping and COD fee
    v_item_refund := v_item_refund + v_proportional_shipping + v_proportional_cod_fee;
    v_total_refund := v_total_refund + v_item_refund;

    v_return_items := v_return_items || jsonb_build_object(
      'order_item_id', v_item->>'order_item_id',
      'quantity', (v_item->>'quantity')::INT,
      'unit_price_pkr', v_order_item.unit_price_pkr,
      'refund_amount_pkr', v_item_refund,
      'shipping_refund_pkr', v_proportional_shipping,
      'cod_fee_refund_pkr', v_proportional_cod_fee,
      'store_order_id', v_order_item.store_order_id,
      'store_id', v_order_item.store_id
    );
  END LOOP;

  -- Create parent return request
  v_return_request_id := gen_random_uuid();

  INSERT INTO return_requests (
    id, order_id, buyer_id, reason, evidence_images,
    status, refund_amount_pkr, staff_notes, created_at, updated_at
  ) VALUES (
    v_return_request_id, p_order_id, p_buyer_id, p_reason,
    p_evidence_images, 'PENDING_COURIER_BOOKING', v_total_refund,
    CASE WHEN p_comments IS NOT NULL
      THEN 'Buyer notes: ' || p_comments || '. Pref: ' || p_refund_preference
      ELSE 'Pref: ' || p_refund_preference
    END,
    NOW(), NOW()
  );

  -- ── P0-4: Create seller-level child return requests ────────────────────
  -- Group items by store_order_id (seller) and create per-seller return tracking
  FOR v_store_order IN
    SELECT DISTINCT
      (elem->>'store_order_id')::UUID AS store_order_id,
      (elem->>'store_id')::UUID AS store_id
    FROM jsonb_array_elements(v_return_items) AS elem
  LOOP
    v_seller_refund := 0;
    v_seller_items := '[]'::JSONB;

    -- Aggregate items for this seller using proper alias
    FOR v_item IN
      SELECT * FROM jsonb_array_elements(v_return_items) AS elem(value)
      WHERE (elem.value->>'store_order_id')::UUID = v_store_order.store_order_id
    LOOP
      v_seller_refund := v_seller_refund + (v_item->>'refund_amount_pkr')::NUMERIC;
      v_seller_items := v_seller_items || jsonb_build_object(
        'order_item_id', v_item->>'order_item_id',
        'quantity', v_item->>'quantity',
        'refund_amount_pkr', v_item->>'refund_amount_pkr'
      );
    END LOOP;

    -- Create per-seller return request child
    v_seller_return_id := gen_random_uuid();

    INSERT INTO return_requests (
      id, order_id, store_order_id, parent_return_id, buyer_id, reason, evidence_images,
      status, refund_amount_pkr, staff_notes, created_at, updated_at
    ) VALUES (
      v_seller_return_id, p_order_id, v_store_order.store_order_id, v_return_request_id,
      p_buyer_id, p_reason, p_evidence_images,
      'PENDING_COURIER_BOOKING', v_seller_refund,
      'Seller sub-return for store ' || v_store_order.store_id || '. ' ||
      COALESCE('Buyer notes: ' || p_comments || '. Pref: ' || p_refund_preference, 'Pref: ' || p_refund_preference),
      NOW(), NOW()
    );

    -- Insert return items linked to this seller's return request using proper alias
    FOR v_item IN
      SELECT * FROM jsonb_array_elements(v_return_items) AS elem(value)
      WHERE (elem.value->>'store_order_id')::UUID = v_store_order.store_order_id
    LOOP
      INSERT INTO return_items (
        id, return_request_id, order_item_id, quantity, created_at
      ) VALUES (
        gen_random_uuid(), v_seller_return_id,
        (v_item->>'order_item_id')::UUID,
        (v_item->>'quantity')::INT,
        NOW()
      );
    END LOOP;
  END LOOP;

  -- Update order status
  UPDATE orders
  SET global_status = 'RETURN_REQUESTED', updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'return_request_id', v_return_request_id,
    'total_refund_pkr', v_total_refund,
    'items', v_return_items,
    'seller_returns', (
      SELECT jsonb_agg(jsonb_build_object(
        'return_request_id', rr.id,
        'store_id', so.store_id,
        'refund_amount_pkr', rr.refund_amount_pkr,
        'status', rr.status
      ))
      FROM return_requests rr
      JOIN store_orders so ON so.id = rr.store_order_id
      WHERE rr.order_id = p_order_id
        AND rr.store_order_id IS NOT NULL
        AND rr.id != v_return_request_id
    )
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION create_return_request(UUID, UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, JSONB) TO authenticated;
