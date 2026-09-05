"use client";

import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";
import { CategoryCircles } from "@/components/home/CategoryCircles";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ProductCard } from "@/components/ui/ProductCard";
import { JsonLdOrganization, JsonLdSearchBox } from "@/components/seo/JsonLd";
import { Flame, ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Package, AlertCircle } from "lucide-react";
import { fetchProducts, fetchCategories } from "@/lib/api";
import { FadeIn, Stagger } from "@/components/Motion";
import { RecentlyViewedSection } from "@/components/home/RecentlyViewedSection";

// Lazy-load below-fold components for better LCP
const FlashDeals = lazy(() => import("@/components/home/FlashDeals").then(m => ({ default: m.FlashDeals })));
const FeaturedBrands = lazy(() => import("@/components/home/FeaturedBrands").then(m => ({ default: m.FeaturedBrands })));
const StoreSpotlight = lazy(() => import("@/components/home/StoreSpotlight").then(m => ({ default: m.StoreSpotlight })));

function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 animate-pulse">
      <div className="w-full aspect-square bg-gray-100 rounded-lg mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-3.5 bg-gray-100 rounded w-4/5" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="flex items-center gap-1 mt-2">
          <div className="h-4 bg-gray-100 rounded w-8" />
          <div className="h-3 bg-gray-100 rounded w-12" />
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="h-5 bg-gray-100 rounded w-1/3 mb-2" />
          <div className="h-8 bg-gray-100 rounded w-full" />
        </div>
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
    <div className="space-y-4 pb-20">
      <JsonLdOrganization />
      <JsonLdSearchBox />
      {/* 1. Hero Banner Carousel */}
      <FadeIn>
        <HeroBanner />
      </FadeIn>

      {/* 2. Flash Deals */}
      <FadeIn delay={50}>
        <Suspense fallback={<div className="h-64 bg-gray-50 animate-pulse rounded-xl" />}>
          <FlashDeals />
        </Suspense>
      </FadeIn>

      {/* 3. DB-backed Category Circles */}
      <FadeIn delay={100}>
        <CategoryCircles />
      </FadeIn>

      {/* 4. Live Marketplace Catalog */}
      <FadeIn delay={150}>
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Section Header & Category Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Trending in Pakistan
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Discover authentic products from verified merchants across Pakistan.
              </p>
            </div>

            {/* DB-backed Category Filter Tabs */}
            {dbCategories.length > 0 && (
              <div className="flex items-center gap-1.5 max-w-full md:max-w-lg relative">
                {canScrollLeft && (
                  <button
                    onClick={() => scrollTabs("left")}
                    className="p-1.5 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-amber-600 shrink-0 cursor-pointer"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <div
                  ref={tabScrollRef}
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth"
                >
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      activeCategory === null
                        ? "bg-amber-400 text-slate-900"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    All Products
                  </button>
                  {dbCategories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => setActiveCategory(cat.slug)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        activeCategory === cat.slug
                          ? "bg-amber-400 text-slate-900"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {canScrollRight && (
                  <button
                    onClick={() => scrollTabs("right")}
                    className="p-1.5 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-amber-600 shrink-0 cursor-pointer"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Product Grid */}
          <div className="p-5">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Catalog Temporarily Unavailable</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {error}
                </p>
                <button
                  onClick={loadCatalog}
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 px-5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            ) : liveProducts.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Package className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-sm text-gray-500 font-medium">
                  No products found in this category yet.
                </p>
                {activeCategory && (
                  <button
                    onClick={() => setActiveCategory(null)}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline"
                  >
                    View all products
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
            {liveProducts.length > 0 && (
              <div className="text-center pt-5 border-t border-gray-100 mt-5">
                <Link
                  href="/categories"
                  className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                >
                  View All Products
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
      </FadeIn>

      {/* 5. Trust Badges */}
      <FadeIn delay={200}>
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: ShieldCheck, title: "100% Genuine", desc: "Verified sellers only", color: "text-green-600 bg-green-50" },
              { icon: Package, title: "Free Delivery", desc: "On orders over PKR 5,000", color: "text-amber-600 bg-amber-50" },
              { icon: "🔄", title: "7-Day Returns", desc: "Easy doorstep returns", color: "text-blue-600 bg-blue-50" },
              { icon: "🔒", title: "Secure Checkout", desc: "Encrypted payments", color: "text-purple-600 bg-purple-50" },
            ].map((badge, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl ${badge.color} flex items-center justify-center mx-auto mb-2`}>
                  {typeof badge.icon === "string" ? (
                    <span className="text-lg">{badge.icon}</span>
                  ) : (
                    <badge.icon className="w-5 h-5" />
                  )}
                </div>
                <div className="text-xs font-bold text-gray-900">{badge.title}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{badge.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* 6. Buyer Protection Banner */}
      <FadeIn delay={250}>
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10">
        <div className="bg-gray-900 text-white rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>{cmsContent?.title || "Secure Payments"}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold">
              Shop with Confidence on WAW
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed max-w-lg">
              {cmsContent?.content_html || "Direct from verified Pakistani sellers with doorstep delivery, easy returns, and dedicated customer care."}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/buyer-protection"
              className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-all"
            >
              Learn More
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/help"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold px-5 py-2.5 rounded-lg text-sm transition-all"
            >
              Help & Support
            </Link>
          </div>
        </div>
        </section>
      </FadeIn>

      {/* 7. Featured Brand Hubs */}
      <FadeIn delay={300}>
        <Suspense fallback={<div className="h-48 bg-gray-50 animate-pulse rounded-xl" />}>
          <FeaturedBrands />
        </Suspense>
      </FadeIn>

      {/* 8. Store Spotlight */}
      <FadeIn delay={350}>
        <Suspense fallback={<div className="h-48 bg-gray-50 animate-pulse rounded-xl" />}>
          <StoreSpotlight />
        </Suspense>
      </FadeIn>

      {/* 9. Recently Viewed */}
      <RecentlyViewedSection />
    </div>
  );
}
