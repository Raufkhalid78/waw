"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CATALOG_PRODUCTS } from "@/data/mockProducts";
import { ProductCard } from "@/components/ui/ProductCard";
import {
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Sparkles,
  ArrowUpDown,
  Truck,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

const CATEGORY_META: Record<
  string,
  {
    title: string;
    titleUrdu: string;
    desc: string;
    bannerGradient: string;
    filterCategory: string;
  }
> = {
  "mobiles-tech": {
    title: "Mobiles, Earbuds & Tech Accessories",
    titleUrdu: "موبائلز، ایئربڈز اور ٹیک آلات",
    desc: "High-performance audio, AMOLED smart watches, fast chargers & premium gadgetry.",
    bannerGradient: "from-sky-950 via-slate-900 to-indigo-950",
    filterCategory: "Mobiles & Tech",
  },
  electronics: {
    title: "Electronics & Gadgets",
    titleUrdu: "الیکٹرانکس اور گیجٹس",
    desc: "Explore authentic tech accessories with 100% Waw-backed buyer warranty.",
    bannerGradient: "from-blue-950 via-slate-900 to-sky-950",
    filterCategory: "Mobiles & Tech",
  },
  "leather-craft": {
    title: "Authentic Pure Leather Craft & Footwear",
    titleUrdu: "اصلی چمڑے کی مصنوعات اور پشاوری چپل",
    desc: "Handcrafted cow leather bifold wallets, Norozi Peshawari chappals & belts from master artisans.",
    bannerGradient: "from-amber-950 via-slate-900 to-stone-950",
    filterCategory: "Leather & Footwear",
  },
  "peshawari-chappal": {
    title: "Handmade Traditional Peshawari Chappals",
    titleUrdu: "ہاتھ سے تیار کردہ پشاوری چپل",
    desc: "Authentic tyre-sole and mustard leather Norozi chappals straight from Khyber Namak Mandi.",
    bannerGradient: "from-amber-950 via-amber-900 to-stone-950",
    filterCategory: "Leather & Footwear",
  },
  "sialkot-sports": {
    title: "Sialkot Export-Quality Match Sports",
    titleUrdu: "سیالکوٹ ایکسپورٹ کوالٹی اسپورٹس سامان",
    desc: "FIFA-grade hand-stitched footballs, English willow cricket bats & pro boxing gear.",
    bannerGradient: "from-emerald-950 via-slate-900 to-teal-950",
    filterCategory: "Sialkot Sports",
  },
  "womens-lawn": {
    title: "Women's Luxury Silk & Summer Lawn",
    titleUrdu: "خواتین کے لیے پرتعیش لان اور سلک",
    desc: "Embroidered unstitched 3-piece collections, pure chiffon dupattas & festive fabrics.",
    bannerGradient: "from-rose-950 via-slate-900 to-pink-950",
    filterCategory: "Women's Unstitched Apparel",
  },
  fashion: {
    title: "Fashion & Apparel",
    titleUrdu: "فیشن اور ملبوسات",
    desc: "Trendy lifestyle clothing, luxury lawn collections, and bespoke traditional footwear.",
    bannerGradient: "from-rose-950 via-slate-900 to-purple-950",
    filterCategory: "Women's Unstitched Apparel",
  },
  "home-heritage": {
    title: "Home & Pakistani Cultural Heritage",
    titleUrdu: "گھریلو سجاوٹ اور روایتی دستکاری",
    desc: "Multani blue pottery, handloom bedsheets, and brass decorative art.",
    bannerGradient: "from-amber-950 via-slate-900 to-orange-950",
    filterCategory: "Home & Heritage",
  },
};

const PAKISTAN_CITIES = [
  "All Cities",
  "Lahore",
  "Karachi",
  "Islamabad",
  "Peshawar",
  "Sialkot",
  "Multan",
];

export default function CategoryPage() {
  const params = useParams();
  const slug = (params.slug as string) || "leather-craft";
  const meta = CATEGORY_META[slug] || {
    title: slug.replace(/-/g, " ").toUpperCase(),
    titleUrdu: "واو مارکیٹ مصنوعات",
    desc: "Browse verified Pakistani products with secure payment protection.",
    bannerGradient: "from-slate-950 via-slate-900 to-amber-950",
    filterCategory: "Leather & Footwear",
  };

  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [selectedSellerType, setSelectedSellerType] = useState<
    "ALL" | "1P" | "3P"
  >("ALL");
  const [maxPrice, setMaxPrice] = useState<number>(10000);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<
    "featured" | "price-asc" | "price-desc" | "rating"
  >("featured");

  const filteredProducts = useMemo(() => {
    return CATALOG_PRODUCTS.filter((prod) => {
      // Category match
      const catMatch =
        prod.category
          .toLowerCase()
          .includes(meta.filterCategory.toLowerCase()) ||
        meta.filterCategory
          .toLowerCase()
          .includes(prod.category.toLowerCase()) ||
        slug === "all";

      if (
        !catMatch &&
        slug !== "all" &&
        slug !== "fashion" &&
        slug !== "electronics"
      )
        return false;

      // City filter
      if (
        selectedCity !== "All Cities" &&
        !prod.sellerCity.includes(selectedCity)
      ) {
        return false;
      }

      // Seller Type
      if (selectedSellerType === "1P" && prod.sellerType !== "FIRST_PARTY")
        return false;
      if (selectedSellerType === "3P" && prod.sellerType !== "THIRD_PARTY")
        return false;

      // Price Range
      if (prod.pricePkr > maxPrice) return false;

      // Rating
      if (prod.rating < minRating) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === "price-asc") return a.pricePkr - b.pricePkr;
      if (sortBy === "price-desc") return b.pricePkr - a.pricePkr;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0;
    });
  }, [
    meta,
    slug,
    selectedCity,
    selectedSellerType,
    maxPrice,
    minRating,
    sortBy,
  ]);

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8 space-y-8">
      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-amber-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">{meta.title}</span>
      </nav>

      {/* ── Category Hero Banner ─────────────────────────────────────────── */}
      <div
        className={`relative overflow-hidden bg-gradient-to-r ${meta.bannerGradient} text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-800`}
      >
        <div className="max-w-2xl space-y-2.5">
          <div className="text-xs font-bold text-amber-400 font-urdu">
            {meta.titleUrdu}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            {meta.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            {meta.desc}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
            <span className="bg-white/10 px-3 py-1 rounded-full font-bold">
              📦 {filteredProducts.length} Items Listed
            </span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" />
              <span>Nationwide Delivery</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Catalog Grid & Filters ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Filter Sidebar (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-slate-950 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-500" />
              <span>Catalog Filters</span>
            </h3>
            <button
              onClick={() => {
                setSelectedCity("All Cities");
                setSelectedSellerType("ALL");
                setMaxPrice(10000);
                setMinRating(0);
              }}
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
            >
              Reset All
            </button>
          </div>

          {/* Price Range Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Max Budget:</span>
              <span className="font-black text-slate-950">
                PKR {maxPrice.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="15000"
              step="500"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>PKR 1,000</span>
              <span>PKR 15,000+</span>
            </div>
          </div>

          {/* Origin City */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700">
              Artisan / Dispatch City:
            </div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400 font-medium"
            >
              {PAKISTAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Fulfillment Type */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700">
              Fulfillment Model:
            </div>
            <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-[11px] font-bold text-center">
              {[
                { id: "ALL", label: "All" },
                { id: "1P", label: "⚡ 1P" },
                { id: "3P", label: "🏬 3P" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedSellerType(m.id as any)}
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

          {/* Rating Filter */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700">
              Minimum Customer Rating:
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 4.0, 4.5, 4.8].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={`flex-1 py-1 text-[11px] rounded-lg font-bold border transition-colors cursor-pointer ${
                    minRating === r
                      ? "bg-amber-50 border-amber-400 text-amber-900 font-black"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {r === 0 ? "Any" : `${r}★+`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Products Catalog (9 cols) */}
        <div className="lg:col-span-9 space-y-6">
          {/* Sort Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-600 font-medium">
              Showing{" "}
              <strong className="text-slate-950 font-black">
                {filteredProducts.length}
              </strong>{" "}
              matching verified items
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Sort by:</span>
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="featured">Featured & Best Selling</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Customer Rating</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((prod) => (
                <ProductCard
                  key={prod.productId}
                  productId={prod.productId}
                  title={prod.title}
                  pricePkr={prod.pricePkr}
                  originalPricePkr={prod.originalPricePkr}
                  discountPercent={prod.discountPercent}
                  imageUrl={prod.images[0]}
                  rating={prod.rating}
                  reviewsCount={prod.reviewsCount}
                  sellerType={prod.sellerType}
                  storeName={prod.storeName}
                  sellerCity={prod.sellerCity}
                  isExpress={prod.isExpress}
                  soldCount={prod.soldCount}
                  deliveryTime={prod.deliveryTime}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <div className="text-3xl">🔍</div>
              <h3 className="text-lg font-black text-slate-950">
                No matching items found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try widening your price range or clearing city filters to view
                more products in this category.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
