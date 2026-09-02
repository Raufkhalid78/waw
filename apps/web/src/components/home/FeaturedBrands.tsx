"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Sparkles,
  Star,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Flame,
  Award,
  ChevronRight,
  Store,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { fetchStores, type StoreSummary } from "@/lib/api";

const AVATAR_COLORS = [
  "bg-gradient-to-br from-amber-600 to-amber-900",
  "bg-gradient-to-br from-sky-500 to-blue-700",
  "bg-gradient-to-br from-rose-600 to-pink-800",
  "bg-gradient-to-br from-emerald-600 to-teal-800",
  "bg-gradient-to-br from-violet-600 to-purple-800",
  "bg-gradient-to-br from-orange-500 to-red-700",
];

export function FeaturedBrands() {
  const { language } = useCartStore();
  const isUrdu = language === "UR";
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStores()
      .then((data) => setStores(data.slice(0, 8)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || stores.length === 0) return null;

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8">
      <div className="relative bg-gradient-to-br from-slate-950 via-[#0B1120] to-slate-900 rounded-[32px] p-6 sm:p-8 lg:p-10 text-white shadow-2xl border border-slate-800/80 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black text-amber-300 tracking-wider uppercase shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>
                {isUrdu ? "ویریفائیڈ برانڈ مالز" : "Verified Brand Stores"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              {isUrdu
                ? "پاکستان کے تصدیق شدہ آفیشل اسٹورز"
                : "Verified Brand Stores & Artisan Hubs"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-2xl">
              {isUrdu
                ? "براہ راست تصدیق شدہ فیکٹری آؤٹ لیٹس اور مستند علاقائی دستکاری سے خریداری کریں۔"
                : "Shop directly with guaranteed manufacturer warranties and authentic provincial craftsmanship."}
            </p>
          </div>
          <Link
            href="/stores"
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg hover:scale-102 shrink-0 group cursor-pointer self-start md:self-auto"
          >
            <span>{isUrdu ? "تمام اسٹورز دیکھیں" : "Explore All Stores"}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-6">
          {stores.map((store, idx) => {
            const initials = store.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase();
            const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];

            return (
              <div
                key={store.id}
                className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-400/60 rounded-3xl p-5 flex flex-col justify-between space-y-4 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-14 h-14 rounded-2xl ${colorClass} text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0 group-hover:scale-105 transition-transform border border-white/10 overflow-hidden`}
                    >
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      {store.seller_type === "FIRST_PARTY" && (
                        <span className="inline-block bg-amber-400/10 text-amber-300 border border-amber-400/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          1P Official
                        </span>
                      )}
                      <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{(store.rating_average || 0).toFixed(1)}</span>
                        <span className="text-slate-500 font-normal">
                          ({store.rating_count || 0})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors truncate">
                        {store.name}
                      </h3>
                      {store.is_verified && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{store.city || "Pakistan"}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-300 font-semibold">
                        {store.productCount || 0} products
                      </span>
                    </div>
                    {store.description && (
                      <p className="text-[11px] text-slate-400/90 font-medium line-clamp-1">
                        {store.description}
                      </p>
                    )}
                  </div>
                </div>

                {store.topProducts && store.topProducts.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-rose-500" />
                      <span>Top Products</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {store.topProducts.map((item, i) => (
                        <div
                          key={i}
                          className="bg-slate-950 rounded-xl p-1.5 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col items-center text-center"
                        >
                          <div className="w-full aspect-square relative rounded-lg overflow-hidden bg-slate-900 mb-1">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">?</div>
                            )}
                          </div>
                          <span className="text-[10px] font-black text-amber-300 truncate w-full">
                            PKR {(item.pricePkr || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  href={`/store/${store.slug}`}
                  className="w-full py-2.5 bg-slate-800 hover:bg-amber-400 text-slate-200 hover:text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs group-hover:shadow-md cursor-pointer mt-1"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Visit Store</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="relative z-10 mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">
              100% Secure Checkout — 7-Day Hassle-Free Returns on All Verified Stores
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-amber-300">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Warranty</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400">
              24h Waw Express Priority Dispatch
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
