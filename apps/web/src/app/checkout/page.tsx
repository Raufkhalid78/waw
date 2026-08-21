'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { PaymentMethod } from '@waw/types';
import { ShieldCheck, Truck, MessageSquare, CheckCircle2, Lock, ArrowLeft, QrCode, Sparkles, Smartphone } from 'lucide-react';
import Link from 'next/link';

const PK_CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, paymentMethod, setPaymentMethod, getSummary, clearCart, selectedCity } = useCartStore();
  const summary = getSummary();

  const [formData, setFormData] = useState({
    fullName: 'Ali Khan',
    phone: '+923001234567',
    address: 'House 42, Street 8, Phase 5, DHA',
    city: selectedCity || 'Lahore',
    province: 'Punjab',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRaastQrModal, setShowRaastQrModal] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discountPkr: number; description: string } | null>(null);
  const [voucherError, setVoucherError] = useState('');

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    setVoucherError('');
    const code = voucherInput.trim().toUpperCase();

    if (code === 'AZADI2026' || code === 'WAWFIRST') {
      setAppliedVoucher({ code, discountPkr: 500, description: 'PKR 500 Promo Discount Applied' });
      setVoucherInput('');
    } else {
      setVoucherError('Invalid promo code. Try AZADI2026');
    }
  };

  const discountAmount = appliedVoucher ? appliedVoucher.discountPkr : 0;
  const finalTotalPkr = Math.max(0, summary.totalPkr - discountAmount);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (paymentMethod === PaymentMethod.RAAST_P2M_QR) {
      setTimeout(() => {
        setIsSubmitting(false);
        setShowRaastQrModal(true);
      }, 600);
      return;
    }

    setTimeout(() => {
      setIsSubmitting(false);
      clearCart();
      const generatedOrderId = `WAW-PK-${Math.floor(10000 + Math.random() * 90000)}`;
      router.push(`/orders/${generatedOrderId}`);
    }, 1200);
  };

  const handleRaastPaid = () => {
    clearCart();
    const generatedOrderId = `WAW-PK-${Math.floor(10000 + Math.random() * 90000)}`;
    router.push(`/orders/${generatedOrderId}`);
  };

  if (items.length === 0) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
          <Truck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Your Cart is Empty</h1>
        <p className="text-sm text-slate-500">
          Explore thousands of verified products from top artisans and brands across Pakistan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-500 transition-colors text-xs"
        >
          Return to Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-10 space-y-8">
      {/* ── Breadcrumb & Title ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cart</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2.5">
          <Lock className="w-6 h-6 text-emerald-600" />
          <span>Secure Checkout</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          100% Protected by State Bank of Pakistan (SBP) Escrow & PostEx Express Delivery
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Payment (7 Cols) */}
        <form onSubmit={handlePlaceOrder} className="lg:col-span-7 space-y-6">
          {/* Shipping Address */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="font-black text-base text-slate-950 flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-500" />
              <span>1. Delivery Details (Pakistan)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Recipient Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">WhatsApp Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+92 300 1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">Complete Street Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">City</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium cursor-pointer"
                >
                  {PK_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Province</label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                />
              </div>
            </div>
          </div>

          {/* Payment Selection */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="font-black text-base text-slate-950 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              <span>2. State Bank Regulated Payment Options</span>
            </h2>

            <div className="space-y-3">
              {/* Option 1: Flagship State Bank Raast P2M Instant QR */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.RAAST_P2M_QR
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-400/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
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
              </label>

              {/* Option 2: Debit / Credit Card */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.SAFEPAY_CARD
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === PaymentMethod.SAFEPAY_CARD}
                  onChange={() => setPaymentMethod(PaymentMethod.SAFEPAY_CARD)}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span>Debit / Credit Cards (Visa, Mastercard & PayPak)</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Save PKR 100
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    SafePay encrypted card checkout with SBP Escrow protection.
                  </p>
                </div>
              </label>

              {/* Option 3: JazzCash */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.PAYFAST_WALLET_JAZZCASH
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === PaymentMethod.PAYFAST_WALLET_JAZZCASH}
                  onChange={() => setPaymentMethod(PaymentMethod.PAYFAST_WALLET_JAZZCASH)}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="font-black text-sm text-slate-900">JazzCash Mobile Account</div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorize payment using your JazzCash Mobile Account PIN.
                  </p>
                </div>
              </label>

              {/* Option 4: Easypaisa */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.PAYFAST_WALLET_EASYPAISA
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === PaymentMethod.PAYFAST_WALLET_EASYPAISA}
                  onChange={() => setPaymentMethod(PaymentMethod.PAYFAST_WALLET_EASYPAISA)}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="font-black text-sm text-slate-900">Easypaisa Mobile Wallet</div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Approve OTP prompt in your Easypaisa app.
                  </p>
                </div>
              </label>

              {/* Option 5: Cash on Delivery */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.COD
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === PaymentMethod.COD}
                  onChange={() => setPaymentMethod(PaymentMethod.COD)}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span>Cash on Delivery (PostEx Rider Collection)</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                      +PKR 100 Handling
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pay cash directly to the PostEx delivery rider upon parcel inspection.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Processing Order in Escrow...</span>
            ) : (
              <span>
                {paymentMethod === PaymentMethod.RAAST_P2M_QR
                  ? 'Generate Raast QR Code & Pay'
                  : `Confirm Order (PKR ${finalTotalPkr.toLocaleString()})`}
              </span>
            )}
          </button>
        </form>

        {/* Right Column: Order Summary (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <h2 className="font-black text-base text-slate-950 border-b border-slate-100 pb-3">
              Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
            </h2>

            {/* Item Mini List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="font-bold text-slate-900 shrink-0">{item.quantity}x</span>
                    <span className="text-slate-700 truncate">{item.title}</span>
                  </div>
                  <span className="font-black text-slate-900 shrink-0">
                    PKR {(item.pricePkr * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Voucher Box */}
            <form onSubmit={handleApplyVoucher} className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo Code (AZADI2026)"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-bold outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-colors"
                >
                  Apply
                </button>
              </div>
              {voucherError && <div className="text-[11px] font-bold text-rose-600">{voucherError}</div>}
              {appliedVoucher && (
                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg flex items-center justify-between">
                  <span>✅ {appliedVoucher.description}</span>
                  <button
                    type="button"
                    onClick={() => setAppliedVoucher(null)}
                    className="text-slate-400 hover:text-slate-600 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
            </form>

            {/* Breakdown */}
            <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-slate-900">PKR {summary.subtotalPkr.toLocaleString()}</span>
              </div>

              <div className="flex justify-between">
                <span>PostEx Express Delivery</span>
                {summary.isFreeDelivery ? (
                  <span className="font-black text-emerald-600">FREE (Orders &gt; 5,000)</span>
                ) : (
                  <span className="font-bold text-slate-900">PKR {summary.shippingPkr}</span>
                )}
              </div>

              {summary.codFeePkr > 0 && (
                <div className="flex justify-between text-amber-800">
                  <span>COD Handling Surcharge</span>
                  <span className="font-bold">+PKR {summary.codFeePkr}</span>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Voucher Discount</span>
                  <span>-PKR {discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline text-sm">
                <span className="font-black text-slate-950">Total Payable</span>
                <span className="text-xl font-black text-slate-950">
                  PKR {finalTotalPkr.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Guarantee Badge */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 space-y-1">
              <div className="font-black flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>SBP 100% Escrow Protection</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium">
                Your payment is held in an SBP-regulated escrow account until you receive and verify your parcel from PostEx.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── State Bank Raast P2M Dynamic QR Modal ─────────────────────────── */}
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
              <h3 className="text-xl font-black text-slate-950">Scan & Pay via Mobile App</h3>
              <p className="text-xs text-slate-500 font-medium">
                Open HBL, Meezan, Nayapay, Sadapay, Easypaisa, or JazzCash and scan below:
              </p>
            </div>

            {/* Dynamic QR Display */}
            <div className="bg-[#FEF600] p-4 rounded-3xl max-w-xs mx-auto border-2 border-slate-950 shadow-md">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
                  `pk.gov.sbp.raast:WAW-PAY-PKR-${finalTotalPkr}-REF`
                )}&color=0f172a&bgcolor=fef600&margin=2`}
                alt="State Bank Raast QR"
                className="w-56 h-56 mx-auto rounded-xl shadow-xs"
              />
              <div className="text-[11px] font-black text-slate-950 mt-2 tracking-wider uppercase">
                Merchant: waw.market@hbl
              </div>
            </div>

            <div className="text-base font-black text-slate-950">
              Payable Amount: <span className="text-emerald-600">PKR {finalTotalPkr.toLocaleString()}</span>
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
      )}
    </div>
  );
}
