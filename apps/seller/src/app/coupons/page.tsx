'use client';

import { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Percent,
  DollarSign,
  Truck,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
} from 'lucide-react';
import { fetchSellerCoupons, createSellerCoupon, SellerCoupon } from '../../lib/api';

export default function SellerCouponsPage() {
  const [coupons, setCoupons] = useState<SellerCoupon[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_PKR' | 'FREE_SHIPPING'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('10');
  const [minSpendPkr, setMinSpendPkr] = useState('3000');
  const [maxDiscountPkr, setMaxDiscountPkr] = useState('1000');
  const [maxUses, setMaxUses] = useState('100');

  useEffect(() => {
    fetchSellerCoupons().then(setCoupons);
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await createSellerCoupon({
      code: code.toUpperCase(),
      discountType,
      discountValue: parseInt(discountValue, 10),
      minSpendPkr: parseInt(minSpendPkr, 10),
      maxDiscountPkr: maxDiscountPkr ? parseInt(maxDiscountPkr, 10) : undefined,
      maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
    });
    setCoupons([created, ...coupons]);
    setShowCreate(false);
    setCode('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Seller-Scoped Coupons & Deals</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create custom promo codes that apply exclusively to items from your store.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Coupon
        </button>
      </div>

      {/* Scope Policy Callout */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
        <div className="font-bold flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" /> Seller-Funded Promo Policy
        </div>
        <p className="text-[11px] text-slate-300">
          Coupons created here will only discount items in the buyer&apos;s cart that originate from your store. The discount is absorbed from your payout.
        </p>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-4 text-xs">
          <h3 className="font-bold text-white text-sm">Configure New Store Promo Code</h3>
          <form onSubmit={handleCreateCoupon} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Coupon Code</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. FLASH15"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono uppercase focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Discount Type</label>
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="PERCENTAGE">Percentage (%) Off</option>
                  <option value="FIXED_PKR">Fixed PKR Off</option>
                  <option value="FREE_SHIPPING">Free Shipping Waived</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Discount Value</label>
                <input
                  required
                  type="number"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Min Spend (PKR)</label>
                <input
                  type="number"
                  value={minSpendPkr}
                  onChange={e => setMinSpendPkr(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Max Cap (PKR - Optional)</label>
                <input
                  type="number"
                  value={maxDiscountPkr}
                  onChange={e => setMaxDiscountPkr(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Max Uses Limit</label>
                <input
                  type="number"
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black transition-colors"
            >
              Activate Coupon Now
            </button>
          </form>
        </div>
      )}

      {/* Active Coupons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map(coupon => (
          <div key={coupon.id} className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-black text-amber-400 text-lg tracking-wider">{coupon.code}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <div className="text-xl font-bold text-white">
              {coupon.discountType === 'PERCENTAGE' && `${coupon.discountValue}% OFF`}
              {coupon.discountType === 'FIXED_PKR' && `PKR ${coupon.discountValue} OFF`}
              {coupon.discountType === 'FREE_SHIPPING' && 'FREE DELIVERY'}
            </div>

            <div className="text-[11px] text-slate-400 space-y-1">
              <div>Min. Spend: PKR {coupon.minSpendPkr.toLocaleString()}</div>
              <div>Redeemed: {coupon.currentUses} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''} times</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
