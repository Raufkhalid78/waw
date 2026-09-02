"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";
import { CategoryCircles } from "@/components/home/CategoryCircles";
import { HeroBanner } from "@/components/home/HeroBanner";
import { FlashDeals } from "@/components/home/FlashDeals";
import { FeaturedBrands } from "@/components/home/FeaturedBrands";
import { StoreSpotlight } from "@/components/home/StoreSpotlight";
import { ProductCard } from "@/components/ui/ProductCard";
import { Flame, ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Package, AlertCircle } from "lucide-react";
import { fetchProducts, fetchCategories } from "@/lib/api";

function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-4 space-y-4 animate-pulse shadow-xs">
      <div className="w-full aspect-square bg-slate-100 rounded-2xl" />
      <div className="space-y-2 pt-1">
        <div className="h-3.5 bg-slate-100 rounded-full w-4/5" />
        <div className="h-3 bg-slate-100 rounded-full w-1/2" />
        <div className="h-4.5 bg-slate-200 rounded-full w-2/5 pt-1" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [liveProducts, setLiveProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [dbCategories, setDbCategories] = useState<{ name: string; slug: string }[]>([]);
  const [cmsContent, setCmsContent] = useState<any>(null);

  const checkTabScroll = () => {
    if (tabScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabScrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // Load DB-backed categories for tabs
  useEffect(() => {
    fetchCategories("en")
      .then((cats) => {
        const flat = cats.flatMap((c: any) => [c, ...(c.children || [])]);
        setDbCategories(flat.map((c: any) => ({ name: c.name, slug: c.slug })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    checkTabScroll();
    const el = tabScrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkTabScroll);
      return () => el.removeEventListener("scroll", checkTabScroll);
    }
  }, [dbCategories]);

  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts(
        activeCategory ? { categorySlug: activeCategory } : undefined
      );
      setLiveProducts(data.items || []);
    } catch (err: any) {
      logger.error("Failed to load catalog", "Homepage", err);
      setError("Unable to load latest offers from the marketplace catalog. Please check your connection or retry.");
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/content`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data?.content)) {
          const claim = data.content.find((c: any) => c.key_slug === 'buyer-protection-claim');
          if (claim) setCmsContent(claim);
        }
      })
      .catch((err) => logger.error("Failed to load CMS content", "Homepage", err));
  }, []);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabScrollRef.current) {
      const amount = direction === "left" ? -220 : 220;
      tabScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
      setTimeout(checkTabScroll, 300);
    }
  };

  return (
    <div className="space-y-3 pb-20">
      {/* 1. Hero Banner Carousel */}
      <HeroBanner />

      {/* 2. Flash Deals */}
      <FlashDeals />

      {/* 3. DB-backed Category Circles */}
      <CategoryCircles />

      {/* 2. Live Marketplace Catalog */}
      <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-5">
        <div className="bg-white border border-slate-200/90 rounded-[36px] p-6 sm:p-9 shadow-xs space-y-7">
          {/* Section Heading & Category Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
                  <Flame className="w-5 h-5 fill-slate-950" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  Trending in Pakistan
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
                Discover authentic products from verified merchants across Pakistan.
              </p>
            </div>

            {/* DB-backed Category Filter Tabs */}
            {dbCategories.length > 0 && (
              <div className="flex items-center gap-2 max-w-full md:max-w-md relative">
                {canScrollLeft && (
                  <button
                    onClick={() => scrollTabs("left")}
                    className="p-2 rounded-full bg-white border border-slate-200 shadow-xs text-slate-700 hover:text-amber-600 shrink-0 cursor-pointer"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <div
                  ref={tabScrollRef}
                  className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-1"
                >
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      activeCategory === null
                        ? "bg-slate-950 text-amber-400 shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    All Products
                  </button>
                  {dbCategories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => setActiveCategory(cat.slug)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        activeCategory === cat.slug
                          ? "bg-slate-950 text-amber-400 shadow-md"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {canScrollRight && (
                  <button
                    onClick={() => scrollTabs("right")}
                    className="p-2 rounded-full bg-white border border-slate-200 shadow-xs text-slate-700 hover:text-amber-600 shrink-0 cursor-pointer"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16 space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Catalog Temporarily Unavailable</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {error}
              </p>
              <button
                onClick={loadCatalog}
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer"
              >
                <span>Retry Connection</span>
              </button>
            </div>
          ) : liveProducts.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Package className="w-7 h-7" />
              </div>
              <p className="text-slate-500 font-bold">
                No products found in this category yet.
              </p>
              {activeCategory && (
                <button
                  onClick={() => setActiveCategory(null)}
                  className="text-xs font-black text-amber-600 underline"
                >
                  View all products
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {liveProducts.map((prod) => (
                <ProductCard
                  key={prod.productId}
                  productId={prod.productId}
                  title={prod.title}
                  storeName={prod.storeName}
                  sellerCity={prod.sellerCity}
                  pricePkr={prod.pricePkr}
                  originalPricePkr={prod.originalPricePkr}
                  discountPercent={prod.discountPercent}
                  rating={prod.rating}
                  reviewsCount={prod.reviewsCount}
                  soldCount={prod.soldCount}
                  imageUrl={prod.imageUrl}
                  isExpress={prod.isExpress}
                  sellerType={prod.sellerType}
                />
              ))}
            </div>
          )}

          {/* View More */}
          <div className="text-center pt-5">
            <Link
              href="/category/mobiles-tech"
              className="inline-flex items-center gap-2.5 bg-slate-950 hover:bg-slate-900 text-amber-400 px-9 py-4 rounded-2xl text-sm sm:text-base font-black shadow-lg hover:scale-105 transition-all cursor-pointer"
            >
              <span>EXPLORE ALL PRODUCTS</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Buyer Protection Banner */}
      <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-5">
        <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white rounded-[36px] p-7 sm:p-12 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 text-amber-400 text-xs sm:text-sm font-black uppercase tracking-wider">
              <ShieldCheck className="w-5 h-5" />
              <span>{cmsContent?.title || "Secure Payments"}</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Shop with Confidence on WAW
            </h3>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              {cmsContent?.content_html || "Direct from verified Pakistani sellers with doorstep delivery, easy returns, and dedicated customer care."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 relative z-10">
            <Link
              href="/buyer-protection"
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-7 py-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl hover:scale-105 transition-all"
            >
              <span>Learn About Buyer Protection</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/help"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black px-7 py-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all"
            >
              <span>Help & Support</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Featured Brand Hubs */}
      <FeaturedBrands />

      {/* 5. Store Spotlight */}
      <StoreSpotlight />
    </div>
  );
}
