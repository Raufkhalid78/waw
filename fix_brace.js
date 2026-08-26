const fs = require('fs');
let c = fs.readFileSync('apps/api/src/modules/orders/order.service.ts', 'utf-8');
c = c.replace("      }\n\n      // 8. Decrement coupon usage if applied", "      }\n    }\n\n    // 8. Decrement coupon usage if applied");
fs.writeFileSync('apps/api/src/modules/orders/order.service.ts', c, 'utf-8');
