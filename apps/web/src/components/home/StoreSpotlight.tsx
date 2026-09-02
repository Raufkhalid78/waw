"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  Star,
  CheckCircle2,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { SellerType } from "@waw/types";
import { fetchStores, type StoreSummary } from "@/lib/api";

const BANNER_GRADIENTS = [
  "from-amber-900 to-amber-950",
  "from-sky-900 to-slate-950",
  "from-rose-900 to-slate-950",
  "from-emerald-900 to-slate-950",
  "from-violet-900 to-slate-950",
];

const AVATAR_BG = [
  "bg-amber-400 text-slate-950",
  "bg-sky-500 text-white",
  "bg-rose-500 text-white",
  "bg-emerald-500 text-white",
  "bg-violet-500 text-white",
];

export function StoreSpotlight() {
  const { addItem } = useCartStore();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStores()
      .then((data) => setStores(data.slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || stores.length === 0) return null;

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              Featured Verified Stores
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Shop directly from authentic craftsmen and verified brands across Pakistan.
          </p>
        </div>
        <Link
          href="/stores"
          className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>Explore All Stores</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stores.map((store, idx) => {
          const initials = store.name
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase();
          const bannerGrad = BANNER_GRADIENTS[idx % BANNER_GRADIENTS.length];
          const avatarBg = AVATAR_BG[idx % AVATAR_BG.length];
          const products = store.topProducts || [];

          return (
            <div
              key={store.id}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div className={`bg-gradient-to-r ${bannerGrad} p-4 sm:p-5 text-white relative`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl ${avatarBg} flex items-center justify-center font-black text-lg shadow-md shrink-0 overflow-hidden`}>
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link href={`/store/${store.slug}`}>
                          <h3 className="font-extrabold text-sm sm:text-base text-white hover:text-amber-300 transition-colors">
                            {store.name}
                          </h3>
                        </Link>
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
                            <span>{store.seller_type === "FIRST_PARTY" ? "1P Official" : "3P Verified"}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full text-amber-400 text-xs font-black">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{(store.rating_average || 0).toFixed(1)}</span>
                      <span className="text-slate-400 font-normal text-[10px]">
                        ({store.rating_count || 0})
                      </span>
                    </div>
                    {store.productCount != null && store.productCount > 0 && (
                      <div className="text-[10px] text-emerald-300 font-bold mt-1">
                        {store.productCount} products
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {products.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {products.map((prod, i) => (
                      <div
                        key={i}
                        className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between hover:border-amber-400 transition-all group"
                      >
                        <div>
                          <div className="relative aspect-square rounded-xl overflow-hidden bg-white mb-2">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">?</div>
                            )}
                          </div>
                          <h4 className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-amber-600">
                            {prod.title}
                          </h4>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-200/60">
                          <div className="text-xs font-black text-slate-950">
                            PKR {(prod.pricePkr || 0).toLocaleString()}
                          </div>
                          <button
                            onClick={() =>
                              addItem({
                                productId: prod.title,
                                title: prod.title,
                                imageUrl: prod.imageUrl,
                                pricePkr: prod.pricePkr,
                                quantity: 1,
                                sellerType: SellerType.THIRD_PARTY,
                                storeId: store.id,
                                storeName: store.name,
                              })
                            }
                            className="mt-1.5 w-full bg-slate-950 hover:bg-amber-400 hover:text-slate-950 text-white text-[10px] font-bold py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium text-[11px]">
                    {store.description || "Verified Store • Genuine Direct Dispatch"}
                  </span>
                  <Link
                    href={`/store/${store.slug}`}
                    className="font-bold text-slate-900 hover:text-amber-600 flex items-center gap-1 group"
                  >
                    <span>Visit Store</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
