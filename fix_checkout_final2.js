const fs = require('fs');
let c = fs.readFileSync('apps/web/src/app/checkout/page.tsx', 'utf-8');

// states
c = c.replace(/const \[showRaastQrModal, setShowRaastQrModal\] = useState\(false\);\r?\n?/g, "");
c = c.replace(/const \[activeOrderId, setActiveOrderId\] = useState<string \| null>\(null\);\r?\n?/g, "");
c = c.replace(/const \[raastQrPayload, setRaastQrPayload\] = useState<string \| null>\(null\);\r?\n?/g, "");

// handleRaastPaid
const handleStart = c.indexOf("const handleRaastPaid = () => {");
if (handleStart !== -1) {
  const handleEnd = c.indexOf("};", handleStart) + 2;
  c = c.substring(0, handleStart) + c.substring(handleEnd);
}

// if block
const ifStart = c.indexOf("if (paymentMethod === PaymentMethod.RAAST_P2M_QR) {");
if (ifStart !== -1) {
  const ifEnd = c.indexOf("return;", ifStart) + 7;
  // wait, the block ends with }
  const ifEndBrace = c.indexOf("}", ifEnd) + 1;
  c = c.substring(0, ifStart) + c.substring(ifEndBrace);
}

// modal
const modalStart = c.indexOf("{showRaastQrModal && (");
if (modalStart !== -1) {
  const modalEndStr = "Cancel & Return\n              </button>\n            </div>\n          </div>\n        </div>\n      )}";
  const modalEnd = c.indexOf(modalEndStr, modalStart);
  if (modalEnd !== -1) {
    c = c.substring(0, modalStart) + c.substring(modalEnd + modalEndStr.length);
  } else {
    // try different newline encoding
    const modalEndStr2 = "Cancel & Return\r\n              </button>\r\n            </div>\r\n          </div>\r\n        </div>\r\n      )}";
    const modalEnd2 = c.indexOf(modalEndStr2, modalStart);
    if (modalEnd2 !== -1) {
      c = c.substring(0, modalStart) + c.substring(modalEnd2 + modalEndStr2.length);
    } else {
        console.log("Could not find modal end!");
    }
  }
}

// radio
const radioStart = c.indexOf("{/* Option 1: Flagship State Bank Raast P2M Instant QR */}");
if (radioStart !== -1) {
  const radioEnd = c.indexOf("{/* Option 2: PostEx XPay - Debit / Credit Cards */}");
  if (radioEnd !== -1) {
    c = c.substring(0, radioStart) + c.substring(radioEnd);
  }
}

// button
c = c.replace(/\{paymentMethod === PaymentMethod\.RAAST_P2M_QR[\s\S]*?Confirm Order \(PKR \$\{finalTotalPkr\.toLocaleString\(\)\}\)\}/g, "Confirm Order (PKR {finalTotalPkr.toLocaleString()})");
c = c.replace(/<span>Confirm Order/g, "<span>Confirm Order");
c = c.replace(/toLocaleString\(\)\}\)<\/span>/g, "toLocaleString()})</span>");

fs.writeFileSync('apps/web/src/app/checkout/page.tsx', c, 'utf-8');
console.log("Done");
