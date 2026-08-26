with open('apps/web/src/app/checkout/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False

for line in lines:
    if "const [showRaastQrModal, setShowRaastQrModal]" in line: continue
    if "const [activeOrderId, setActiveOrderId]" in line: continue
    if "const [raastQrPayload, setRaastQrPayload]" in line: continue
    
    # skip handleRaastPaid block
    if "const handleRaastPaid = () => {" in line:
        skip = True
    if skip and "};" in line and "router.push" not in line:
        skip = False
        continue
    if skip: continue

    # skip if block for RAAST payment
    if "if (paymentMethod === PaymentMethod.RAAST_P2M_QR) {" in line:
        skip = True
    if skip and "return;" in line and "setShowRaastQrModal" not in line:
        pass # wait, it's inside the block
    if skip and "}" in line and "setShowRaastQrModal" not in line: # kinda risky, let's just use string replace after joining
        pass

# let's just do standard string replacements.
