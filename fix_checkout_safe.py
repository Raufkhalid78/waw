import re

with open('apps/web/src/app/checkout/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Remove states
c = re.sub(r'\s*const \[showRaastQrModal, setShowRaastQrModal\] = useState\(false\);\n?', '', c)
c = re.sub(r'\s*const \[activeOrderId, setActiveOrderId\] = useState<string \| null>\(null\);\n?', '', c)
c = re.sub(r'\s*const \[raastQrPayload, setRaastQrPayload\] = useState<string \| null>\(null\);\n?', '', c)

# 2. handleRaastPaid
c = re.sub(r'\s*const handleRaastPaid = \(\) => \{[\s\S]*?^\s*\};\n?', '', c, flags=re.MULTILINE)

# 3. the if block
c = re.sub(r'\s*if \(paymentMethod === PaymentMethod\.RAAST_P2M_QR\) \{[\s\S]*?return;\n\s*\}', '', c)

# 4. the modal - VERY STRICT NOT TO CROSS
c = re.sub(r'\s*\{\/\* ── State Bank Raast P2M Dynamic QR Modal ──.*?\{\/\* ── Error Notification Toast ──', '\n      {/* ── Error Notification Toast ──', c, flags=re.DOTALL)

# 5. radio button - VERY STRICT
c = re.sub(r'\s*\{\/\* Option 1: Flagship State Bank Raast P2M Instant QR \*\/\}.*?(?=\{\/\* Option 2: PostEx XPay)', '\n              ', c, flags=re.DOTALL)

# 6. button text
c = re.sub(r'\{\s*paymentMethod === PaymentMethod\.RAAST_P2M_QR\s*\?\s*\'Generate Raast QR Code & Pay\'\s*:\s*Confirm Order \(PKR \$\{finalTotalPkr\.toLocaleString\(\)\}\)\s*\}', 'Confirm Order (PKR )', c)
c = c.replace('<span>Confirm Order (PKR )</span>', '<span>Confirm Order (PKR {finalTotalPkr.toLocaleString()})</span>')

with open('apps/web/src/app/checkout/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
