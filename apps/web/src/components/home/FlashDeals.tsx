'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { RatingStars, WawExpressBadge } from '../ui/Badges';
import { Zap, ShoppingBag, Heart, Flame, ArrowRight, Check, Timer } from 'lucide-react';
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
    storeName: 'Waw Official Hub',
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
    title: 'Ultra Smart Fitness Watch 2026 (AMOLED Display)',
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
  const { addItem, toggleWishlist, isInWishlist } = useCartStore();
  const [addedId, setAddedId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 7, minutes: 24, seconds: 48 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAdd = (item: any) => {
    addItem({
      productId: item.id,
      title: item.title,
      imageUrl: item.imageUrl,
      pricePkr: item.pricePkr,
      quantity: 1,
      sellerType: item.sellerType,
      storeName: item.storeName,
    });
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-3.5">
      <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-amber-600 rounded-3xl p-4 sm:p-6 text-white shadow-lg space-y-4">
        {/* Section Header with Live Ticking Timer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/20 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md animate-pulse">
              <Flame className="w-6 h-6 fill-slate-950 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  ⚡ FLASH MEGA DEALS
                </h2>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs">
                  DEAL OF THE DAY
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium mt-0.5">
                Up to 50% discount with fast 4-5 days direct delivery across Pakistan
              </p>
            </div>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-2 bg-slate-950/75 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 self-start sm:self-auto shadow-xs">
            <Timer className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] uppercase font-black text-slate-300">ENDS IN:</span>
            <div className="flex items-center gap-1 font-mono font-black text-xs sm:text-sm text-amber-300">
              <span className="bg-white/15 px-2 py-0.5 rounded-md">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span>:</span>
              <span className="bg-white/15 px-2 py-0.5 rounded-md">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span>:</span>
              <span className="bg-white/15 px-2 py-0.5 rounded-md">{String(timeLeft.seconds).padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {/* 4 Lightning Product Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {FLASH_PRODUCTS.map((prod) => {
            const savings = prod.originalPricePkr - prod.pricePkr;
            const isAdded = addedId === prod.id;
            const wishlisted = isInWishlist(prod.id);

            return (
              <div
                key={prod.id}
                className="bg-white rounded-2xl p-3 sm:p-3.5 text-slate-900 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div>
                  {/* Image Container */}
                  <Link
                    href={`/products/${prod.id}`}
                    className="block relative aspect-square rounded-xl overflow-hidden bg-slate-50 mb-2.5"
                  >
                    <img
                      src={prod.imageUrl}
                      alt={prod.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                    />

                    {/* Discount Pill */}
                    <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-2xs">
                      -{prod.discountPercent}% OFF
                    </span>

                    {/* Wishlist Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleWishlist({
                          productId: prod.id,
                          title: prod.title,
                          imageUrl: prod.imageUrl,
                          pricePkr: prod.pricePkr,
                          quantity: 1,
                          sellerType: prod.sellerType,
                          storeName: prod.storeName,
                        });
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/95 hover:bg-white text-slate-400 hover:text-rose-600 shadow-sm transition-all hover:scale-110 cursor-pointer"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          wishlisted ? 'fill-rose-600 text-rose-600' : 'text-slate-600'
                        }`}
                      />
                    </button>
                  </Link>

                  {/* Vendor Identity */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                    <span className="truncate">{prod.storeName}</span>
                    {prod.isExpress && <WawExpressBadge />}
                  </div>

                  {/* Title */}
                  <Link href={`/products/${prod.id}`}>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 leading-snug group-hover:text-amber-700 transition-colors">
                      {prod.title}
                    </h3>
                  </Link>

                  {/* Claimed Stock Progress Bar */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-black">
                      <span className="text-rose-600">{prod.claimedPercent}% CLAIMED</span>
                      <span className="text-slate-400">Limited Stock</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-rose-600 rounded-full transition-all duration-700"
                        style={{ width: `${prod.claimedPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Price & Add to Cart CTA */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-base font-black text-slate-950 tracking-tight leading-none">
                        PKR {prod.pricePkr.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 line-through mt-0.5 font-medium">
                        PKR {prod.originalPricePkr.toLocaleString()}
                      </div>
                    </div>

                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-black">
                      Save {savings.toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdd(prod)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
                      isAdded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-950 hover:bg-amber-400 hover:text-slate-950 text-white'
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
                        <span>CLAIM DEAL</span>
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
