'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, Zap, CheckCircle2, Check, Star, ShieldCheck, Sparkles } from 'lucide-react';
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
  deliveryTime = isExpress ? '4-5 Days Express' : '7-9 Days Standard',
}: ProductCardProps) {
  const { addItem, toggleWishlist, isInWishlist, language } = useCartStore();
  const isUrdu = language === 'UR';
  const wishlisted = isInWishlist(productId);
  const [added, setAdded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    setTimeout(() => setAdded(false), 1600);
  };

  const savings = originalPricePkr ? originalPricePkr - pricePkr : 0;
  const displayTitle = isUrdu && titleUrdu ? titleUrdu : title;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="product-card group relative bg-white border border-slate-200 hover:border-amber-400 rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_16px_35px_rgba(0,0,0,0.09)] hover:-translate-y-1.5"
    >
      <div>
        {/* ── 1. Image Container with Badges ───────────────────────────── */}
        <Link href={`/products/${productId}`} className="block relative aspect-square rounded-2xl overflow-hidden bg-slate-50 mb-3.5">
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
          />

          {/* Top Badges Row */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
            {discountPercent && (
              <span className="bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-sm">
                -{discountPercent}% OFF
              </span>
            )}
            {isExpress && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs w-fit">
                <Zap className="w-3 h-3 fill-slate-950" />
                <span>EXPRESS</span>
              </span>
            )}
          </div>

          {/* Wishlist Heart Button */}
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
            className="absolute top-2.5 right-2.5 p-2.5 rounded-full bg-white/95 hover:bg-white text-slate-400 hover:text-rose-600 shadow-md transition-all hover:scale-115 cursor-pointer z-10"
            title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                wishlisted ? 'fill-rose-600 text-rose-600' : 'text-slate-600'
              }`}
            />
          </button>
        </Link>

        {/* ── 2. Seller Identity (Multi-Vendor Trust) ────────────────── */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700 truncate">
              {storeName}
            </span>
            {sellerCity && (
              <span className="text-xs text-slate-400 shrink-0 font-medium">({sellerCity})</span>
            )}
          </div>
        </div>

        {/* ── 3. Product Title ────────────────────────────────────────── */}
        <Link href={`/products/${productId}`} className="block">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 line-clamp-2 leading-snug group-hover:text-amber-700 transition-colors">
            {displayTitle}
          </h3>
        </Link>

        {/* ── 4. Ratings & Social Proof ───────────────────────────────── */}
        <div className="mt-2.5 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs sm:text-sm font-black text-slate-900">{rating}</span>
            <span className="text-xs text-slate-400 font-semibold">({reviewsCount})</span>
          </div>

          {soldCount && (
            <span className="text-xs text-slate-500 font-semibold">
              {soldCount.toLocaleString()}+ sold
            </span>
          )}
        </div>
      </div>

      {/* ── 5. Pricing Block & Quick Add to Cart ──────────────────────── */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-lg sm:text-xl font-black text-slate-950 tracking-tight leading-none">
              PKR {pricePkr.toLocaleString()}
            </div>
            {originalPricePkr && (
              <div className="text-xs sm:text-sm text-slate-400 line-through mt-1 font-semibold">
                PKR {originalPricePkr.toLocaleString()}
              </div>
            )}
          </div>

          {savings > 0 && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg font-black">
              Save {savings.toLocaleString()}
            </span>
          )}
        </div>

        {/* 1-Click Add Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
            added
              ? 'bg-emerald-600 text-white scale-[0.98]'
              : 'bg-amber-400 hover:bg-slate-950 hover:text-white text-slate-950 active:scale-95'
          }`}
        >
          {added ? (
            <>
              <Check className="w-4 h-4" />
              <span>{isUrdu ? 'ٹوکری میں شامل کر دیا گیا!' : 'ADDED TO CART!'}</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>{isUrdu ? 'ٹوکری میں شامل کریں' : 'ADD TO CART'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
