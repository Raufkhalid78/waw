"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Zap,
  ShieldCheck,
  ShoppingBag,
  CheckCircle2,
  Tag
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { fetchProducts, fetchHeroBanners, HeroBannerSlide } from "@/lib/api";
import { ProductDetail } from "@/types/models";

const FALLBACK_HERO_SLIDES: HeroBannerSlide[] = [
  {
    id: "slide_1",
    badge: "FESTIVE COLLECTION",
    title: "Designer Lawn & Luxury Festive Suits",
    description: "Authentic embroidered lawn from top fashion houses in Karachi & Lahore with free nationwide delivery.",
    imageUrl: "/images/showcase/hero-fashion.svg",
    href: "/category/fashion-lawn",
  },
  {
    id: "slide_2",
    badge: "PREMIUM TECH",
    title: "Next-Gen Audio & Smart Devices",
    description: "Upgrade your lifestyle with our curated collection of verified electronics and premium accessories.",
    imageUrl: "/images/showcase/hero-tech.svg",
    href: "/category/electronics",
  }
];

export function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dealProduct, setDealProduct] = useState<ProductDetail | null>(null);
  const [dealAdded, setDealAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const [slides, setSlides] = useState<HeroBannerSlide[]>(FALLBACK_HERO_SLIDES);

  useEffect(() => {
    fetchHeroBanners().then((cmsSlides) => {
      if (cmsSlides.length > 0) setSlides(cmsSlides);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts({ limit: 10 })
      .then(({ items }) => {
        const discounted = items.filter((p) => p.discountPercent && p.discountPercent > 5);
        if (discounted.length > 0) setDealProduct(discounted[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[currentSlide] ?? FALLBACK_HERO_SLIDES[0];

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
    <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-4 pb-2">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch min-h-[460px]">
        
        {/* 1. Main Hero Carousel (8 Cols) */}
          <div className={`xl:col-span-8 rounded-[2rem] overflow-hidden relative group bg-slate-900 text-white transition-colors duration-700 ease-in-out`}>
          
          {/* Background Ambient Glow */}
          <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent pointer-events-none" />

          <div className="absolute inset-0 flex flex-col md:flex-row items-center justify-between p-8 sm:p-10 lg:p-12 z-10 h-full">
            
            {/* Content Left */}
            <div className="w-full md:w-1/2 flex flex-col justify-center space-y-6 h-full relative z-20">
              
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 bg-white/10 text-white backdrop-blur-md border border-white/20 text-xs font-semibold px-3.5 py-1.5 rounded-full tracking-wide">
                  <Tag className="w-3.5 h-3.5" />
                  {slide.badge}
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-medium tracking-tight leading-[1.1]">
                  {slide.title}
                </h1>
                {slide.description ? (
                  <p className="text-sm sm:text-base opacity-80 leading-relaxed max-w-sm font-light">
                    {slide.description}
                  </p>
                ) : null}
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Link
                  href={slide.href}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] bg-white text-slate-900 hover:bg-slate-100"
                >
                  Shop Now
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Image Right */}
            <div className="w-full md:w-1/2 h-48 md:h-full relative mt-8 md:mt-0 flex items-center justify-end z-10">
               <div className="relative w-full h-[120%] -right-12 md:-right-24 top-0 md:top-8 overflow-hidden rounded-[2rem] md:rounded-[3rem] shadow-2xl rotate-[-2deg] group-hover:rotate-[-1deg] group-hover:scale-105 transition-all duration-700 ease-out">
                  <Image
                    src={slide.imageUrl}
                    alt={slide.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
               </div>
            </div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-8 left-8 sm:left-10 lg:left-12 flex items-center gap-3 z-30">
            <div className="flex gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentSlide === idx
                      ? "w-8 bg-white"
                      : "w-2 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 2. Right Stack (4 Cols) */}
        <div className="xl:col-span-4 flex flex-col gap-5 min-h-[460px]">
          
          {/* Card 1: Deal of the Day (Glass/Refined) */}
          <div className="flex-1 bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-rose-600" />
                Lightning Deal
              </span>
            </div>

            <div className="flex items-center gap-4 my-2">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0 relative">
                {dealProduct?.imageUrl ? (
                  <Image
                    src={dealProduct.imageUrl}
                    alt={dealProduct.title}
                    fill
                    sizes="80px"
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="truncate">{dealProduct?.storeName || "Waw Marketplace"}</span>
                </div>
                <h4 className="text-sm font-medium text-slate-900 line-clamp-2 leading-snug">
                  {dealProduct?.title || "Curating today's best deal..."}
                </h4>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-base font-semibold text-slate-900">
                    PKR {(dealProduct?.pricePkr || 0).toLocaleString()}
                  </span>
                  {dealProduct?.originalPricePkr ? (
                    <span className="text-xs text-slate-400 line-through">
                      {(dealProduct.originalPricePkr).toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <button
              onClick={handleQuickAdd}
              className={`w-full mt-4 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                dealAdded
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {dealAdded ? "Added to Cart" : "Claim Lightning Deal"}
            </button>
          </div>

          {/* Card 2: Trust & Savings */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-[2rem] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                100% Safe Checkout
              </span>
            </div>

            <div className="space-y-1.5 mb-4">
              <h3 className="text-base font-medium text-slate-900">
                Save PKR 100 on Orders
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-[90%]">
                Pay online using Debit / Credit Card to waive the standard COD fee.
              </p>
            </div>

            <Link
              href="/buyer-protection"
              className="inline-flex items-center text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors group/link"
            >
              Learn about Buyer Protection
              <ArrowRight className="w-4 h-4 ml-1 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
