'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { RatingStars, WawExpressBadge } from '../ui/Badges';
import { Zap, ShoppingBag, Heart, Flame, ArrowRight, Check } from 'lucide-react';
import { SellerType } from '@waw/types';

const FLASH_PRODUCTS = [
  {
    id: 'prod_m1',
    title: 'Waw Signature Premium Full Grain Leather Wallet',
    category: "Men's Leather",
    pricePkr: 2499,
    originalPricePkr: 3800,
    discountPercent: 34,
    rating: 4.9,
    reviewsCount: 382,
    claimedPercent: 88,
    isExpress: true,
    sellerType: SellerType.FIRST_PARTY,
    storeName: 'Waw Official 1P Hub',
    sellerCity: 'Islamabad Hub',
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod_m2',
    title: 'Wireless Active Noise Cancelling Earbuds Pro 2',
    category: 'Audio & Gadgets',
    pricePkr: 3200,
    originalPricePkr: 5200,
    discountPercent: 38,
    rating: 4.8,
    reviewsCount: 1150,
    claimedPercent: 74,
    isExpress: true,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Lahore Tech Hub',
    sellerCity: 'Lahore',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod_m3',
    title: 'Traditional Handcrafted Peshawari Chappal (Double Sole)',
    category: 'Footwear',
    pricePkr: 3800,
    originalPricePkr: 5500,
    discountPercent: 31,
    rating: 5.0,
    reviewsCount: 429,
    claimedPercent: 92,
    isExpress: false,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Khyber Artisans',
    sellerCity: 'Peshawar',
    imageUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod_m4',
    title: 'Ultra Smart Fitness Watch 2026 (Amoled Display)',
    category: 'Wearables',
    pricePkr: 4999,
    originalPricePkr: 7999,
    discountPercent: 37,
    rating: 4.7,
    reviewsCount: 512,
    claimedPercent: 65,
    isExpress: true,
    sellerType: SellerType.FIRST_PARTY,
    storeName: 'Waw Electronics Hub',
    sellerCity: 'Lahore Hub',
    imageUrl: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&auto=format&fit=crop&q=80',
  },
];

export function FlashDeals() {
  const { addItem } = useCartStore();

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-6">
      <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 rounded-3xl p-5 sm:p-7 text-white shadow-lg space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Zap className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  ⚡ FLASH MEGA DEALS
                </h2>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-sm">
                  LIMITED STOCK
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium mt-0.5">
                Daily lightning discounts across verified Pakistani seller inventories
              </p>
            </div>
          </div>

          <Link
            href="/cart"
            className="text-xs font-bold text-amber-300 hover:text-white flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>View All 150+ Flash Deals</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FLASH_PRODUCTS.map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-2xl p-3 text-slate-900 border border-slate-100 flex flex-col justify-between shadow-md hover:shadow-xl transition-all group"
            >
              <div>
                {/* Image Container with Badges */}
                <Link href={`/products/${prod.id}`} className="block relative aspect-square rounded-xl overflow-hidden bg-slate-50 mb-2.5">
                  <img
                    src={prod.imageUrl}
                    alt={prod.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Discount percentage badge */}
                  <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                    -{prod.discountPercent}% OFF
                  </span>

                  {/* Wishlist button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur text-slate-400 hover:text-rose-600 transition-colors shadow-xs"
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </button>
                </Link>

                {/* Seller info line */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-slate-600 truncate">
                    🏬 {prod.storeName} ({prod.sellerCity})
                  </span>
                  {prod.isExpress && <WawExpressBadge />}
                </div>

                {/* Title */}
                <Link href={`/products/${prod.id}`}>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors">
                    {prod.title}
                  </h3>
                </Link>

                {/* Rating */}
                <div className="mt-1.5">
                  <RatingStars rating={prod.rating} count={prod.reviewsCount} />
                </div>
              </div>

              {/* Price & Stock Progress Bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-base sm:text-lg font-black text-slate-950 leading-none">
                      PKR {prod.pricePkr.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 line-through mt-0.5">
                      PKR {prod.originalPricePkr.toLocaleString()}
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-extrabold">
                    Save PKR {(prod.originalPricePkr - prod.pricePkr).toLocaleString()}
                  </span>
                </div>

                {/* Stock Claimed Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span className="text-rose-600 flex items-center gap-0.5">
                      <Flame className="w-3 h-3 fill-rose-500" />
                      {prod.claimedPercent}% Claimed
                    </span>
                    <span>Hurry, low stock</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-rose-500 h-1.5 rounded-full"
                      style={{ width: `${prod.claimedPercent}%` }}
                    />
                  </div>
                </div>

                {/* Add to Cart CTA */}
                <button
                  onClick={() =>
                    addItem({
                      productId: prod.id,
                      title: prod.title,
                      imageUrl: prod.imageUrl,
                      pricePkr: prod.pricePkr,
                      quantity: 1,
                      sellerType: prod.sellerType,
                      storeName: prod.storeName,
                    })
                  }
                  className="w-full bg-slate-950 hover:bg-amber-400 hover:text-slate-950 text-white font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>ADD TO CART</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
