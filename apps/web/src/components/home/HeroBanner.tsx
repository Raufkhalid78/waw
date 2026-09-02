"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Zap,
  Truck,
  ShieldCheck,
  Flame,
  Star,
  Sparkles,
  ShoppingBag,
  Clock,
  Store,
  Award,
  CheckCircle2,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { SellerType } from "@waw/types";
import { fetchProducts } from "@/lib/api";
import { ProductDetail } from "@/types/models";

const HERO_SLIDES = [
  {
    id: "slide_1",
    badge: "🔥 FEATURED CRAFTS & TECH",
    badgeBg: "bg-slate-950 text-amber-400 border border-amber-400/30",
    title: "Authentic Goods Across Pakistan",
    highlightText: "Direct from Verified Local Makers",
    subtitle:
      "Shop direct from authentic Karachi fashion houses, Lahore tech importers, Sialkot sports makers, and Peshawar leather craftsmen.",
    primaryCta: "SHOP FEATURED DEALS",
    primaryHref: "/category/mobiles-tech",
    bgGradient: "from-amber-400 via-amber-500 to-yellow-500",
    textColor: "text-slate-950",
    productImage:
      "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80",
    productTitle: "Handcrafted Cow Leather Bifold Wallet",
    productPrice: "PKR 2,499",
    productOriginalPrice: "PKR 3,800",
    productRating: "Verified Merchant",
    floatingBadge: "⚡ Fast Nationwide Delivery",
  },
  {
    id: "slide_2",
    badge: "👗 FESTIVE SUMMER LAWN",
    badgeBg: "bg-slate-950 text-rose-400 border border-rose-400/30",
    title: "Designer Lawn & Luxury Festive Suits",
    highlightText: "Direct Textile Mill Prices",
    subtitle:
      "Authentic embroidered lawn from top fashion houses in Karachi & Lahore with free nationwide delivery above PKR 5,000.",
    primaryCta: "EXPLORE LAWN COLLECTION",
    primaryHref: "/category/womens-lawn",
    bgGradient: "from-rose-500 via-rose-600 to-amber-500",
    textColor: "text-white",
    productImage:
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80",
    productTitle: "Embroidered 3-Piece Festive Lawn Suit",
    productPrice: "PKR 4,499",
    productOriginalPrice: "PKR 6,500",
    productRating: "Pure Cotton",
    floatingBadge: "✨ Premium Collection",
  },
  {
    id: "slide_3",
    badge: "🏏 SIALKOT EXPORT HUB",
    badgeBg: "bg-slate-950 text-emerald-400 border border-emerald-400/30",
    title: "Match Grade Footballs & Sports Gear",
    highlightText: "World Famous Craftsmanship",
    subtitle:
      "Direct from certified Sialkot sports makers to your doorstep with fast tracked delivery.",
    primaryCta: "SHOP SIALKOT SPORTS",
    primaryHref: "/category/sialkot-sports",
    bgGradient: "from-emerald-700 via-teal-800 to-slate-950",
    textColor: "text-white",
    productImage:
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&auto=format&fit=crop&q=80",
    productTitle: "Pro Thermally Bonded Match Football",
    productPrice: "PKR 2,800",
    productOriginalPrice: "PKR 4,200",
    productRating: "Handcrafted",
    floatingBadge: "🏆 Match Quality Spec",
  },
];

export function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [timeLeft, setTimeLeft] = useState({
    hours: 8,
    minutes: 34,
    seconds: 12,
  });
  const { addItem } = useCartStore();
  const [dealAdded, setDealAdded] = useState(false);
  const [dealProduct, setDealProduct] = useState<ProductDetail | null>(null);

  useEffect(() => {
    fetchProducts({ sortBy: "rating", limit: 10 })
      .then(({ items }) => {
        const discounted = items.filter((p) => p.discountPercent && p.discountPercent > 10);
        if (discounted.length > 0) setDealProduct(discounted[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0)
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  const handleQuickAdd = () => {
    if (!dealProduct) return;
    addItem({
      productId: dealProduct.productId,
      title: dealProduct.title,
      imageUrl: dealProduct.imageUrl || "",
      pricePkr: dealProduct.pricePkr,
      quantity: 1,
      sellerType: dealProduct.sellerType,
      storeName: dealProduct.storeName,
    });
    setDealAdded(true);
    setTimeout(() => setDealAdded(false), 1600);
  };

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 pt-2.5 pb-1">
      {/* ── 1. Hero Grid Showcase (Sleek Compact Proportions) ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Main 8-Col Slider Carousel */}
        <div
          className={`lg:col-span-8 rounded-3xl p-4.5 sm:p-6 lg:p-7 ${slide.textColor} bg-gradient-to-br ${slide.bgGradient} relative overflow-hidden shadow-lg flex flex-col justify-between min-h-[320px] sm:min-h-[350px] transition-all duration-700`}
        >
          {/* Ambient Lighting */}
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/20 blur-3xl pointer-events-none" />
          <div className="absolute right-1/4 -bottom-20 w-64 h-64 rounded-full bg-black/10 blur-2xl pointer-events-none" />

          {/* Top Pill Badges */}
          <div className="flex flex-wrap items-center gap-2 z-10">
            <span
              className={`inline-flex items-center gap-1.5 ${slide.badgeBg} text-[11px] sm:text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-xs`}
            >
              <Flame className="w-3.5 h-3.5 fill-current text-amber-400" />
              <span>{slide.badge}</span>
            </span>

            <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-md text-slate-950 text-[11px] sm:text-xs font-black px-3 py-1 rounded-full shadow-xs">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Free Delivery Above PKR 5,000</span>
            </span>
          </div>

          {/* Main Hero Content & 3D Visual Cutout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center my-3 z-10">
            {/* Left Copy (7 Cols) */}
            <div className="md:col-span-7 space-y-2.5">
              <div className="inline-block bg-slate-950/15 backdrop-blur-sm text-slate-950 px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider">
                {slide.highlightText}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight drop-shadow-xs">
                {slide.title}
              </h1>

              <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-95 max-w-lg line-clamp-2">
                {slide.subtitle}
              </p>
            </div>

            {/* Right 3D Product Float Showcase (Enlarged Luxury Glassmorphism) */}
            <div className="md:col-span-5 relative flex items-center justify-center">
              <div className="relative group w-52 sm:w-60 md:w-68">
                {/* Ambient Halo Glow */}
                <div className="absolute inset-0 bg-white/25 rounded-3xl blur-2xl scale-95 transition-transform group-hover:scale-110 pointer-events-none" />

                {/* Blended Glassmorphic Product Card */}
                <div className="relative w-full rounded-3xl p-3.5 bg-black/30 backdrop-blur-xl border border-white/30 shadow-2xl flex flex-col justify-between overflow-hidden transform group-hover:-translate-y-1.5 transition-all duration-300">
                  {/* Product Image Frame */}
                  <div className="relative w-full h-36 sm:h-42 md:h-46 rounded-2xl overflow-hidden bg-black/20 border border-white/15 shadow-inner">
                    <img
                      src={slide.productImage}
                      alt={slide.productTitle}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <span className="absolute top-2.5 left-2.5 bg-slate-950/90 backdrop-blur-md text-amber-400 border border-amber-400/30 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg shadow-sm">
                      {slide.floatingBadge}
                    </span>
                  </div>

                  {/* Blended Product Information */}
                  <div className="pt-3 space-y-1.5 text-white">
                    <div className="text-xs sm:text-sm font-bold text-white line-clamp-1 leading-snug drop-shadow-sm">
                      {slide.productTitle}
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-base sm:text-lg lg:text-xl font-black text-amber-300 tracking-tight">
                          {slide.productPrice}
                        </span>
                        <span className="text-xs text-white/60 line-through">
                          {slide.productOriginalPrice}
                        </span>
                      </div>
                      <span className="text-xs text-amber-300 font-black bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/20 shadow-xs">
                        {slide.productRating}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions & Slider Controls */}
          <div className="flex flex-row items-center justify-between gap-3 z-10 pt-3 border-t border-black/10">
            <div className="flex items-center gap-3">
              <Link
                href={slide.primaryHref}
                className="bg-slate-950 hover:bg-slate-900 text-white font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-all"
              >
                <span>{slide.primaryCta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              {/* Slider Dots */}
              <div className="flex items-center gap-1.5">
                {HERO_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      currentSlide === idx
                        ? "w-6 bg-slate-950"
                        : "w-2 bg-slate-950/30 hover:bg-slate-950/60"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Slider Arrow Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  setCurrentSlide(
                    (prev) =>
                      (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length,
                  )
                }
                className="p-2 rounded-full bg-white/90 hover:bg-white text-slate-950 shadow-xs hover:scale-105 transition-all cursor-pointer"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)
                }
                className="p-2 rounded-full bg-white/90 hover:bg-white text-slate-950 shadow-xs hover:scale-105 transition-all cursor-pointer"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. Right Side Showcase Cards (Compact Stack) ────────────────── */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
          {/* Card 1: Live Lightning Deal Product Showcase */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-4 sm:p-5 border border-slate-800 flex flex-col justify-between shadow-md relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-400" />
                <span>DEAL OF THE DAY</span>
              </span>

              {/* Ticking countdown */}
              <div className="flex items-center gap-1 font-mono font-black text-xs text-amber-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-white/10">
                <Clock className="w-3 h-3" />
                <span>{String(timeLeft.hours).padStart(2, "0")}:</span>
                <span>{String(timeLeft.minutes).padStart(2, "0")}:</span>
                <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
              </div>
            </div>

            {/* Featured Deal Product Visual Layout */}
            <div className="flex items-center gap-3 my-2.5 bg-white/5 p-2.5 rounded-xl border border-white/10">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0 relative">
                {dealProduct?.imageUrl ? (
                  <img
                    src={dealProduct.imageUrl}
                    alt={dealProduct.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                )}
                {dealProduct?.discountPercent ? (
                  <span className="absolute top-0.5 left-0.5 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                    -{dealProduct.discountPercent}% OFF
                  </span>
                ) : null}
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="truncate">{dealProduct?.storeName || "Waw Marketplace"}</span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 leading-snug">
                  {dealProduct?.title || "Loading deal..."}
                </h4>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-amber-400">
                    PKR {(dealProduct?.pricePkr || 0).toLocaleString()}
                  </span>
                  {dealProduct?.originalPricePkr ? (
                    <span className="text-[10px] text-slate-500 line-through">
                      PKR {dealProduct.originalPricePkr.toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 1-Click Buy Action */}
            <button
              onClick={handleQuickAdd}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                dealAdded
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-400 hover:bg-amber-500 text-slate-950"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>
                {dealAdded ? "ADDED TO CART!" : dealProduct ? `CLAIM DEAL FOR PKR ${dealProduct.pricePkr.toLocaleString()}` : "LOADING DEAL..."}
              </span>
            </button>
          </div>

          {/* Card 2: 100% Buyer Protection & Smart Savings */}
          <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 text-slate-950 rounded-3xl p-4 sm:p-5 border border-amber-300 flex flex-col justify-between shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>SECURE CHECKOUT</span>
              </span>
              <span className="text-[10px] font-black text-slate-950 bg-white/90 px-2 py-0.5 rounded-md border border-amber-200">
                100% SAFE
              </span>
            </div>

            <div className="space-y-1 my-2">
              <h3 className="text-sm sm:text-base font-black text-slate-950 leading-snug">
                Save PKR 100 on Every Order!
              </h3>
              <p className="text-xs text-slate-700 leading-snug font-medium line-clamp-2">
                Pay online using Debit / Credit Card or Instant QR to waive the
                standard COD handling fee.
              </p>
            </div>

            <Link
              href="/buyer-protection"
              className="text-xs font-black text-slate-950 bg-white hover:bg-slate-950 hover:text-white px-3.5 py-2 rounded-xl border border-amber-300 shadow-2xs flex items-center justify-between transition-all group"
            >
              <span>Learn about Buyer Protection & Escrow</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      
    </section>
  );
}
