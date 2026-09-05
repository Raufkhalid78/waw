"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { SellerType } from "@waw/types";

interface CrossSellProduct {
  productId: string;
  slug?: string;
  title: string;
  imageUrl?: string;
  images?: string[];
  pricePkr: number;
  compareAtPricePkr?: number;
  storeName?: string;
  rating?: number;
  reviewsCount?: number;
}

interface CrossSellSectionProps {
  title: string;
  subtitle?: string;
  products: CrossSellProduct[];
  viewAllHref?: string;
  onAddToCart?: (product: CrossSellProduct) => void;
}

export function CrossSellSection({
  title,
  subtitle,
  products,
  viewAllHref,
  onAddToCart,
}: CrossSellSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          {products.length > 3 && (
            <>
              <button
                onClick={() => scroll("left")}
                className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => scroll("right")}
                className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </>
          )}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 ml-2"
            >
              View All
            </Link>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {products.map((product) => (
          <div
            key={product.productId}
            className="snap-start shrink-0"
            style={{ width: "180px" }}
          >
            <ProductCard
              productId={product.productId}
              title={product.title}
              imageUrl={product.imageUrl || product.images?.[0] || ""}
              pricePkr={product.pricePkr}
              originalPricePkr={product.compareAtPricePkr}
              storeName={product.storeName || "Waw"}
              sellerType={SellerType.THIRD_PARTY}
              rating={product.rating}
              reviewsCount={product.reviewsCount}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface FrequentlyBoughtTogetherProps {
  currentProduct: CrossSellProduct;
  relatedProducts: CrossSellProduct[];
  onAddAllToCart: (products: CrossSellProduct[]) => void;
}

export function FrequentlyBoughtTogether({
  currentProduct,
  relatedProducts,
  onAddAllToCart,
}: FrequentlyBoughtTogetherProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fbtProducts = relatedProducts.slice(0, 4);

  if (fbtProducts.length === 0) return null;

  const allProducts = [currentProduct, ...fbtProducts];
  const totalPrice = allProducts.reduce((sum, p) => sum + p.pricePkr, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4">
      <h3 className="text-base font-bold text-gray-900">Frequently Bought Together</h3>

      <div className="flex items-center gap-2 overflow-x-auto pb-2" ref={scrollRef}>
        {allProducts.map((product, i) => (
          <div key={product.productId} className="flex items-center gap-2 shrink-0">
            <div className="w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                  No image
                </div>
              )}
            </div>
            {i < allProducts.length - 1 && (
              <span className="text-gray-300 text-lg font-light">+</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{allProducts.length} items</p>
          <p className="text-lg font-bold text-gray-900">
            PKR {totalPrice.toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => onAddAllToCart(allProducts)}
          className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
        >
          Add All to Cart
        </button>
      </div>
    </div>
  );
}
