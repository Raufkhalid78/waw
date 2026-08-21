'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, Zap, CheckCircle2, Check } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { RatingStars, WawExpressBadge } from './Badges';
import type { SellerType } from '@waw/types';

export interface ProductCardProps {
  productId: string;
  title: string;
  titleUrdu?: string;
  storeName: string;
  sellerCity?: string;
  sellerRating?: number;
  pricePkr: number;
  originalPricePkr?: number;
  discountPercent?: number;
  rating?: number;
  reviewsCount?: number;
  imageUrl: string;
  isExpress?: boolean;
  sellerType: SellerType;
  soldCount?: number;
  deliveryTime?: string;
}

export function ProductCard({
  productId,
  title,
  titleUrdu,
  storeName,
  sellerCity,
  sellerRating,
  pricePkr,
  originalPricePkr,
  discountPercent,
  rating = 4.8,
  reviewsCount = 120,
  imageUrl,
  isExpress = false,
  sellerType,
  soldCount,
  deliveryTime = '24-48h Delivery',
}: ProductCardProps) {
  const { addItem, toggleWishlist, isInWishlist } = useCartStore();
  const wishlisted = isInWishlist(productId);
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      productId,
      title,
      titleUrdu: titleUrdu ?? '',
      imageUrl,
      pricePkr,
      quantity: 1,
      sellerType,
      storeName,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const savings = originalPricePkr ? originalPricePkr - pricePkr : 0;

  return (
    <div className="product-card group relative bg-white border border-slate-200/90 hover:border-amber-400 hover:shadow-xl rounded-2xl p-3 flex flex-col justify-between transition-all duration-200">
      <div>
        {/* ── 1. Image Container ────────────────────────────────────── */}
        <Link href={`/products/${productId}`} className="block relative aspect-square rounded-xl overflow-hidden bg-slate-50 mb-2.5">
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Discount badge */}
          {discountPercent && (
            <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
              -{discountPercent}% OFF
            </span>
          )}

          {/* Wishlist Heart */}
          <button
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
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur-xs text-slate-400 hover:text-rose-600 shadow-xs transition-transform hover:scale-110 cursor-pointer"
            title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
          </button>
        </Link>

        {/* ── 2. Seller Identity (Key Multi-Vendor Signal) ───────────── */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1 min-w-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="text-[10px] font-bold text-slate-600 truncate">
              {storeName}
            </span>
            {sellerCity && (
              <span className="text-[10px] text-slate-400 shrink-0">({sellerCity})</span>
            )}
          </div>
          {isExpress && <WawExpressBadge />}
        </div>

        {/* ── 3. Product Title (Clean English) ─────────────────────── */}
        <Link href={`/products/${productId}`}>
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors">
            {title}
          </h3>
        </Link>

        {/* ── 4. Ratings & Delivery Promise ─────────────────────────── */}
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <RatingStars rating={rating} count={reviewsCount} />
          {soldCount && (
            <span className="text-[10px] text-slate-500 font-medium">
              {soldCount.toLocaleString()}+ sold
            </span>
          )}
        </div>
      </div>

      {/* ── 5. Pricing Block & Quick Add to Cart ────────────────────── */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-base sm:text-lg font-black text-slate-950 leading-none">
              PKR {pricePkr.toLocaleString()}
            </div>
            {originalPricePkr && (
              <div className="text-[10px] text-slate-400 line-through mt-0.5">
                PKR {originalPricePkr.toLocaleString()}
              </div>
            )}
          </div>

          {savings > 0 && (
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-extrabold">
              Save PKR {savings.toLocaleString()}
            </span>
          )}
        </div>

        {/* 1-Click Add Button */}
        <button
          onClick={handleAddToCart}
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all ${
            added
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-400 hover:bg-amber-500 text-slate-950'
          }`}
        >
          {added ? (
            <>
              <Check className="w-4 h-4" />
              <span>ADDED TO CART!</span>
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
}
