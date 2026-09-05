"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRecentlyViewed, RecentlyViewedProduct } from "@/lib/recentlyViewed";
import { ProductCard } from "@/components/ui/ProductCard";
import { Clock } from "lucide-react";

export function RecentlyViewedSection() {
  const [items, setItems] = useState<RecentlyViewedProduct[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed().slice(0, 8));
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-bold text-gray-900">Recently Viewed</h2>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("waw_recently_viewed");
              setItems([]);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            Clear
          </button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                productId={item.id}
                title={item.title}
                pricePkr={item.price}
                originalPricePkr={item.comparePrice}
                imageUrl={item.imageUrl || ""}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
