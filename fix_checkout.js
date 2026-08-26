const fs = require('fs');
let c = fs.readFileSync('apps/web/src/app/checkout/page.tsx', 'utf-8');

c = c.replace("  const [showRaastQrModal, setShowRaastQrModal] = useState(false);\n", "");
c = c.replace("  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);\n", "");
c = c.replace("  const [raastQrPayload, setRaastQrPayload] = useState<string | null>(null);\n", "");

const handleRaastPaid = `  const handleRaastPaid = () => {
    clearCart();
    if (activeOrderId) {
      router.push(\`/orders/\${activeOrderId}\`);
    } else {
      router.push('/');
    }
  };`;
c = c.replace(handleRaastPaid, "");

const ifBlock = `      if (paymentMethod === PaymentMethod.RAAST_P2M_QR) {
        setActiveOrderId(orderId);
        setRaastQrPayload(\`pk.gov.sbp.raast:WAW-PAY-PKR-\${finalTotalPkr}-ORD-\${orderId}\`);
        setIsSubmitting(false);
        setShowRaastQrModal(true);
        return;
      }`;
c = c.replace(ifBlock, "");

const modalStr = `      {/* ── State Bank Raast P2M Dynamic QR Modal ────────────────────────────────────────────── */}
      {showRaastQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowRaastQrModal(false)}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs animate-fade-in"
          />

          <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 z-10 space-y-5 text-center animate-scale-up">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              <Smartphone className="w-4 h-4 text-emerald-700" />
              <span>State Bank Raast Instant QR</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-950 tracking-tight">Scan to Pay</h3>
              <p className="text-sm text-slate-500 font-medium">
                Open your banking app and scan this code to securely pay <span className="font-bold text-slate-900">PKR {finalTotalPkr.toLocaleString()}</span>.
              </p>
            </div>

            <div className="bg-[#FEF600] p-4 rounded-3xl max-w-xs mx-auto border-2 border-slate-950 shadow-md">
              <img
                src={\`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=\${encodeURIComponent(
                  raastQrPayload || \`pk.gov.sbp.raast:WAW-PAY-PKR-\${finalTotalPkr}-REF\`
                )}&color=0f172a&bgcolor=fef600&margin=2\`}
                alt="State Bank Raast QR"
                className="w-56 h-56 mx-auto rounded-xl shadow-xs"
              />
              <div className="text-[11px] font-black text-slate-950 mt-2 tracking-wider uppercase font-mono">
                SBP P2M NETWORK
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleRaastPaid}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>I Have Completed Payment</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRaastQrModal(false)}
                className="w-full text-slate-400 hover:text-slate-600 text-xs font-bold py-1.5"
              >
                Cancel & Return
              </button>
            </div>
          </div>
        </div>
      )}`;
c = c.replace(modalStr, "");

const radioStr = `              {/* Option 1: Flagship State Bank Raast P2M Instant QR */}
              <label
                className={\`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all \${
                  paymentMethod === PaymentMethod.RAAST_P2M_QR
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-400/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }\`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === PaymentMethod.RAAST_P2M_QR}
                  onChange={() => setPaymentMethod(PaymentMethod.RAAST_P2M_QR)}
                  className="mt-1 accent-emerald-600"
                />
                <div className="space-y-1 w-full">
                  <div className="font-black text-sm text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      <span>State Bank Raast Instant QR (Zero Fee)</span>
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-black">
                      SAVE PKR 100
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Scan with any Pakistani banking app (HBL, Meezan, Nayapay, Sadapay, Easypaisa, JazzCash). Zero transaction charges.
                  </p>
                </div>
              </label>`;
c = c.replace(radioStr, "");

const btnStr = `                {paymentMethod === PaymentMethod.RAAST_P2M_QR
                  ? 'Generate Raast QR Code & Pay'
                  : \`Confirm Order (PKR \${finalTotalPkr.toLocaleString()})\`}`;
c = c.replace(btnStr, "                Confirm Order (PKR {finalTotalPkr.toLocaleString()})");

fs.writeFileSync('apps/web/src/app/checkout/page.tsx', c, 'utf-8');
