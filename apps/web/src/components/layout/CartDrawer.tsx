'use client';

import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { X, ShoppingBag, Trash2, ArrowRight, Truck, ShieldCheck, Zap, Plus, Minus } from 'lucide-react';
import Link from 'next/link';
import { SellerType } from '@waw/types';

export function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { items, removeItem, updateQuantity, getSummary } = useCartStore();
  const summary = getSummary();
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  if (!isOpen) return null;

  const freeDeliveryThreshold = 5000;
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - summary.subtotalPkr);
  const progressPercent = Math.min(100, Math.round((summary.subtotalPkr / freeDeliveryThreshold) * 100));

  const handleGoToCart = () => {
    onClose();
    router.push('/cart');
  };

  const handleGoToCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-slide-in">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold">Shopping Cart ({cartCount})</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Delivery Progress Bar */}
          <div className="p-4 bg-amber-50 border-b border-amber-200">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-600" />
                {remainingForFreeDelivery === 0 ? (
                  <span className="text-emerald-700 font-extrabold">🎉 You unlocked FREE Nationwide Delivery!</span>
                ) : (
                  <span>
                    Add <strong className="text-slate-950">PKR {remainingForFreeDelivery.toLocaleString()}</strong> more for FREE Delivery!
                  </span>
                )}
              </span>
              <span className="font-extrabold text-amber-900">{progressPercent}%</span>
            </div>
            <div className="w-full bg-amber-200/80 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Your cart is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Browse through thousands of verified Pakistani shops and add deals to your cart.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={`${item.productId}-${item.variantId || ''}`} className="pt-3 flex gap-3">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                    <img
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=200'}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                        {item.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.storeName}
                      </span>
                      {item.sellerType === SellerType.FIRST_PARTY && (
                        <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" />
                          EXPRESS
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-black text-slate-950">
                        PKR {item.pricePkr.toLocaleString()}
                      </span>

                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 py-1 text-xs font-bold text-slate-900 bg-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary & Checkout */}
          {items.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">PKR {summary.subtotalPkr.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping Fee</span>
                  {summary.shippingPkr === 0 ? (
                    <span className="font-bold text-emerald-600">FREE</span>
                  ) : (
                    <span className="font-bold text-slate-900">PKR {summary.shippingPkr.toLocaleString()}</span>
                  )}
                </div>
                <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-200">
                  <span>Estimated Total</span>
                  <span className="text-base text-amber-600">PKR {summary.totalPkr.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg text-[11px] text-emerald-800 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Save PKR 100 COD fee by paying online with Visa, Mastercard or Raast!</span>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoToCheckout}
                  className="w-full bg-slate-950 hover:bg-amber-400 hover:text-slate-950 text-white font-black py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <span>PROCEED TO CHECKOUT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleGoToCart}
                  className="w-full bg-white hover:bg-slate-100 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-200 transition-all cursor-pointer"
                >
                  <span>View & Edit Full Cart</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
