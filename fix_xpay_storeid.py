import re

with open('apps/api/src/modules/payments/xpay.service.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('i.store_id === storeOrder.store_id', 'i.store_order_id === storeOrder.id')

with open('apps/api/src/modules/payments/xpay.service.ts', 'w', encoding='utf-8') as f:
    f.write(c)
