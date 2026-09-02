"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { PaymentMethod, CheckoutQuoteResponse } from "@waw/types";
import {
  ShieldCheck,
  Truck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import {
  fetchCheckoutQuote,
  createOrderApi,
  initiatePaymentApi,
} from "@/lib/api";

const PK_CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
  "Hyderabad",
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, paymentMethod, setPaymentMethod, clearCart, selectedCity } =
    useCartStore();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: selectedCity || "Lahore",
    province: "Punjab",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<CheckoutQuoteResponse | null>(
    null,
  );
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountPkr: number;
    description: string;
  } | null>(null);
  const [voucherError, setVoucherError] = useState("");

  // 1. Fetch Server-Authoritative Quote on Cart / Form change
  useEffect(() => {
    if (items.length === 0) return;

    let isMounted = true;
    async function loadQuote() {
      try {
        setQuoteLoading(true);
        setQuoteError(null);
        const quote = await fetchCheckoutQuote({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          shippingCity: formData.city,
          paymentMethod,
          couponCode: appliedVoucher?.code,
        });
        if (isMounted) {
          setQuoteData(quote);
          if (quote.couponDiscountPkr > 0 && appliedVoucher) {
            setAppliedVoucher((prev) =>
              prev ? { ...prev, discountPkr: quote.couponDiscountPkr } : null,
            );
          }
        }
      } catch (err: any) {
        if (isMounted)
          setQuoteError(err.message || "Unable to calculate live pricing");
      } finally {
        if (isMounted) setQuoteLoading(false);
      }
    }

    loadQuote();
    return () => {
      isMounted = false;
    };
  }, [items, formData.city, paymentMethod, appliedVoucher]);

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    setVoucherError("");
    const code = voucherInput.trim().toUpperCase();

    if (!code) return;
    setAppliedVoucher({
      code,
      discountPkr: 0,
      description: `Promo Code ${code}`,
    });
    setVoucherInput("");
  };

  const finalTotalPkr = quoteData?.totalPkr || 0;
  const subtotalPkr = quoteData?.subtotalPkr || 0;
  const shippingFeePkr = quoteData?.shippingFeePkr || 0;
  const codFeePkr = quoteData?.codFeePkr || 0;
  const discountAmount = quoteData?.couponDiscountPkr || 0;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteData?.quoteToken) {
      setQuoteError(
        "Please wait for the live price quote to finish calculating.",
      );
      return;
    }

    setIsSubmitting(true);
    setQuoteError(null);

    try {
      const orderResult = await createOrderApi({
        quoteToken: quoteData.quoteToken,
        buyerName: formData.fullName,
        buyerPhone: formData.phone,
        shippingAddress: formData.address,
        shippingCity: formData.city,
        shippingProvince: formData.province,
        paymentMethod,
        notes: formData.notes,
      });

      const orderId = orderResult.orderId;

      if (
        paymentMethod === PaymentMethod.XPAY_CARD ||
        paymentMethod === PaymentMethod.XPAY_WALLET_JAZZCASH ||
        paymentMethod === PaymentMethod.XPAY_WALLET_EASYPAISA
      ) {
        const paymentSession = await initiatePaymentApi({
          orderId,
          paymentMethod,
          customerPhone: formData.phone,
          returnUrl: `${window.location.origin}/orders/${orderId}`,
        });

        if (paymentSession.checkoutUrl) {
          clearCart();
          window.location.href = paymentSession.checkoutUrl;
          return;
        }
      }

      // COD or default success
      clearCart();
      router.push(`/orders/${orderId}`);
    } catch (err: any) {
      setQuoteError(
        err.message || "Failed to complete order placement. Please try again.",
      );
      setIsSubmitting(false);
    }
  };
  if (items.length === 0) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
          <Truck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">
          Your Cart is Empty
        </h1>
        <p className="text-sm text-slate-500">
          Explore thousands of verified products from top artisans and brands
          across Pakistan.
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
          100% Secure Payments & PostEx Delivery
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
                <label className="text-xs font-bold text-slate-700">
                  Recipient Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  WhatsApp Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+92 300 1234567"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Complete Street Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">City</label>
                <select
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
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
                <label className="text-xs font-bold text-slate-700">
                  Province
                </label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) =>
                    setFormData({ ...formData, province: e.target.value })
                  }
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
              {/* Option 2: PostEx XPay - Debit / Credit Cards */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.XPAY_CARD
                    ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === PaymentMethod.XPAY_CARD}
                  onChange={() => setPaymentMethod(PaymentMethod.XPAY_CARD)}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span>
                      Debit / Credit Cards (Visa, Mastercard & PayPak)
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Save PKR 100
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Powered by PostEx XPay 256-bit encrypted checkout.
                  </p>
                </div>
              </label>

              {/* Option 3: PostEx XPay - JazzCash */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.XPAY_WALLET_JAZZCASH
                    ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === PaymentMethod.XPAY_WALLET_JAZZCASH}
                  onChange={() =>
                    setPaymentMethod(PaymentMethod.XPAY_WALLET_JAZZCASH)
                  }
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="font-black text-sm text-slate-900">
                    JazzCash Mobile Account
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorize instant payment via PostEx XPay using your
                    JazzCash MPIN.
                  </p>
                </div>
              </label>

              {/* Option 4: PostEx XPay - Easypaisa */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.XPAY_WALLET_EASYPAISA
                    ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={
                    paymentMethod === PaymentMethod.XPAY_WALLET_EASYPAISA
                  }
                  onChange={() =>
                    setPaymentMethod(PaymentMethod.XPAY_WALLET_EASYPAISA)
                  }
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="font-black text-sm text-slate-900">
                    Easypaisa Mobile Wallet
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Approve instant OTP payment via PostEx XPay in your
                    Easypaisa app.
                  </p>
                </div>
              </label>

              {/* Option 5: Cash on Delivery */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.COD
                    ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20"
                    : "border-slate-200 hover:bg-slate-50"
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
                    Pay cash directly to the PostEx delivery rider upon parcel
                    inspection.
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
              <span>Processing Order...</span>
            ) : (
              <span>Confirm Order (PKR {finalTotalPkr.toLocaleString()})</span>
            )}
          </button>
        </form>

        {/* Right Column: Order Summary (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <h2 className="font-black text-base text-slate-950 border-b border-slate-100 pb-3">
              Order Summary ({items.length}{" "}
              {items.length === 1 ? "item" : "items"})
            </h2>

            {/* Item Mini List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="font-bold text-slate-900 shrink-0">
                      {item.quantity}x
                    </span>
                    <span className="text-slate-700 truncate">
                      {item.title}
                    </span>
                  </div>
                  <span className="font-black text-slate-900 shrink-0">
                    PKR {(item.pricePkr * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Voucher Box */}
            <form
              onSubmit={handleApplyVoucher}
              className="space-y-2 pt-2 border-t border-slate-100"
            >
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
              {voucherError && (
                <div className="text-[11px] font-bold text-rose-600">
                  {voucherError}
                </div>
              )}
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
              {quoteLoading ? (
                <div className="py-4 text-center text-slate-400 animate-pulse text-xs">
                  Calculating live server quote & PostEx delivery fees...
                </div>
              ) : (
                <>
                  {quoteError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{quoteError}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Items Subtotal</span>
                    <span className="font-bold text-slate-900">
                      PKR {subtotalPkr.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>PostEx Express Delivery</span>
                    {shippingFeePkr === 0 ? (
                      <span className="font-black text-emerald-600">
                        FREE (Orders &gt; 5,000)
                      </span>
                    ) : (
                      <span className="font-bold text-slate-900">
                        PKR {shippingFeePkr}
                      </span>
                    )}
                  </div>

                  {codFeePkr > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>COD Handling Surcharge</span>
                      <span className="font-bold">+PKR {codFeePkr}</span>
                    </div>
                  )}

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Voucher Discount</span>
                      <span>-PKR {discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline text-sm">
                    <span className="font-black text-slate-950">
                      Total Payable
                    </span>
                    <span className="text-xl font-black text-slate-950">
                      PKR {finalTotalPkr.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Guarantee Badge */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 space-y-1">
              <div className="font-black flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Secure Payments</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium">
                Your payment is processed securely via our trusted payment
                gateway.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── State Bank Raast P2M Dynamic QR Modal ─────────────────────────── */}
    </div>
  );
}
