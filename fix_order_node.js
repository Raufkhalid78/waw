const fs = require('fs');
let c = fs.readFileSync('apps/api/src/modules/orders/order.service.ts', 'utf-8');

const regex = /\/\/ 6\. Book a distinct PostEx shipment per seller \(COD or Prepaid\)[\s\S]*?\/\/ 8\. Decrement coupon usage if applied/;

const replacement = `// 6. Book shipment and create payout only if COD. For prepaid, wait for XPay webhook.
      if (isCod) {
        const shipment = await CourierService.bookCourierShipment({
          orderId: storeOrderId,
          orderNumber: \`\${orderNumber}-\${storeId.slice(-4).toUpperCase()}\`,
          customerName: input.buyerName,
          customerPhone: input.buyerPhone,
          deliveryAddress: input.shippingAddress,
          destinationCity: input.shippingCity,
          codAmountPkr: storeSubtotal,
          isCod: true,
          itemsCount: (storeItems as any[]).reduce((s, i) => s + i.quantity, 0),
        });
        shipments.push(shipment);

        // 7. Create payout record for seller
        await supabaseAdmin.from('payouts').insert({
          id: \`pay_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
          store_id: storeId,
          order_id: orderId,
          store_order_id: storeOrderId,
          amount_pkr: sellerPayoutPkr,
          commission_pkr: commissionPkr,
          status: 'SCHEDULED',
          scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        });
      }

      // 8. Decrement coupon usage if applied`;

c = c.replace(regex, replacement);
fs.writeFileSync('apps/api/src/modules/orders/order.service.ts', c, 'utf-8');
