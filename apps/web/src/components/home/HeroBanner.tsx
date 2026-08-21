'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Zap, Truck, ShieldCheck, Flame, Award, Store } from 'lucide-react';

const HERO_SLIDES = [
  {
    id: 'slide_1',
    badge: '🔥 SUPER SALE 2026',
    badgeBg: 'bg-slate-950 text-amber-400',
    title: "Online Shopping in Pakistan",
    subtitle: 'Shop 50,000+ top products with 24h Waw Express dispatch and SBP Escrow buyer protection.',
    primaryCta: 'SHOP TOP DEALS',
    primaryHref: '/products/prod_m1',
    bgGradient: 'from-amber-400 via-amber-500 to-amber-600',
    textColor: 'text-slate-950',
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80',
    tag: 'Up to 70% Off',
  },
  {
    id: 'slide_2',
    badge: '🧵 SUMMER LAWN 2026',
    badgeBg: 'bg-rose-950 text-rose-300',
    title: "Designer Lawn & Unstitched Suits",
    subtitle: 'Direct from top Karachi & Lahore textile fashion houses with free delivery above PKR 5,000.',
    primaryCta: 'EXPLORE LAWN',
    primaryHref: '/products/prod_m6',
    bgGradient: 'from-rose-500 via-rose-600 to-amber-500',
    textColor: 'text-white',
    imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80',
    tag: 'New 2026 Festive',
  },
  {
    id: 'slide_3',
    badge: '⚡ SIALKOT EXPORT ZONE',
    badgeBg: 'bg-emerald-950 text-emerald-300',
    title: "Handmade Sialkot Sports & Gear",
    subtitle: 'Official hand-stitched footballs, English willow bats & boxing gear exported to 50+ countries.',
    primaryCta: 'SHOP SPORTS',
    primaryHref: '/products/prod_m5',
    bgGradient: 'from-emerald-600 via-teal-700 to-slate-900',
    textColor: 'text-white',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80',
    tag: 'Export Certified',
  },
];

export function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ hours: 8, minutes: 42, seconds: 15 });

  // Auto slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Countdown timer
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

  const slide = HERO_SLIDES[currentSlide];

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 pt-4 pb-2">
      {/* ── 1. Main Banner Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Main Slider Carousel (Noon / Amazon Style) */}
        <div
          className={`lg:col-span-8 rounded-3xl p-6 sm:p-10 ${slide.textColor} bg-gradient-to-br ${slide.bgGradient} relative overflow-hidden shadow-lg flex flex-col justify-between min-h-[380px] sm:min-h-[420px] transition-all duration-700`}
        >
          {/* Background Image Watermark & Glow */}
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-1/2 opacity-20 sm:opacity-30 mix-blend-overlay pointer-events-none">
            <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-white/20 blur-3xl pointer-events-none" />

          {/* Top Pill Row */}
          <div className="flex flex-wrap items-center gap-2.5 z-10">
            <span
              className={`inline-flex items-center gap-1.5 ${slide.badgeBg} text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-sm`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{slide.badge}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-full shadow-sm">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>FREE Delivery &gt; PKR 5,000</span>
            </span>
          </div>

          {/* Titles & Copy */}
          <div className="space-y-3 z-10 max-w-xl my-6">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight drop-shadow-xs">
              {slide.title}
            </h1>
            <p className="text-sm sm:text-base font-semibold leading-relaxed max-w-lg opacity-95">
              {slide.subtitle}
            </p>
          </div>

          {/* Bottom Actions & Slider Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 pt-4 border-t border-black/10">
            <div className="flex items-center gap-4">
              <Link
                href={slide.primaryHref}
                className="bg-slate-950 hover:bg-slate-900 text-white font-black px-7 py-3.5 rounded-full text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-xl hover:scale-105 transition-all"
              >
                <span>{slide.primaryCta}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* Slider Dots */}
              <div className="flex items-center gap-1.5">
                {HERO_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all ${
                      currentSlide === idx ? 'w-7 bg-slate-950' : 'w-2 bg-slate-950/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Slider Arrow Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
                className="p-2.5 rounded-full bg-white/80 hover:bg-white text-slate-950 shadow-sm hover:scale-105 transition-all cursor-pointer"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
                className="p-2.5 rounded-full bg-white/80 hover:bg-white text-slate-950 shadow-sm hover:scale-105 transition-all cursor-pointer"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidekick Promotional Cards (Noon Style) */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          {/* Card 1: Lightning Flash Deals Widget with Live Countdown */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-5 border border-slate-800 flex flex-col justify-between relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-400" />
                <span>FLASH DEALS</span>
              </span>

              {/* Ticking countdown */}
              <div className="flex items-center gap-1 font-mono font-black text-xs text-amber-400">
                <span className="bg-slate-800 px-1.5 py-0.5 rounded">{String(timeLeft.hours).padStart(2, '0')}h</span>
                <span>:</span>
                <span className="bg-slate-800 px-1.5 py-0.5 rounded">{String(timeLeft.minutes).padStart(2, '0')}m</span>
                <span>:</span>
                <span className="bg-slate-800 px-1.5 py-0.5 rounded">{String(timeLeft.seconds).padStart(2, '0')}s</span>
              </div>
            </div>

            <div className="space-y-1.5 my-3">
              <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                Today&apos;s Best Pakistani Deals (Up to 50% Off)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Handpicked stock from verified Peshawar leather crafts, Lahore tech, and Karachi fashion.
              </p>
            </div>

            <Link
              href="/"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 group pt-2 border-t border-slate-800"
            >
              <span>Browse All Flash Deals</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Card 2: Smart Payment & Free Delivery Promise */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 text-slate-900 rounded-3xl p-5 border-2 border-amber-300 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>SMART SAVINGS</span>
              </span>
              <span className="text-xs font-black text-slate-900">PKR 100 SAVER</span>
            </div>

            <div className="space-y-1.5 my-3">
              <h3 className="text-base sm:text-lg font-black text-slate-950 leading-snug">
                Save PKR 100 on Every Order!
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                Pay online using Debit / Credit Card, Raast, or JazzCash / Easypaisa to waive the COD surcharge.
              </p>
            </div>

            <Link
              href="/checkout"
              className="text-xs font-bold text-slate-950 hover:text-amber-700 flex items-center gap-1 group pt-2 border-t border-amber-200"
            >
              <span>Learn how online checkout saves you money</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. Marketplace Live Stats & Trust Ribbon ───────────────────────── */}
      <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="flex items-center justify-center gap-2.5 py-1">
            <Store className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="text-left">
              <div className="text-xs font-black text-slate-900">2,450+ Verified Shops</div>
              <div className="text-[10px] text-slate-500 font-medium">Independent makers & brands</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2.5 py-1">
            <Zap className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="text-left">
              <div className="text-xs font-black text-slate-900">24-48h Waw Express</div>
              <div className="text-[10px] text-slate-500 font-medium">Fast direct dispatch</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2.5 py-1">
            <Truck className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="text-left">
              <div className="text-xs font-black text-slate-900">Free Nationwide Shipping</div>
              <div className="text-[10px] text-slate-500 font-medium">On orders &gt; PKR 5,000</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2.5 py-1">
            <ShieldCheck className="w-5 h-5 text-sky-500 shrink-0" />
            <div className="text-left">
              <div className="text-xs font-black text-slate-900">100% Buyer Protection</div>
              <div className="text-[10px] text-slate-500 font-medium">SBP Regulated Escrow</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2.5 py-1 col-span-2 md:col-span-1">
            <Award className="w-5 h-5 text-rose-500 shrink-0" />
            <div className="text-left">
              <div className="text-xs font-black text-slate-900">14 Major Cities</div>
              <div className="text-[10px] text-slate-500 font-medium">Lahore, Karachi, Isb & more</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
