"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchCategoryBySlug, fetchProducts } from "@/lib/api";
import { logger } from "@/lib/logger";
import { ProductCard } from "@/components/ui/ProductCard";
import { useCartStore } from "@/store/useCartStore";
import { Category } from "@waw/types";
import { ProductDetail } from "@/types/models";
import {
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  Truck,
  Package,
  ArrowRight,
  AlertCircle,
  Zap,
} from "lucide-react";
import { FadeIn } from "@/components/Motion";

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

export default function CategoryPage() {
  const params = useParams();
  const slug = (params.slug as string) || "leather-craft";
  const { language } = useCartStore();
  const isUrdu = language === "UR";

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [selectedSellerType, setSelectedSellerType] = useState<
    "ALL" | "1P" | "3P"
  >("ALL");
  const [userMaxPrice, setUserMaxPrice] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<
    "featured" | "price-asc" | "price-desc" | "rating"
  >("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [facets, setFacets] = useState<any>({ minPrice: 0, maxPrice: 500000, cities: [], sellerTypes: [] });
  const [error, setError] = useState<string | null>(null);

  const loadCategoryData = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      const [catData, prodData] = await Promise.all([
        pageNum === 1 ? fetchCategoryBySlug(slug) : Promise.resolve(category),
        fetchProducts({
          categorySlug: slug,
          city: selectedCity !== "All Cities" ? selectedCity : undefined,
          sellerType: selectedSellerType,
          maxPrice: userMaxPrice,
          minRating: minRating > 0 ? minRating : undefined,
          inStock: inStockOnly || undefined,
          sortBy,
          page: pageNum,
          limit: 24,
        }),
      ]);
      if (pageNum === 1) setCategory(catData);
      if (prodData) {
        setProducts((prev) => append ? [...prev, ...(prodData.items || [])] : (prodData.items || []));
        if (prodData.facets) setFacets(prodData.facets);
        setHasMore((prodData.items || []).length === 24);
      }
    } catch (err: any) {
      logger.error("Failed to load category data", "Category", err);
      setError("Unable to load category offers from the database. Please retry.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [slug, selectedCity, selectedSellerType, userMaxPrice, minRating, inStockOnly, sortBy]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadCategoryData(1, false);
  }, [loadCategoryData]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadCategoryData(nextPage, true);
    }
  };

  // Fallback category metadata if database lookup is pending/offline
  const categoryTitle = isUrdu
    ? category?.nameUrdu || category?.name || slug.replace(/-/g, " ").toUpperCase()
    : category?.name || slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const categoryDesc = isUrdu
    ? category?.descriptionUrdu || category?.description || "پاکستان کی تصدیق شدہ مصنوعات"
    : category?.description || "Verified authentic marketplace collection from Pakistan.";

  if (!loading && !category && products.length === 0 && error) {
    return (
      <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-20 text-center space-y-4">
        <h1 className="text-2xl font-black text-slate-900">Category Not Found</h1>
        <p className="text-slate-500 font-medium">The category you are looking for does not exist or is currently inactive.</p>
        <Link href="/" className="inline-block mt-4 bg-amber-500 text-slate-950 px-6 py-2.5 rounded-full font-black uppercase text-sm tracking-wider">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8 space-y-8">
      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-amber-600 transition-colors">
          {isUrdu ? "ہوم" : "Home"}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">{categoryTitle}</span>
      </nav>

      {/* ── Category Hero Banner ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-800">
        <div className="max-w-2xl space-y-2.5">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            {categoryTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            {categoryDesc}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
            <span className="bg-white/10 px-3 py-1 rounded-full font-bold">
              📦 {products.length} {isUrdu ? "مصنوعات" : "Items Available"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Subcategory Pills (If Available) ────────────────────────────── */}
      {category?.children && category.children.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/category/${child.slug}`}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-xs font-bold text-slate-800 whitespace-nowrap transition-all shadow-xs"
            >
              {isUrdu ? child.nameUrdu || child.name : child.name}
            </Link>
          ))}
        </div>
      )}

      {/* ── Main Catalog Grid & Filters ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Filter Sidebar (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-slate-950 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-500" />
              <span>{isUrdu ? "فلٹرز" : "Catalog Filters"}</span>
            </h3>
            <button
              onClick={() => {
                setSelectedSellerType("ALL");
                setUserMaxPrice(undefined);
                setMinRating(0);
                setSelectedCity("All Cities");
              }}
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
            >
              {isUrdu ? "تمام ری سیٹ کریں" : "Reset All"}
            </button>
          </div>

          {/* City Filter (Dynamic) */}
          {facets.cities && facets.cities.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">
                {isUrdu ? "شہر:" : "Ships From:"}
              </div>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="All Cities">{isUrdu ? "تمام شہر" : "All Cities"}</option>
                {facets.cities.map((city: string) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          )}

          {/* Price Range (Dynamic) */}
          {facets.maxPrice > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>{isUrdu ? "زیادہ سے زیادہ قیمت:" : "Max Price:"}</span>
                <span className="text-amber-600">
                  Rs. {(userMaxPrice !== undefined ? userMaxPrice : facets.maxPrice).toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min={facets.minPrice || 0}
                max={facets.maxPrice || 500000}
                step={500}
                value={userMaxPrice !== undefined ? userMaxPrice : facets.maxPrice}
                onChange={(e) => setUserMaxPrice(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          )}

          {/* Rating Filter */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700">
              {isUrdu ? "کسٹمر ریٹنگ:" : "Minimum Rating:"}
            </div>
            <div className="space-y-1">
              {[4, 3, 2, 1].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setMinRating(minRating === rating ? 0 : rating)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    minRating === rating
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-3 h-3 ${i < rating ? "text-amber-400 fill-amber-400" : "text-slate-300 fill-slate-300"}`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span>& Up</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fulfillment Type */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700">
              {isUrdu ? "ماڈل:" : "Fulfillment Model:"}
            </div>
            <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-[11px] font-bold text-center">
              {[
                { id: "ALL", label: isUrdu ? "تمام" : "All" },
                { id: "1P", label: "⚡ 1P" },
                { id: "3P", label: "🏬 3P" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedSellerType(m.id as "ALL" | "1P" | "3P")}
                  className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                    selectedSellerType === m.id
                      ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* In Stock Only */}
          <div className="space-y-2">
            <button
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                inStockOnly
                  ? "bg-green-500 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                inStockOnly ? "border-white bg-white/20" : "border-slate-300"
              }`}>
                {inStockOnly && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {isUrdu ? "صرف دستیاب" : "In Stock Only"}
            </button>
          </div>
        </div>

        {/* Right Products Catalog (9 cols) */}
        <div className="lg:col-span-9 space-y-6">
          {/* Sort Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-600 font-medium">
              {isUrdu ? (
                <>
                  دستیاب مصنوعات: <strong className="text-slate-950 font-black">{products.length}</strong>
                </>
              ) : (
                <>
                  Showing <strong className="text-slate-950 font-black">{products.length}</strong> matching verified items
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 mr-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === "grid" ? "bg-white shadow-sm text-amber-600" : "text-slate-500 hover:text-slate-700"
                  }`}
                  title="Grid View"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === "list" ? "bg-white shadow-sm text-amber-600" : "text-slate-500 hover:text-slate-700"
                  }`}
                  title="List View"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{isUrdu ? "ترتیب:" : "Sort by:"}</span>
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "featured" | "price-asc" | "price-desc" | "rating")}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="featured">{isUrdu ? "نمایاں" : "Featured & Best Selling"}</option>
                <option value="price-asc">{isUrdu ? "قیمت: کم سے زیادہ" : "Price: Low to High"}</option>
                <option value="price-desc">{isUrdu ? "قیمت: زیادہ سے کم" : "Price: High to Low"}</option>
                <option value="rating">{isUrdu ? "بہترین ریٹنگ" : "Highest Customer Rating"}</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(selectedCity !== "All Cities" || selectedSellerType !== "ALL" || userMaxPrice !== undefined || minRating > 0 || inStockOnly) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Active filters:</span>
              {selectedCity !== "All Cities" && (
                <button onClick={() => setSelectedCity("All Cities")} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[11px] font-bold hover:bg-amber-100 transition-colors cursor-pointer">
                  {selectedCity} <span className="text-amber-400">×</span>
                </button>
              )}
              {selectedSellerType !== "ALL" && (
                <button onClick={() => setSelectedSellerType("ALL")} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[11px] font-bold hover:bg-amber-100 transition-colors cursor-pointer">
                  {selectedSellerType} <span className="text-amber-400">×</span>
                </button>
              )}
              {userMaxPrice !== undefined && (
                <button onClick={() => setUserMaxPrice(undefined)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[11px] font-bold hover:bg-amber-100 transition-colors cursor-pointer">
                  Max PKR {userMaxPrice.toLocaleString()} <span className="text-amber-400">×</span>
                </button>
              )}
              {minRating > 0 && (
                <button onClick={() => setMinRating(0)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[11px] font-bold hover:bg-amber-100 transition-colors cursor-pointer">
                  {minRating}★ & Up <span className="text-amber-400">×</span>
                </button>
              )}
              {inStockOnly && (
                <button onClick={() => setInStockOnly(false)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full text-[11px] font-bold hover:bg-green-100 transition-colors cursor-pointer">
                  In Stock <span className="text-green-400">×</span>
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedCity("All Cities");
                  setSelectedSellerType("ALL");
                  setUserMaxPrice(undefined);
                  setMinRating(0);
                  setInStockOnly(false);
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-700 underline cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Products Grid */}
          <FadeIn delay={100}>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-950">
                  {isUrdu ? "زمرہ کی تفصیلات حاصل کرنے میں مسئلہ پیش آیا" : "Catalog Temporarily Unavailable"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {error}
                </p>
              </div>
              <button
                onClick={() => loadCategoryData(1, false)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-xs transition-all cursor-pointer"
              >
                <span>{isUrdu ? "دوبارہ کوشش کریں" : "Retry Connection"}</span>
              </button>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className={viewMode === "grid" 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                : "flex flex-col gap-3"
              }>
                {products.map((prod) => (
                  viewMode === "grid" ? (
                    <ProductCard
                      key={prod.productId || prod.id}
                      productId={prod.productId || prod.id}
                      title={prod.title}
                      pricePkr={prod.pricePkr}
                      originalPricePkr={prod.originalPricePkr}
                      discountPercent={prod.discountPercent}
                      imageUrl={prod.images?.[0] || prod.imageUrl}
                      rating={prod.rating}
                      reviewsCount={prod.reviewsCount}
                      sellerType={prod.sellerType}
                      storeName={prod.storeName}
                      sellerCity={prod.sellerCity}
                      isExpress={prod.isExpress}
                      soldCount={prod.soldCount}
                    />
                  ) : (
                    <div
                      key={prod.productId || prod.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 hover:shadow-md transition-shadow"
                    >
                      <img
                        src={prod.images?.[0] || prod.imageUrl || "/placeholder.png"}
                        alt={prod.title}
                        className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          {prod.isExpress && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" /> Express
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500">{prod.storeName}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{prod.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-slate-900">PKR {prod.pricePkr.toLocaleString()}</span>
                          {prod.originalPricePkr && (
                            <span className="text-xs text-slate-400 line-through">PKR {prod.originalPricePkr.toLocaleString()}</span>
                          )}
                          {prod.discountPercent && prod.discountPercent > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">-{prod.discountPercent}%</span>
                          )}
                        </div>
                        {prod.rating && prod.rating > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <div className="flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded">
                              <svg className="w-3 h-3 text-emerald-600 fill-emerald-600" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="font-bold text-emerald-700">{prod.rating.toFixed(1)}</span>
                            </div>
                            <span className="text-slate-400">({prod.reviewsCount || 0})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-8 py-3 bg-white border-2 border-slate-200 hover:border-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingMore ? "Loading..." : "Load More Products"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Package className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-950">
                  {isUrdu ? "اس زمرے میں فی الحال کوئی مصنوعات نہیں ہیں" : "No Items Currently Listed in This Category"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isUrdu
                    ? "ہماری تصدیق شدہ دکانیں جلد نئی مصنوعات شامل کریں گی۔"
                    : "Our verified Pakistani artisans and suppliers update their collections regularly. Check back soon or explore other categories."}
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-xs transition-all"
              >
                <span>{isUrdu ? "دیگر زمرہ جات دیکھیں" : "Explore All Categories"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
