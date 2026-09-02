"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import { RatingStars, WawExpressBadge } from "../ui/Badges";
import {
  ShoppingBag,
  ArrowRight,
  Check,
  Zap,
  Truck,
  MapPin,
} from "lucide-react";
import { SellerType } from "@waw/types";
import { fetchProducts } from "@/lib/api";
import { ProductDetail } from "@/types/models";

export function WawExpressSection() {
  const { addItem } = useCartStore();
  const [addedId, setAddedId] = useState<string | null>(null);
  const [expressItems, setExpressItems] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts({ sellerType: "1P", limit: 3 })
      .then(({ items }) => setExpressItems(items.slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || expressItems.length === 0) return null;

  const handleAdd = (item: ProductDetail) => {
    addItem({
      productId: item.productId,
      title: item.title,
      imageUrl: item.imageUrl || "",
      pricePkr: item.pricePkr,
      quantity: 1,
      sellerType: SellerType.FIRST_PARTY,
      storeName: item.storeName || "Waw Official 1P Hub",
    });
    setAddedId(item.productId);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-3.5">
      <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-3xl p-4.5 sm:p-6 text-slate-950 shadow-lg space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shadow-md">
              <Zap className="w-6 h-6 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                  Fulfilled by Waw (Waw Express)
                </h2>
                <span className="bg-slate-950 text-amber-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs">
                  PRIORITY 4-5 DAYS DELIVERY
                </span>
              </div>
              <p className="text-xs text-slate-900 font-semibold mt-0.5">
                Central fulfillment hubs &bull; 100% Quality Inspected &bull; Free
                shipping &gt; PKR 5,000
              </p>
            </div>
          </div>

          <Link
            href="/?sellerType=1P"
            className="text-xs font-black text-white bg-slate-950 hover:bg-slate-900 px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition-all hover:scale-105 cursor-pointer"
          >
            <span>View All Waw Express</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 relative z-10">
          {expressItems.map((item) => {
            const isAdded = addedId === item.productId;
            const savings = (item.originalPricePkr ?? 0) - item.pricePkr;

            return (
              <div
                key={item.productId}
                className="bg-white rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 border border-white/60"
              >
                <div>
                  <Link
                    href={`/products/${item.productId}`}
                    className="block relative aspect-video rounded-xl overflow-hidden bg-slate-50 mb-2.5"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">?</div>
                    )}
                    <div className="absolute top-2 left-2">
                      <WawExpressBadge />
                    </div>
                    <span className="absolute bottom-2 left-2 bg-slate-950/85 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{item.sellerCity || "Pakistan"}</span>
                    </span>
                  </Link>

                  <div className="flex items-center justify-between text-xs font-bold text-emerald-700 mb-1">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      <span>4-5 Days Express</span>
                    </span>
                    <RatingStars
                      rating={item.rating || 0}
                      count={item.reviewsCount || 0}
                    />
                  </div>

                  <Link href={`/products/${item.productId}`}>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 leading-snug group-hover:text-amber-700 transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-base font-black text-slate-950 tracking-tight leading-none">
                        PKR {item.pricePkr.toLocaleString()}
                      </div>
                      {item.originalPricePkr ? (
                        <div className="text-[11px] text-slate-400 line-through mt-0.5 font-medium">
                          PKR {item.originalPricePkr.toLocaleString()}
                        </div>
                      ) : null}
                    </div>

                    {savings > 0 && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-black">
                        Save {savings.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdd(item)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
                      isAdded
                        ? "bg-emerald-600 text-white"
                        : "bg-amber-400 hover:bg-slate-950 hover:text-white text-slate-950"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>ADDED!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>ADD TO CART</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
