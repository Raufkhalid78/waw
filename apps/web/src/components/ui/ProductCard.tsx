"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  ShoppingBag,
  Zap,
  CheckCircle2,
  Check,
  Star,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { SellerType } from "@waw/types";

export interface ProductCardProps {
  productId: string;
  title: string;
  titleUrdu?: string;
  storeName: string;
  sellerCity?: string;
  sellerRating?: number;
  isStoreVerified?: boolean;
  hasInstallments?: boolean;
  pricePkr: number;
  originalPricePkr?: number;
  discountPercent?: number;
  rating?: number;
  reviewsCount?: number;
  imageUrl: string;
  isExpress?: boolean;
  sellerType: SellerType;
  soldCount?: number;
}

export function ProductCard({
  productId,
  title,
  titleUrdu,
  storeName,
  sellerCity,
  pricePkr,
  originalPricePkr,
  discountPercent,
  rating = 0,
  reviewsCount = 0,
  imageUrl,
  isExpress = false,
  sellerType,
  soldCount,
}: ProductCardProps) {
  const { addItem, toggleWishlist, isInWishlist, language } = useCartStore();
  const isUrdu = language === "UR";
  const wishlisted = isInWishlist(productId);
  const [added, setAdded] = useState(false);

  const isVerifiedMerchant = isExpress || sellerType === SellerType.FIRST_PARTY;
  const hasRealDiscount = originalPricePkr !== undefined && originalPricePkr > pricePkr;
  const savings = hasRealDiscount ? originalPricePkr - pricePkr : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId,
      title,
      titleUrdu: titleUrdu ?? "",
      imageUrl,
      pricePkr,
      quantity: 1,
      sellerType,
      storeName,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const displayTitle = isUrdu && titleUrdu ? titleUrdu : title;

  return (
    <div className="group relative bg-white rounded-xl border border-gray-200 hover:border-amber-400/60 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden">
      {/* Image Container */}
      <Link href={`/products/${productId}`} className="block relative aspect-square bg-gray-50 overflow-hidden">
        <Image
          src={imageUrl || "/placeholder.png"}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          loading="lazy"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Discount Badge */}
        {hasRealDiscount && discountPercent && discountPercent > 0 && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded">
            -{discountPercent}%
          </span>
        )}

        {/* Express Badge */}
        {isExpress && (
          <span className="absolute top-2 right-2 bg-amber-400 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Zap className="w-2.5 h-2.5 fill-current" />
            Express
          </span>
        )}

        {/* Wishlist */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist({
              productId,
              title,
              titleUrdu,
              imageUrl,
              pricePkr,
              quantity: 1,
              sellerType,
              storeName,
            });
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10"
        >
          <Heart className={`w-4 h-4 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
        </button>
      </Link>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        {/* Seller */}
        <div className="flex items-center gap-1 mb-1.5">
          {isVerifiedMerchant && (
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          )}
          <span className="text-[11px] text-gray-500 truncate">{storeName}</span>
        </div>

        {/* Title */}
        <Link href={`/products/${productId}`} className="block flex-1">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug group-hover:text-amber-700 transition-colors min-h-[2.5rem]">
            {displayTitle}
          </h3>
        </Link>

        {/* Rating */}
        <div className="mt-2 flex items-center gap-1.5">
          {reviewsCount > 0 && rating > 0 ? (
            <>
              <div className="flex items-center gap-0.5 bg-green-700 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
                <Star className="w-3 h-3 fill-current" />
                {rating}
              </div>
              <span className="text-xs text-gray-500">({reviewsCount.toLocaleString()})</span>
            </>
          ) : (
            <span className="text-[11px] text-gray-400">New</span>
          )}
          {soldCount && soldCount > 0 && (
            <span className="text-[11px] text-gray-400 ml-auto">{soldCount.toLocaleString()}+ bought</span>
          )}
        </div>

        {/* Price + Add to Cart */}
        <div className="mt-auto pt-3 border-t border-gray-100">
          <div className="flex items-end justify-between gap-2 mb-2">
            <div>
              <span className="text-lg font-bold text-gray-900 leading-none">
                PKR {pricePkr.toLocaleString()}
              </span>
              {hasRealDiscount && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400 line-through">
                    {originalPricePkr.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-green-700 font-medium">
                    Save {savings.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              added
                ? "bg-green-600 text-white"
                : "bg-amber-400 hover:bg-amber-500 text-slate-900 active:scale-[0.98]"
            }`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Added!
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                {isUrdu ? "ٹوکری میں شامل کریں" : "Add to Cart"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
