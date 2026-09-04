"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Store, Star, CheckCircle2, MapPin, Search, ArrowRight, ShieldCheck } from "lucide-react";
import { fetchStores, type StoreSummary } from "@/lib/api";
import { SellerType } from "@waw/types";
import { FadeIn } from "@/components/Motion";

const GRADIENTS = [
  "from-amber-800 to-amber-950",
  "from-sky-800 to-slate-900",
  "from-rose-800 to-slate-900",
  "from-emerald-800 to-slate-900",
  "from-violet-800 to-slate-900",
];

const AVATAR_COLORS = [
  "bg-amber-400 text-slate-950",
  "bg-sky-500 text-white",
  "bg-rose-500 text-white",
  "bg-emerald-500 text-white",
  "bg-violet-500 text-white",
];

export default function StoresPage() {
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStores()
      .then(setStores)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.city || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center">
              <Store className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                All Verified Stores
              </h1>
              <p className="text-sm text-slate-400 font-medium">
                Shop directly from authentic brands and artisans across Pakistan
              </p>
            </div>
          </div>

          <div className="relative mt-6 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search stores by name or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400/50 focus:bg-white/15 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <FadeIn delay={100}>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-3xl p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-100 rounded-full w-2/3" />
                    <div className="h-3 bg-slate-100 rounded-full w-1/3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded-full" />
                  <div className="h-3 bg-slate-100 rounded-full w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">
              {search ? "No stores match your search" : "No stores found"}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {search
                ? "Try a different search term"
                : "Stores will appear here once they are verified"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((store, idx) => {
              const initials = store.name
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase();
              const gradient = GRADIENTS[idx % GRADIENTS.length];
              const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const products = store.topProducts || [];

              return (
                <Link
                  key={store.id}
                  href={`/store/${store.slug}`}
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col group"
                >
                  <div className={`bg-gradient-to-r ${gradient} p-5 text-white relative`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl ${avatarColor} flex items-center justify-center font-black text-xl shadow-lg shrink-0 overflow-hidden`}>
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-base text-white group-hover:text-amber-300 transition-colors truncate">
                            {store.name}
                          </h3>
                          {store.is_verified && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-300 font-medium mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-400" />
                            {store.city || "Pakistan"}
                          </span>
                          {store.seller_type && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <ShieldCheck className="w-3 h-3" />
                                {store.seller_type === "FIRST_PARTY" ? "1P Official" : "3P Verified"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-4 right-4">
                      <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full text-amber-400 text-xs font-black backdrop-blur-sm">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{(store.rating_average || 0).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    {store.description && (
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-3">
                        {store.description}
                      </p>
                    )}

                    {products.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {products.slice(0, 3).map((prod, i) => (
                          <div key={i} className="bg-slate-50 border border-slate-200/80 rounded-xl p-1.5 text-center group-hover:border-amber-300/50 transition-all">
                            <div className="aspect-square rounded-lg overflow-hidden bg-white mb-1">
                              {prod.imageUrl ? (
                                <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">?</div>
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-slate-950 truncate">
                              PKR {prod.pricePkr.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {store.productCount || 0} products
                      </span>
                      <span className="text-xs font-bold text-slate-900 group-hover:text-amber-600 flex items-center gap-1 transition-colors">
                        Visit Store
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        </FadeIn>
      </div>
    </div>
  );
}
