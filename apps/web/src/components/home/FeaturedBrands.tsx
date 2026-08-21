'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircle2,
  Sparkles,
  Star,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Flame,
  Award,
  ChevronRight,
  Store,
  Tag,
} from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';

interface BrandHub {
  name: string;
  nameUrdu: string;
  slug: string;
  category: string;
  categoryUrdu: string;
  city: string;
  cityUrdu: string;
  isFirstParty: boolean;
  rating: number;
  reviewsCount: number;
  badge: string;
  badgeUrdu: string;
  discount: string;
  tagline: string;
  taglineUrdu: string;
  avatarText?: string;
  avatarBg: string;
  avatarTextColor: string;
  isWawIcon?: boolean;
  accentColor: string;
  featuredItems: {
    title: string;
    pricePkr: number;
    imageUrl: string;
  }[];
}

const BRAND_HUBS: BrandHub[] = [
  {
    name: 'Waw Official Flagship',
    nameUrdu: 'واو آفیشل فلیگ شپ سٹور',
    slug: 'waw-official-hub',
    category: '1P Waw Retail & Express',
    categoryUrdu: 'ڈائریکٹ ریٹیل اور 24 گھنٹے ڈلیوری',
    city: 'Islamabad',
    cityUrdu: 'اسلام آباد',
    isFirstParty: true,
    rating: 5.0,
    reviewsCount: 4820,
    badge: '1P Official Flagship',
    badgeUrdu: 'آفیشل اسٹور',
    discount: 'Up to 50% Off',
    tagline: '100% Genuine with 24h Waw Express',
    taglineUrdu: '100% اصلی گارنٹی اور تیز رفتار ڈلیوری',
    isWawIcon: true,
    avatarBg: 'bg-[#FEF600]',
    avatarTextColor: 'text-slate-950',
    accentColor: 'from-amber-500/20 to-yellow-500/10',
    featuredItems: [
      {
        title: 'Cow Leather Wallet',
        pricePkr: 2499,
        imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&auto=format&fit=crop&q=80',
      },
      {
        title: 'Heavy Bass Earbuds',
        pricePkr: 3200,
        imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&auto=format&fit=crop&q=80',
      },
      {
        title: 'Oud Al-Layl Attar',
        pricePkr: 1850,
        imageUrl: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    name: 'Khyber Leather Craft',
    nameUrdu: 'خیبر لیدر کرافٹ پشاور',
    slug: 'khyber-artisans',
    category: 'Handmade Footwear & Chappal',
    categoryUrdu: 'ہاتھ سے بنی پشاوری چپل اور لیدر',
    city: 'Peshawar',
    cityUrdu: 'پشاور (نمک منڈی)',
    isFirstParty: false,
    rating: 4.9,
    reviewsCount: 1420,
    badge: 'Master Artisan',
    badgeUrdu: 'دستکار مرکز',
    discount: 'Flat 25% Off',
    tagline: 'Authentic Norozi & Kaptaan Soles',
    taglineUrdu: 'اصلی نوروزی اور کپتان ڈبل تلا چپل',
    avatarText: 'KL',
    avatarBg: 'bg-gradient-to-br from-amber-600 to-amber-900',
    avatarTextColor: 'text-amber-100',
    accentColor: 'from-amber-600/20 to-orange-500/10',
    featuredItems: [
      {
        title: 'Norozi Chappal',
        pricePkr: 3800,
        imageUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300&auto=format&fit=crop&q=80',
      },
      {
        title: 'Kaptaan Chappal',
        pricePkr: 4200,
        imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&auto=format&fit=crop&q=80',
      },
      {
        title: 'Pure Leather Belt',
        pricePkr: 1650,
        imageUrl: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=300&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    name: 'Lahore Tech Hub',
    nameUrdu: 'لاہور ٹیک ہب (حفیظ سینٹر)',
    slug: 'lahore-tech-hub',
    category: 'Audio, Fast Chargers & Gadgets',
    categoryUrdu: 'جدید گیجٹس اور فاسٹ چارجرز',
    city: 'Lahore',
    cityUrdu: 'لاہور',
    isFirstParty: false,
    rating: 4.8,
    reviewsCount: 3850,
    badge: 'Verified Tech Partner',
    badgeUrdu: 'تصدیق شدہ ٹیک پارٹنر',
    discount: 'Up to 50% Off',
    tagline: 'Direct Import with 1-Year Warranty',
    taglineUrdu: '1 سال وارنٹی اور تصدیق شدہ لوازمات',
    avatarText: 'LT',
    avatarBg: 'bg-gradient-to-br from-sky-500 to-blue-700',
    avatarTextColor: 'text-white',
    accentColor: 'from-sky-500/20 to-blue-600/10',
    featuredItems: [
      {
        title: 'Pro ANC Wireless Earbuds',
        pricePkr: 3200,
        imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&auto=format&fit=crop&q=80',
      },
      {
        title: '65W GaN Fast Charger',
        pricePkr: 2800,
        imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=80',
      },
      {
        title: 'AMOLED Smartwatch',
        pricePkr: 5499,
        imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=300&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    name: 'Sindh Silk & Lawn Gallery',
    nameUrdu: 'سندھ سلک اور لان گیلری',
    slug: 'waw-official-hub',
    category: 'Designer Lawn & Handloom',
    categoryUrdu: 'خالص لان اور ہاتھ سے بنا ملبوسات',
    city: 'Karachi',
    cityUrdu: 'کراچی',
    isFirstParty: false,
    rating: 4.9,
    reviewsCount: 2190,
    badge: 'Heritage Textiles',
    badgeUrdu: 'ہینڈلوم ٹیکسٹائل',
    discount: 'Summer Fest 2026',
    tagline: 'Premium Unstitched & Chunri Prints',
    taglineUrdu: 'پریمیم 3 پیس لان اور چنری دوپٹہ',
    avatarText: 'SS',
    avatarBg: 'bg-gradient-to-br from-rose-600 to-pink-800',
    avatarTextColor: 'text-white',
    accentColor: 'from-rose-500/20 to-pink-600/10',
    featuredItems: [
      {
        title: 'Embroidered 3-Piece Lawn',
        pricePkr: 4800,
        imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&auto=format&fit=crop&q=80',
      },
      {
        title: 'Pure Chiffon Chunri',
        pricePkr: 3200,
        imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&auto=format&fit=crop&q=80',
      },
      {
        title: 'Silk Formal Kurta',
        pricePkr: 3999,
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&auto=format&fit=crop&q=80',
      },
    ],
  },
];

export function FeaturedBrands() {
  const { language } = useCartStore();
  const isUrdu = language === 'UR';
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | '1P' | 'LEATHER' | 'TECH' | 'FASHION'>('ALL');

  const filters = [
    { key: 'ALL', label: isUrdu ? 'تمام برانڈ مالز' : 'All Brand Malls' },
    { key: '1P', label: isUrdu ? '⚡ واو آفیشل' : '⚡ Waw Official 1P' },
    { key: 'LEATHER', label: isUrdu ? '👞 لیدر اور پشاوری' : '👞 Leather & Footwear' },
    { key: 'TECH', label: isUrdu ? '📱 ٹیک اور آڈیو' : '📱 Tech & Audio' },
    { key: 'FASHION', label: isUrdu ? '👗 فیشن اور لان' : '👗 Fashion & Lawn' },
  ];

  const filteredHubs = BRAND_HUBS.filter((hub) => {
    if (selectedFilter === '1P') return hub.isFirstParty;
    if (selectedFilter === 'LEATHER') return hub.slug === 'khyber-artisans';
    if (selectedFilter === 'TECH') return hub.slug === 'lahore-tech-hub';
    if (selectedFilter === 'FASHION') return hub.name.includes('Silk');
    return true;
  });

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8">
      {/* ── Main Container with Deep Slate & Radiant Golden Glow ─────────── */}
      <div className="relative bg-gradient-to-br from-slate-950 via-[#0B1120] to-slate-900 rounded-[32px] p-6 sm:p-8 lg:p-10 text-white shadow-2xl border border-slate-800/80 overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* ── Top Header Strip ───────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black text-amber-300 tracking-wider uppercase shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{isUrdu ? 'ویریفائیڈ برانڈ مالز اور علاقائی دستکاری' : 'Official Brand Malls & Regional Hubs'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{isUrdu ? 'پاکستان کے تصدیق شدہ آفیشل اسٹورز' : 'Verified Brand Stores & Artisan Hubs'}</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-2xl">
              {isUrdu
                ? 'براہ راست تصدیق شدہ فیکٹری آؤٹ لیٹس، گارنٹی شدہ وارنٹی اور مستند علاقائی دستکاری سے خریداری کریں۔ 100% اسٹیٹ بینک ایسکرو پروٹیکشن۔'
                : 'Shop directly with guaranteed manufacturer warranties, 24h Waw Express priority dispatch, and authentic provincial craftsmanship.'}
            </p>
          </div>

          {/* Explore All CTA */}
          <Link
            href="/store/khyber-artisans"
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg hover:scale-102 shrink-0 group cursor-pointer self-start md:self-auto"
          >
            <span>{isUrdu ? 'تمام برانڈ اسٹورز دیکھیں' : 'Explore All Verified Hubs'}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* ── Category Filter Pills ──────────────────────────────────────── */}
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto py-5 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setSelectedFilter(f.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === f.key
                  ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300/30 scale-102'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Brand Hub Grid Cards ───────────────────────────────────────── */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-1">
          {filteredHubs.map((hub) => (
            <div
              key={hub.name}
              className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-400/60 rounded-3xl p-5 flex flex-col justify-between space-y-4 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group"
            >
              {/* Card Header: Brand Logo & Verified Info */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  {/* Brand Avatar */}
                  <div
                    className={`w-14 h-14 rounded-2xl ${hub.avatarBg} ${hub.avatarTextColor} flex items-center justify-center font-black text-xl shadow-lg shrink-0 group-hover:scale-105 transition-transform border border-white/10`}
                  >
                    {hub.isWawIcon ? (
                      <svg
                        viewBox="0 0 100 100"
                        className="w-9 h-9"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M 50 14 C 34 14 26 23 26 38 C 26 49 32 58 42 62 L 42 74 C 42 79 38 82 32 82 C 28 82 25 80 23 78 L 19 84 C 23 88 28 90 34 90 C 44 90 51 83 51 72 L 51 62 C 67 59 74 48 74 38 C 74 23 66 14 50 14 Z M 50 22 C 61 22 66 28 66 38 C 66 48 60 54 50 54 C 40 54 34 48 34 38 C 34 28 39 22 50 22 Z" />
                      </svg>
                    ) : (
                      hub.avatarText
                    )}
                  </div>

                  {/* Promo Badge */}
                  <div className="text-right space-y-1">
                    <span className="inline-block bg-amber-400/10 text-amber-300 border border-amber-400/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {hub.discount}
                    </span>
                    <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{hub.rating.toFixed(1)}</span>
                      <span className="text-slate-500 font-normal">({hub.reviewsCount})</span>
                    </div>
                  </div>
                </div>

                {/* Brand Name & Location */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors truncate">
                      {isUrdu ? hub.nameUrdu : hub.name}
                    </h3>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{isUrdu ? hub.cityUrdu : hub.city}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-300 font-semibold">{isUrdu ? hub.categoryUrdu : hub.category}</span>
                  </div>

                  <p className="text-[11px] text-slate-400/90 font-medium line-clamp-1">
                    {isUrdu ? hub.taglineUrdu : hub.tagline}
                  </p>
                </div>
              </div>

              {/* Mini Product Showcase (3 live thumbnail items with price tags) */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-500" />
                  <span>{isUrdu ? 'سب سے زیادہ فروخت ہونے والی اشیاء' : 'Best-Selling Catalog'}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {hub.featuredItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 rounded-xl p-1.5 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col items-center text-center group/item"
                    >
                      <div className="w-full aspect-square relative rounded-lg overflow-hidden bg-slate-900 mb-1">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <span className="text-[10px] font-black text-amber-300 truncate w-full">
                        PKR {item.pricePkr.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer: Visit Store Button */}
              <Link
                href={`/store/${hub.slug}`}
                className="w-full py-2.5 bg-slate-800 hover:bg-amber-400 text-slate-200 hover:text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs group-hover:shadow-md cursor-pointer mt-1"
              >
                <Store className="w-3.5 h-3.5" />
                <span>{isUrdu ? 'آفیشل اسٹور وزٹ کریں' : 'Visit Official Hub'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>

        {/* ── Bottom Trust Strip ─────────────────────────────────────────── */}
        <div className="relative z-10 mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">
              {isUrdu
                ? '100% اسٹیٹ بینک آف پاکستان ایسکرو پروٹیکشن — ہر برانڈ پر 7 دن واپسی کی سہولت'
                : '100% SBP Regulated Escrow — 7-Day Hassle-Free Returns on All Verified Malls'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-amber-300">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>{isUrdu ? 'اصلی برانڈ وارنٹی' : 'Official Warranty'}</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400">
              {isUrdu ? '24 گھنٹے واو ایکسپریس' : '24h Waw Express Priority Dispatch'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
