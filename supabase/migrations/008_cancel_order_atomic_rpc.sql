begin;

  -- Atomically cancel order + all store_orders
  create or replace function cancel_order(p_order_id uuid, p_reason text default 'Customer cancelled')
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_order record;
    v_cancellable text[] := ARRAY['PENDING','PENDING_PAYMENT','CONFIRMED','PROCESSING'];
  begin
    select * into v_order from orders where id = p_order_id for update;

    if v_order is null then
      raise exception 'Order not found';
    end if;

    if v_order.global_status <> all(v_cancellable) then
      raise exception 'Order cannot be cancelled in % status', v_order.global_status;
    end if;

    update orders
       set global_status = 'CANCELLED',
           updated_at   = now()
     where id = p_order_id;

    update store_orders
       set status     = 'CANCELLED',
           updated_at = now()
     where order_id = p_order_id;

    return jsonb_build_object(
      'success', true,
      'orderId', p_order_id,
      'status',  'CANCELLED'
    );
  end;
  $$;

  grant execute on function cancel_order(uuid, text) to authenticated;

commit;
