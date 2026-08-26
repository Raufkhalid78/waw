import re

with open('apps/api/src/modules/orders/order.service.ts', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace the shipment and payout booking in order.service.ts
old_block = """
      // 6. Book a distinct PostEx shipment per seller (COD or Prepaid)
      const shipment = await CourierService.bookCourierShipment({
        orderId: storeOrderId,
        orderNumber: ${orderNumber}-,
        customerName: input.buyerName,
        customerPhone: input.buyerPhone,
        deliveryAddress: input.shippingAddress,
        destinationCity: input.shippingCity,
        codAmountPkr: isCod ? storeSubtotal : 0,
        isCod,
        itemsCount: (storeItems as any[]).reduce((s, i) => s + i.quantity, 0),
      });
      shipments.push(shipment);

      // 7. Create payout record for seller
      await supabaseAdmin.from('payouts').insert({
        id: pay__,
        store_id: storeId,
        order_id: orderId,
        store_order_id: storeOrderId,
        amount_pkr: sellerPayoutPkr,
        commission_pkr: commissionPkr,
        status: 'SCHEDULED',
        scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });
"""

new_block = """
      // 6. Book shipment and create payout only if COD. For prepaid, wait for XPay webhook.
      if (isCod) {
        const shipment = await CourierService.bookCourierShipment({
          orderId: storeOrderId,
          orderNumber: ${orderNumber}-,
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
          id: pay__,
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
"""

if old_block.strip() in c:
    c = c.replace(old_block.strip(), new_block.strip())
else:
    # Try Regex
    c = re.sub(r'// 6\. Book a distinct PostEx shipment.*?// 8\. Decrement coupon usage if applied', new_block.strip() + '\n\n      // 8. Decrement coupon usage if applied', c, flags=re.DOTALL)

with open('apps/api/src/modules/orders/order.service.ts', 'w', encoding='utf-8') as f:
    f.write(c)
