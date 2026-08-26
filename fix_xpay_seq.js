const fs = require('fs');

let c = fs.readFileSync('apps/api/src/modules/payments/xpay.service.ts', 'utf-8');

const queryOld = `    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, items:order_items(*)')
      .or(\`order_number.eq.\${orderRef},id.eq.\${orderRef}\`)
      .single();`;

const queryNew = `    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, items:order_items(*), store_orders(*)')
      .or(\`order_number.eq.\${orderRef},id.eq.\${orderRef}\`)
      .single();`;

c = c.replace(queryOld, queryNew);

const oldBlock = `    // 3. Automatically book PostEx courier pickup and generate Air Waybill
    try {
      await CourierService.bookCourierShipment({
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.buyer_name,
        customerPhone: order.buyer_phone,
        deliveryAddress: order.shipping_address,
        destinationCity: order.shipping_city,
        codAmountPkr: 0,
        isCod: false,
        itemsCount: order.items?.length || 1,
      });
    } catch (courierErr) {
      console.warn('PostEx automatic consignment booking notice:', courierErr);
    }`;

const newBlock = `    // 3. Automatically book PostEx courier pickup and create payout schedules per seller
    try {
      if (order.store_orders && order.store_orders.length > 0) {
        for (const storeOrder of order.store_orders) {
          const storeItems = order.items.filter((i: any) => i.store_id === storeOrder.store_id);
          const storeSubtotal = storeItems.reduce((s: number, i: any) => s + (i.total_price_pkr || 0), 0);
          const commissionPkr = Math.round(storeSubtotal * 0.05); // 5% commission
          const sellerPayoutPkr = storeSubtotal - commissionPkr;

          await CourierService.bookCourierShipment({
            orderId: storeOrder.id,
            orderNumber: \`\${order.order_number}-\${storeOrder.store_id.slice(-4).toUpperCase()}\`,
            customerName: order.buyer_name,
            customerPhone: order.buyer_phone,
            deliveryAddress: order.shipping_address,
            destinationCity: order.shipping_city,
            codAmountPkr: 0,
            isCod: false,
            itemsCount: storeItems.reduce((s: number, i: any) => s + i.quantity, 0) || 1,
          });

          await supabaseAdmin.from('payouts').insert({
            id: \`pay_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
            store_id: storeOrder.store_id,
            order_id: order.id,
            store_order_id: storeOrder.id,
            amount_pkr: sellerPayoutPkr,
            commission_pkr: commissionPkr,
            status: 'SCHEDULED',
            scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (courierErr) {
      console.warn('PostEx automatic consignment booking notice:', courierErr);
    }`;

c = c.replace(oldBlock, newBlock);

fs.writeFileSync('apps/api/src/modules/payments/xpay.service.ts', c, 'utf-8');
