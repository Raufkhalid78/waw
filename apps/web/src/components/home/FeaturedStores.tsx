"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Store,
  Star,
  CheckCircle2,
  ArrowRight,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Award,
  Flame,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useLanguage } from "@/components/ui/LanguageProvider";
import { SellerType } from "@waw/types";
import { fetchStores, type StoreSummary } from "@/lib/api";

const AVATAR_COLORS = [
  "bg-gradient-to-br from-amber-500 to-amber-700",
  "bg-gradient-to-br from-sky-500 to-blue-700",
  "bg-gradient-to-br from-rose-500 to-pink-700",
  "bg-gradient-to-br from-emerald-500 to-teal-700",
  "bg-gradient-to-br from-violet-500 to-purple-700",
  "bg-gradient-to-br from-orange-500 to-red-700",
];

const BANNER_GRADIENTS = [
  "from-amber-900 to-amber-950",
  "from-sky-900 to-slate-950",
  "from-rose-900 to-slate-950",
  "from-emerald-900 to-slate-950",
];

export function FeaturedStores() {
  const { addItem } = useCartStore();
  const { language } = useLanguage();
  const isUrdu = language === "ur";
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStores()
      .then((data) => setStores(data.slice(0, 8)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || stores.length === 0) return null;

  const topStores = stores.slice(0, 4);
  const gridStores = stores.slice(4, 8);

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-6">
      {/* Featured Stores — Dark Hero Cards */}
      <div className="relative bg-gradient-to-br from-slate-950 via-[#0B1120] to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl overflow-hidden mb-8">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/25 px-3 py-1 rounded-full text-xs font-bold text-amber-300 mb-2">
              <Store className="w-3.5 h-3.5" />
              {isUrdu ? "ویریفائیڈ اسٹورز" : "Verified Stores"}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {isUrdu ? "پاکستان کے مقبول اسٹورز" : "Featured Verified Stores"}
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {isUrdu
                ? "مستند فیکٹری آؤٹ لیٹس اور دستکاری سے خریداری کریں"
                : "Shop directly from verified brands and artisan hubs"}
            </p>
          </div>
          <Link
            href="/stores"
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all shrink-0 self-start"
          >
            {isUrdu ? "تمام اسٹورز" : "View All Stores"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topStores.map((store, idx) => {
            const initials = store.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
            const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const bannerGrad = BANNER_GRADIENTS[idx % BANNER_GRADIENTS.length];

            return (
              <div
                key={store.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-amber-400/50 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 group"
              >
                {/* Banner */}
                <div className={`bg-gradient-to-r ${bannerGrad} p-4 relative`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl ${colorClass} text-white flex items-center justify-center font-black text-sm shadow-md shrink-0 overflow-hidden relative`}>
                      {store.logo_url ? (
                        <Image src={store.logo_url} alt={store.name} fill sizes="44px" className="object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-white truncate group-hover:text-amber-300 transition-colors">
                          {store.name}
                        </h3>
                        {store.is_verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-300 mt-0.5">
                        <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{store.city || "Pakistan"}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-amber-400 font-bold flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {(store.rating_average || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {store.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-2">{store.description}</p>
                  )}

                  {/* Top Products */}
                  {store.topProducts && store.topProducts.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {store.topProducts.slice(0, 3).map((item, i) => (
                        <div key={i} className="bg-slate-950 rounded-lg p-1.5 border border-slate-800">
                          <div className="w-full aspect-square relative rounded-md overflow-hidden bg-slate-900 mb-1">
                            {item.imageUrl ? (
                              <Image src={item.imageUrl} alt={item.title} fill sizes="64px" className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">?</div>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-amber-300 block truncate">
                            PKR {(item.pricePkr || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link
                    href={`/store/${store.slug}`}
                    className="w-full py-2 bg-slate-800 hover:bg-amber-400 text-slate-300 hover:text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    Visit Store
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust Bar */}
        <div className="relative z-10 mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">100% Secure Checkout</span>
          </span>
          <span className="text-slate-700">·</span>
          <span className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Official Warranty</span>
          </span>
          <span className="text-slate-700">·</span>
          <span className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>7-Day Hassle-Free Returns</span>
          </span>
        </div>
      </div>

      {/* Secondary Grid — More Stores */}
      {gridStores.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">More Verified Stores</h3>
            <Link
              href="/stores"
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {gridStores.map((store, idx) => {
              const initials = store.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
              const colorClass = AVATAR_COLORS[(idx + 4) % AVATAR_COLORS.length];

              return (
                <Link
                  key={store.id}
                  href={`/store/${store.slug}`}
                  className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-4 transition-all hover:shadow-md group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl ${colorClass} text-white flex items-center justify-center font-black text-sm shadow shrink-0 overflow-hidden relative`}>
                      {store.logo_url ? (
                        <Image src={store.logo_url} alt={store.name} fill sizes="48px" className="object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-slate-900 truncate group-hover:text-amber-700 transition-colors">
                          {store.name}
                        </h4>
                        {store.is_verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{store.city || "Pakistan"}</span>
                        <span className="text-amber-500 font-bold flex items-center gap-0.5 ml-1">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {(store.rating_average || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">{store.productCount || 0} products</span>
                    <span className="font-bold text-amber-600 flex items-center gap-0.5 group-hover:gap-1 transition-all">
                      Visit <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
