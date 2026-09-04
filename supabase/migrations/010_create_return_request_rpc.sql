-- ============================================================================
-- P0-5: Atomic return request creation RPC
-- Wraps return request + return items in a single transaction.
-- Prevents orphaned return_items without a return_request, or
-- return_requests without line items.
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
BEGIN
  -- Validate order exists and belongs to buyer
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.buyer_id IS NOT NULL AND v_order.buyer_id != p_buyer_id THEN
    RAISE EXCEPTION 'Unauthorized to return this order';
  END IF;

  -- Validate 7-day return window
  IF v_order.delivered_at IS NOT NULL THEN
    IF NOW() - v_order.delivered_at > INTERVAL '7 days' THEN
      RAISE EXCEPTION 'The 7-day return window for this order has expired';
    END IF;
  END IF;

  -- Validate items array is non-empty
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one item must be specified for return';
  END IF;

  -- Create return request
  v_return_request_id := gen_random_uuid();

  INSERT INTO return_requests (
    id, order_id, buyer_id, reason, evidence_images,
    status, refund_amount_pkr, staff_notes, created_at, updated_at
  ) VALUES (
    v_return_request_id, p_order_id, p_buyer_id, p_reason,
    p_evidence_images, 'PENDING_COURIER_BOOKING', 0,
    CASE WHEN p_comments IS NOT NULL
      THEN 'Buyer notes: ' || p_comments || '. Pref: ' || p_refund_preference
      ELSE 'Pref: ' || p_refund_preference
    END,
    NOW(), NOW()
  );

  -- Process each return item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Validate order item belongs to this order
    SELECT * INTO v_order_item
    FROM order_items
    WHERE id = (v_item->>'order_item_id')::UUID
      AND order_id = p_order_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order item % does not belong to this order', v_item->>'order_item_id';
    END IF;

    -- Insert return item
    INSERT INTO return_items (
      id, return_request_id, order_item_id, quantity, created_at
    ) VALUES (
      gen_random_uuid(), v_return_request_id,
      (v_item->>'order_item_id')::UUID,
      (v_item->>'quantity')::INT,
      NOW()
    );

    -- Accumulate refund
    v_total_refund := v_total_refund + (v_order_item.price_pkr * (v_item->>'quantity')::INT);

    v_return_items := v_return_items || jsonb_build_object(
      'order_item_id', v_item->>'order_item_id',
      'quantity', v_item->>'quantity'
    );
  END LOOP;

  -- Update refund amount
  UPDATE return_requests
  SET refund_amount_pkr = v_total_refund
  WHERE id = v_return_request_id;

  -- Update order status
  UPDATE orders
  SET global_status = 'RETURN_REQUESTED', updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'return_request_id', v_return_request_id,
    'total_refund_pkr', v_total_refund,
    'items', v_return_items
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION create_return_request(UUID, UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, JSONB) TO authenticated;
