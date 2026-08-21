'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { Trash2, Plus, Minus, Truck, Sparkles, CreditCard, Banknote, ShieldCheck, ArrowRight, Store, Zap } from 'lucide-react';
import { MARKETPLACE_CONFIG, PaymentMethod, SellerType } from '@waw/types';

export default function CartPage() {
  const { items, paymentMethod, setPaymentMethod, updateQuantity, removeItem, getSummary } = useCartStore();
  const summary = getSummary();

  const progressPercentage = Math.min(
    100,
    Math.round((summary.subtotalPkr / MARKETPLACE_CONFIG.FREE_DELIVERY_THRESHOLD_PKR) * 100)
  );

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Shopping Cart ({items.length} items)
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Review your order and select your payment method</p>
        </div>

        <Link
          href="/"
          className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Free Delivery Dynamic Progress Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border-2 border-amber-300 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Truck className="w-5 h-5 text-amber-600" />
            {summary.isFreeDelivery ? (
              <span className="text-emerald-700 font-extrabold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                🎉 You unlocked FREE Nationwide Delivery! (Save PKR {MARKETPLACE_CONFIG.DEFAULT_SHIPPING_FEE_PKR})
              </span>
            ) : (
              <span>
                Add <strong className="text-amber-700 font-extrabold">PKR {summary.amountNeededForFreeDeliveryPkr.toLocaleString()}</strong> more to get <strong>FREE Delivery</strong>!
              </span>
            )}
          </div>
          <span className="text-xs font-black text-slate-700">{progressPercentage}%</span>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Truck className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Your cart is empty</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Discover products from 2,000+ verified Pakistani shops and add them to your cart.
          </p>
          <Link
            href="/"
            className="inline-block bg-amber-400 hover:bg-amber-500 text-slate-950 px-8 py-3 rounded-full text-xs font-black shadow-md transition-all"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-8 space-y-4">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId || 'default'}`}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs hover:border-amber-400 transition-all"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                    alt={item.title}
                    className="w-20 h-20 rounded-xl object-cover border border-slate-100 shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <Store className="w-3 h-3 text-slate-400" />
                        {item.storeName || (item.sellerType === 'FIRST_PARTY' ? 'Waw Official Hub' : 'Marketplace Shop')}
                      </span>
                      {item.sellerType === SellerType.FIRST_PARTY && (
                        <span className="text-[9px] font-black uppercase text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" /> Express
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{item.title}</h3>
                    <div className="font-black text-sm text-slate-950">
                      PKR {item.pricePkr.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                  {/* Quantity Controller */}
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                      className="p-2 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-bold text-slate-900 min-w-[24px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                      className="p-2 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-base text-slate-950">
                      PKR {(item.pricePkr * item.quantity).toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary & Payment Mode Selection */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
              <h2 className="font-black text-base text-slate-950 border-b border-slate-100 pb-3">
                Order Summary
              </h2>

              {/* Payment Mode Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Choose Payment Method:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod(PaymentMethod.SAFEPAY_CARD)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      paymentMethod !== PaymentMethod.COD
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-900" />
                      <span className="text-xs font-bold text-slate-900">Online Pay</span>
                    </div>
                    <div className="text-[10px] text-emerald-700 font-extrabold mt-1">
                      ✨ Save PKR 100
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod(PaymentMethod.COD)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      paymentMethod === PaymentMethod.COD
                        ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-bold text-slate-900">Cash on Del.</span>
                    </div>
                    <div className="text-[10px] text-amber-800 font-medium mt-1">
                      +PKR 100 Surcharge
                    </div>
                  </button>
                </div>
              </div>

              {/* Pricing Breakdown Lines */}
              <div className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">PKR {summary.subtotalPkr.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Nationwide Shipping</span>
                  {summary.isFreeDelivery ? (
                    <span className="text-emerald-600 font-extrabold">FREE (Above Rs. 5k)</span>
                  ) : (
                    <span className="font-bold text-slate-900">PKR {summary.shippingPkr}</span>
                  )}
                </div>

                {summary.codFeePkr > 0 && (
                  <div className="flex justify-between items-center text-amber-800">
                    <span>COD Handling Fee</span>
                    <span className="font-bold">+PKR {summary.codFeePkr}</span>
                  </div>
                )}

                {summary.savingsOnlinePaymentPkr > 0 && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>You are saving PKR 100 by paying online!</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black text-slate-950 pt-3 border-t border-slate-200">
                  <span>Total Payable</span>
                  <span className="text-amber-600 text-lg">PKR {summary.totalPkr.toLocaleString()}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="w-full bg-slate-950 hover:bg-amber-400 hover:text-slate-950 text-white font-black py-4 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <span>PROCEED TO CHECKOUT</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
