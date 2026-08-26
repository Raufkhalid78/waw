const fs = require('fs');
let c = fs.readFileSync('apps/web/src/app/checkout/page.tsx', 'utf-8');

c = c.replace(/\{paymentMethod === PaymentMethod\.RAAST_P2M_QR[\s\S]*?`Confirm Order \(PKR \$\{finalTotalPkr\.toLocaleString\(\)\}\)`\}/g, "Confirm Order (PKR {finalTotalPkr.toLocaleString()})");
fs.writeFileSync('apps/web/src/app/checkout/page.tsx', c, 'utf-8');
