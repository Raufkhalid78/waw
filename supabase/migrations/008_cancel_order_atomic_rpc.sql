-- ============================================================================
-- P0-2 + P0-5: Atomic cancel order RPC with inventory release
-- Cancels order, releases reserved inventory back to catalog,
-- and creates outbox events for notifications.
-- ============================================================================

begin;

  create or replace function cancel_order(p_order_id uuid, p_reason text default 'Customer cancelled')
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_order record;
    v_cancellable text[] := ARRAY['PENDING','PENDING_PAYMENT','CONFIRMED','PROCESSING'];
    v_item record;
    v_store_order record;
    v_released_count integer := 0;
  begin
    -- Lock order row to prevent concurrent modifications
    select * into v_order from orders where id = p_order_id for update;

    if v_order is null then
      raise exception 'Order not found';
    end if;

    -- Verify caller owns the order (or is admin via service_role)
    IF v_order.buyer_id IS NOT NULL AND v_order.buyer_id != auth.uid() THEN
      RAISE EXCEPTION 'Unauthorized to cancel this order';
    END IF;

    if v_order.global_status <> all(v_cancellable) then
      raise exception 'Order cannot be cancelled in % status', v_order.global_status;
    end if;

    -- Update parent order status
    update orders
       set global_status = 'CANCELLED',
           payment_status = CASE
             WHEN payment_status = 'PAID' THEN 'REFUNDED'
             ELSE payment_status
           END,
           updated_at   = now()
     where id = p_order_id;

    -- Update child store orders
    update store_orders
       set status     = 'CANCELLED',
           updated_at = now()
     where order_id = p_order_id;

    -- Release reserved inventory back to catalog for each item
    FOR v_store_order IN
      SELECT so.id AS store_order_id, so.store_id
      FROM store_orders so
      WHERE so.order_id = p_order_id
    LOOP
      FOR v_item IN
        SELECT oi.offer_variant_id, oi.quantity
        FROM order_items oi
        WHERE oi.store_order_id = v_store_order.store_order_id
          AND oi.offer_variant_id IS NOT NULL
      LOOP
        -- Insert RELEASE entry in inventory_ledger (positive quantity = restored stock)
        INSERT INTO inventory_ledger (
          offer_variant_id, store_id, transaction_type, quantity, reference_id, notes
        ) VALUES (
          v_item.offer_variant_id, v_store_order.store_id, 'RELEASE', v_item.quantity,
          p_order_id, 'Order cancelled: ' || p_reason
        );

        v_released_count := v_released_count + 1;
      END LOOP;
    END LOOP;

    -- Create outbox event for notification
    INSERT INTO outbox_events (event_type, payload, status, created_at)
    VALUES (
      'ORDER_CANCELLED',
      jsonb_build_object(
        'order_id', p_order_id,
        'order_number', v_order.order_number,
        'buyer_phone', v_order.buyer_phone,
        'reason', p_reason,
        'items_released', v_released_count
      ),
      'PENDING',
      now()
    );

    return jsonb_build_object(
      'success', true,
      'orderId', p_order_id,
      'status',  'CANCELLED',
      'inventory_released', v_released_count
    );
  end;
  $$;

  grant execute on function cancel_order(uuid, text) to authenticated;

commit;
