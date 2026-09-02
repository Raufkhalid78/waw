"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProductDetail } from "@/types/models";
import { fetchProducts } from "@/lib/api";
import { useEffect } from "react";
import { ProductCard } from "@/components/ui/ProductCard";
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  ChevronDown,
  Star,
  Zap,
  CheckCircle2,
  Store,
  MapPin,
  Flame,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react";
import { SellerType } from "@waw/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryParam = searchParams.get("q") || "";
  const categoryParam =
    searchParams.get("category") || searchParams.get("cat") || "All Categories";
  const cityParam = searchParams.get("city") || "All Cities";

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedCity, setSelectedCity] = useState(cityParam);
  const [selectedSellerType, setSelectedSellerType] = useState<
    "ALL" | "1P" | "3P"
  >("ALL");
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<
    "featured" | "price_asc" | "price_desc" | "rating" | "popular"
  >("featured");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [facets, setFacets] = useState<any>({ minPrice: 0, maxPrice: 100000, cities: [], sellerTypes: [], categories: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchProducts({
      q: searchQuery.trim() ? searchQuery : undefined,
      category:
        selectedCategory !== "All Categories" ? selectedCategory : undefined,
    }).then((data) => {
      if (active) {
        setProducts(data?.items || []);
        if (data?.facets) setFacets(data.facets);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [searchQuery, selectedCategory]);

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((prod) => {
        // Query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = prod.title?.toLowerCase().includes(q);
          const matchesCat = prod.category?.toLowerCase().includes(q);
          const matchesStore = prod.storeName?.toLowerCase().includes(q);
          const matchesDesc = prod.description?.toLowerCase().includes(q);
          if (!matchesTitle && !matchesCat && !matchesStore && !matchesDesc)
            return false;
        }

        // Category filter
        if (
          selectedCategory !== "All Categories" &&
          prod.category.toLowerCase() !== selectedCategory.toLowerCase() &&
          prod.categorySlug?.toLowerCase() !== selectedCategory.toLowerCase()
        ) {
          return false;
        }

        // City filter
        if (
          selectedCity !== "All Cities" &&
          (prod.sellerCity || "").toLowerCase() !== selectedCity.toLowerCase()
        ) {
          return false;
        }

        // Seller Type filter
        if (
          selectedSellerType === "1P" &&
          prod.sellerType !== SellerType.FIRST_PARTY
        ) {
          return false;
        }
        if (
          selectedSellerType === "3P" &&
          prod.sellerType !== SellerType.THIRD_PARTY
        ) {
          return false;
        }

        // Price filter
        if (minPrice !== undefined && prod.pricePkr < minPrice) {
          return false;
        }
        if (maxPrice !== undefined && prod.pricePkr > maxPrice) {
          return false;
        }

        // Rating filter
        if (minRating > 0 && (prod.rating ?? 0) < minRating) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") return a.pricePkr - b.pricePkr;
        if (sortBy === "price_desc") return b.pricePkr - a.pricePkr;
        if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
        if (sortBy === "popular") return (b.soldCount ?? 0) - (a.soldCount ?? 0);
        return 0; // 'featured'
      });
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedCity,
    selectedSellerType,
    minPrice,
    maxPrice,
    minRating,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setSelectedCategory("All Categories");
    setSelectedCity("All Cities");
    setSelectedSellerType("ALL");
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinRating(0);
    setSortBy("featured");
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedCategory !== "All Categories" ||
    selectedCity !== "All Cities" ||
    selectedSellerType !== "ALL" ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    minRating > 0 ||
    searchQuery !== "";

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-6 space-y-6">
      {/* ── Search Header & Active Query Status ────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              {searchQuery
                ? `Search results for "${searchQuery}"`
                : selectedCategory !== "All Categories"
                  ? selectedCategory
                  : "All Marketplace Products"}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Showing{" "}
              <strong className="text-slate-900">
                {filteredProducts.length}
              </strong>{" "}
              items from verified Pakistani brands & makers
            </p>
          </div>

          {/* Sort & Mobile Filter Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold rounded-2xl transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold hidden sm:inline">
                Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "featured" | "price_asc" | "price_desc" | "rating" | "popular")}
                className="bg-slate-50 border border-slate-200 text-slate-900 font-bold px-3 py-2.5 rounded-2xl outline-none cursor-pointer text-xs focus:ring-2 focus:ring-amber-400"
              >
                <option value="featured">Featured / Best Match</option>
                <option value="popular">Most Popular / High Sales</option>
                <option value="rating">Highest Customer Rating</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-bold text-[11px] uppercase">
              Active:
            </span>

            {selectedCategory !== "All Categories" && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 font-bold px-2.5 py-1 rounded-full text-[11px]">
                {selectedCategory}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setSelectedCategory("All Categories")}
                />
              </span>
            )}

            {selectedCity !== "All Cities" && (
              <span className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-900 font-bold px-2.5 py-1 rounded-full text-[11px]">
                📍 {selectedCity}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setSelectedCity("All Cities")}
                />
              </span>
            )}

            {selectedSellerType !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold px-2.5 py-1 rounded-full text-[11px]">
                {selectedSellerType === "1P"
                  ? "⚡ Waw Express 1P"
                  : "🏬 Verified 3P Store"}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setSelectedSellerType("ALL")}
                />
              </span>
            )}

            {minRating > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 font-bold px-2.5 py-1 rounded-full text-[11px]">
                ★ {minRating}+ Stars
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setMinRating(0)}
                />
              </span>
            )}

            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline ml-2 cursor-pointer"
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* ── Main Catalog Body: Sidebar Filters + Products Grid ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Filter Sidebar (3 Cols) ────────────────────────────────────── */}
        <aside
          className={`lg:col-span-3 lg:block ${mobileFilterOpen ? "block" : "hidden"} space-y-6`}
        >
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-950 uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-500" />
                <span>Filters</span>
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* 1. Category Filter */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                Category
              </label>
              <div className="space-y-1">
                {["All Categories", ...(facets.categories || [])].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      selectedCategory === cat
                        ? "bg-slate-950 text-amber-400 font-black shadow-xs"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{cat}</span>
                    {selectedCategory === cat && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Price Range (PKR) */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                Price Range (PKR)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={facets.maxPrice || 100000}
                  value={minPrice !== undefined ? minPrice : ""}
                  onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Min"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-slate-400 text-xs font-bold">-</span>
                <input
                  type="number"
                  min="0"
                  max={facets.maxPrice || 100000}
                  value={maxPrice !== undefined ? maxPrice : ""}
                  onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Max"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <input
                type="range"
                min={facets.minPrice || 0}
                max={facets.maxPrice || 100000}
                step="250"
                value={maxPrice !== undefined ? maxPrice : (facets.maxPrice || 100000)}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>PKR {facets.minPrice || 0}</span>
                <span>PKR {(maxPrice !== undefined ? maxPrice : (facets.maxPrice || 100000)).toLocaleString()}</span>
              </div>
            </div>

            {/* 3. Fulfillment Type */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                Fulfillment
              </label>
              <div className="space-y-1.5">
                {[
                  { key: "ALL", label: "All Verified Sellers" },
                  { key: "1P", label: "⚡ Waw Express 1P Direct" },
                  { key: "3P", label: "🏬 Verified 3P Artisans" },
                ].map((type) => (
                  <button
                    key={type.key}
                    onClick={() => setSelectedSellerType(type.key as "ALL" | "1P" | "3P")}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      selectedSellerType === type.key
                        ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Seller City Origin */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                Seller City
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                {(facets.cities || []).map((city: string) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Customer Rating */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                Customer Rating
              </label>
              <div className="space-y-1">
                {[4, 4.5, 4.8].map((rating) => (
                  <button
                    key={rating}
                    onClick={() =>
                      setMinRating(minRating === rating ? 0 : rating)
                    }
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors ${
                      minRating === rating
                        ? "bg-amber-50 text-amber-900 font-bold border border-amber-200"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                    <span>{rating}★ & above</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Product Grid (9 Cols) ───────────────────────────────────────── */}
        <main className="lg:col-span-9 space-y-6">
          {loading ? (
            <div className="w-full flex items-center justify-center py-20 text-slate-400 animate-pulse">
              Loading products...
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {filteredProducts.map((prod) => (
                <ProductCard
                  key={prod.productId}
                  productId={prod.productId}
                  title={prod.title}
                  pricePkr={prod.pricePkr}
                  originalPricePkr={prod.originalPricePkr}
                  discountPercent={prod.discountPercent}
                  rating={prod.rating}
                  reviewsCount={prod.reviewsCount}
                  soldCount={prod.soldCount}
                  isExpress={prod.isExpress}
                  sellerType={prod.sellerType}
                  storeName={prod.storeName}
                  sellerCity={prod.sellerCity}
                  imageUrl={prod.images?.[0] || prod.imageUrl || ""}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-950">
                  No matching items found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your price range, clearing active filters, or
                  searching for broader terms like &quot;leather&quot;,
                  &quot;lawn&quot;, or &quot;earbuds&quot;.
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-full text-xs transition-all shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-bold text-slate-400">
          Loading catalog...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

