"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import {
  fetchSellerCoupons,
  createSellerCoupon,
  SellerCoupon,
} from "../../lib/api";

export default function SellerCouponsPage() {
  const [coupons, setCoupons] = useState<SellerCoupon[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<
    "PERCENTAGE" | "FIXED_PKR" | "FREE_SHIPPING"
  >("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("10");
  const [minSpendPkr, setMinSpendPkr] = useState("3000");
  const [maxDiscountPkr, setMaxDiscountPkr] = useState("1000");
  const [maxUses, setMaxUses] = useState("100");

  useEffect(() => {
    fetchSellerCoupons().then(setCoupons);
  }, []);

  // Client-side guard: validate before submit so NaN/invalid values are
  // never POSTed to the API.
  const validateForm = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      errs.code = "Coupon code is required";
    } else if (trimmedCode.length < 3 || trimmedCode.length > 20) {
      errs.code = "Code must be 3-20 characters";
    }
    const dv = parseFloat(discountValue);
    if (!Number.isFinite(dv) || dv <= 0) {
      errs.discountValue = "Discount value must be a number greater than 0";
    } else if (discountType === "PERCENTAGE" && dv > 100) {
      errs.discountValue = "Percentage discount cannot exceed 100";
    }
    if (minSpendPkr.trim() !== "") {
      const ms = parseFloat(minSpendPkr);
      if (!Number.isFinite(ms) || ms < 0) {
        errs.minSpendPkr = "Min spend must be 0 or more";
      }
    }
    if (maxDiscountPkr.trim() !== "") {
      const md = parseFloat(maxDiscountPkr);
      if (!Number.isFinite(md) || md <= 0) {
        errs.maxDiscountPkr = "Max cap must be greater than 0";
      }
    }
    if (maxUses.trim() !== "") {
      const mu = parseFloat(maxUses);
      if (!Number.isFinite(mu) || mu <= 0) {
        errs.maxUses = "Max uses must be greater than 0";
      }
    }
    return errs;
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setCreating(true);
    setError("");
    try {
      const created = await createSellerCoupon({
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: parseInt(discountValue, 10),
        // Empty min spend is treated as 0 (the API accepts nonnegative).
        minSpendPkr:
          minSpendPkr.trim() === "" ? 0 : parseInt(minSpendPkr, 10),
        maxDiscountPkr: maxDiscountPkr.trim() === "" ? undefined : parseInt(maxDiscountPkr, 10),
        maxUses: maxUses.trim() === "" ? undefined : parseInt(maxUses, 10),
      });
      setCoupons([created, ...coupons]);
      setShowCreate(false);
      setCode("");
    } catch (err: any) {
      setError(err.message || "Failed to create coupon. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  // Real status: expired → EXPIRED, usage-capped → FULLY REDEEMED,
  // inactive → PAUSED, else ACTIVE.
  const couponStatus = (c: SellerCoupon): { label: string; cls: string } => {
    if (c.expiresAt && new Date(c.expiresAt) < new Date()) {
      return { label: "EXPIRED", cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
    }
    if (c.maxUses && c.currentUses >= c.maxUses) {
      return { label: "FULLY REDEEMED", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    }
    if (!c.isActive) {
      return { label: "PAUSED", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    }
    return { label: "ACTIVE", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Seller-Scoped Coupons & Deals
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create custom promo codes that apply exclusively to items from your
            store.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(!showCreate);
            setFieldErrors({});
          }}
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
          Coupons created here will only discount items in the buyer&apos;s cart
          that originate from your store. The discount is absorbed from your
          payout.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-4 text-xs">
          <h3 className="font-bold text-white text-sm">
            Configure New Store Promo Code
          </h3>
          <form onSubmit={handleCreateCoupon} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Coupon Code
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. FLASH15"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className={`w-full px-3.5 py-2 rounded-xl bg-slate-900 border ${
                    fieldErrors.code ? "border-red-500/60" : "border-slate-700"
                  } text-white font-mono uppercase focus:outline-none focus:border-amber-400`}
                />
                {fieldErrors.code && (
                  <p className="text-[10px] text-red-400 mt-1">{fieldErrors.code}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Discount Type
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="PERCENTAGE">Percentage (%) Off</option>
                  <option value="FIXED_PKR">Fixed PKR Off</option>
                  <option value="FREE_SHIPPING">Free Shipping Waived</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Discount Value
                </label>
                <input
                  required
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl bg-slate-900 border ${
                    fieldErrors.discountValue ? "border-red-500/60" : "border-slate-700"
                  } text-white focus:outline-none focus:border-amber-400`}
                />
                {fieldErrors.discountValue && (
                  <p className="text-[10px] text-red-400 mt-1">{fieldErrors.discountValue}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Min Spend (PKR)
                </label>
                <input
                  type="number"
                  value={minSpendPkr}
                  onChange={(e) => setMinSpendPkr(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Max Cap (PKR - Optional)
                </label>
                <input
                  type="number"
                  value={maxDiscountPkr}
                  onChange={(e) => setMaxDiscountPkr(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Max Uses Limit
                </label>
                <input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black transition-colors disabled:opacity-50"
            >
              {creating ? "Activating..." : "Activate Coupon Now"}
            </button>
          </form>
        </div>
      )}

      {/* Active Coupons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.length === 0 && (
          <div className="col-span-full p-8 rounded-2xl bg-[#0f172a] border border-slate-800 text-center">
            <Tag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No coupons yet — create your first promo code above.</p>
          </div>
        )}
        {coupons.map((coupon) => {
          const status = couponStatus(coupon);
          return (
            <div
              key={coupon.id}
              className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-amber-400 text-lg tracking-wider">
                  {coupon.code}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.cls}`}>
                  {status.label}
                </span>
              </div>

              <div className="text-xl font-bold text-white">
                {coupon.discountType === "PERCENTAGE" &&
                  `${coupon.discountValue}% OFF`}
                {coupon.discountType === "FIXED_PKR" &&
                  `PKR ${coupon.discountValue} OFF`}
                {coupon.discountType === "FREE_SHIPPING" && "FREE DELIVERY"}
              </div>

              <div className="text-[11px] text-slate-400 space-y-1">
                <div>Min. Spend: PKR {coupon.minSpendPkr.toLocaleString()}</div>
                <div>
                  Redeemed: {coupon.currentUses}{" "}
                  {coupon.maxUses ? `/ ${coupon.maxUses}` : ""} times
                </div>
                {coupon.expiresAt && (
                  <div>Expires: {new Date(coupon.expiresAt).toLocaleDateString("en-PK")}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
