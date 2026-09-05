"use client";

import { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import {
  Trash2, Plus, Minus, Truck, ShieldCheck, CreditCard, Banknote,
  ArrowRight, Zap, Tag, X, CheckCircle2,
} from "lucide-react";
import { MARKETPLACE_CONFIG, PaymentMethod, SellerType } from "@waw/types";
import { FadeIn } from "@/components/Motion";

export default function CartPage() {
  const { items, paymentMethod, setPaymentMethod, updateQuantity, removeItem, getSummary } = useCartStore();
  const summary = getSummary();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPkr: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");
      const res = await fetch(`${API_BASE_URL}/api/checkout/apply-coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          couponCode: code,
          items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Invalid coupon" }));
        setCouponError(err.error || "Invalid coupon code");
        return;
      }
      const data = await res.json();
      setAppliedCoupon({ code, discountPkr: data.discountPkr || 0 });
      setCouponCode("");
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const progressPercentage = Math.min(100, Math.round(
    (summary.subtotalPkr / MARKETPLACE_CONFIG.FREE_DELIVERY_THRESHOLD_PKR) * 100
  ));

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 py-6 space-y-6">
      <FadeIn>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Review your order before checkout</p>
        </div>
        <Link href="/" className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      </FadeIn>

      {/* Free Delivery Progress */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Truck className="w-4 h-4 text-amber-600" />
            {summary.isFreeDelivery ? (
              <span className="text-green-700 font-semibold">Free delivery unlocked!</span>
            ) : (
              <span>
                Add <span className="font-bold text-amber-700">PKR {summary.amountNeededForFreeDeliveryPkr.toLocaleString()}</span> more for free delivery
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-gray-500">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-amber-400 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-gray-900 mb-1">Your cart is empty</h2>
          <p className="text-sm text-gray-500 mb-4">Browse products and add them to your cart.</p>
          <Link href="/" className="inline-block bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-8 space-y-3">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId || "default"}`}
                className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
              >
                <img
                  src={item.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' fill='%23f1f5f9'%3E%3Crect width='80' height='80' rx='8'/%3E%3C/svg%3E"}
                  alt={item.title}
                  className="w-16 h-16 rounded-lg object-cover border border-gray-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] text-gray-500">{item.storeName || "Waw Marketplace"}</span>
                    {item.sellerType === SellerType.FIRST_PARTY && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded flex items-center gap-0.5">
                        <Zap className="w-2 h-2" /> Express
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 truncate">{item.title}</h3>
                  {item.variantName && (
                    <div className="text-xs text-gray-500 mt-0.5">{item.variantName}</div>
                  )}
                  <div className="text-sm font-bold text-gray-900 mt-0.5">PKR {item.pricePkr.toLocaleString()}</div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-semibold text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-sm font-bold text-gray-900 min-w-[80px] text-right">
                    PKR {(item.pricePkr * item.quantity).toLocaleString()}
                  </div>
                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 sticky top-4">
              <h2 className="text-sm font-bold text-gray-900 pb-3 border-b border-gray-100">Order Summary</h2>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod(PaymentMethod.XPAY_CARD)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      paymentMethod !== PaymentMethod.COD
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-700" />
                      <span className="text-xs font-semibold text-gray-900">Online Pay</span>
                    </div>
                    <div className="text-[11px] text-green-700 font-medium mt-1">Save PKR 100</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod(PaymentMethod.COD)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      paymentMethod === PaymentMethod.COD
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-gray-700" />
                      <span className="text-xs font-semibold text-gray-900">Cash on Delivery</span>
                    </div>
                    <div className="text-[11px] text-amber-700 font-medium mt-1">+PKR 100 fee</div>
                  </button>
                </div>
              </div>

              {/* Coupon Input */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Promo / Coupon Code
                </label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-bold text-green-700">{appliedCoupon.code}</span>
                      {appliedCoupon.discountPkr > 0 && (
                        <span className="text-[10px] font-bold text-green-600">-PKR {appliedCoupon.discountPkr.toLocaleString()}</span>
                      )}
                    </div>
                    <button
                      onClick={() => setAppliedCoupon(null)}
                      className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 text-white rounded-xl text-xs font-black transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {couponLoading ? "..." : "Apply"}
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="text-[11px] font-bold text-red-500">{couponError}</p>
                )}
              </div>

              {/* Pricing */}
              <div className="space-y-2 text-sm pt-2 border-t border-gray-100">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">PKR {summary.subtotalPkr.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  {summary.isFreeDelivery ? (
                    <span className="text-green-700 font-semibold">FREE</span>
                  ) : (
                    <span className="font-medium text-gray-900">PKR {summary.shippingPkr}</span>
                  )}
                </div>
                {summary.codFeePkr > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>COD Fee</span>
                    <span className="font-medium text-amber-700">+PKR {summary.codFeePkr}</span>
                  </div>
                )}
                {summary.savingsOnlinePaymentPkr > 0 && (
                  <div className="p-2 bg-green-50 text-green-800 rounded-lg text-xs font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                    Saving PKR 100 by paying online
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>PKR {summary.totalPkr.toLocaleString()}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
