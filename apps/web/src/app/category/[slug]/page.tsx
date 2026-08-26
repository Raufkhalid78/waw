"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchCategoryBySlug, fetchProducts } from "@/lib/api";
import { ProductCard } from "@/components/ui/ProductCard";
import { useCartStore } from "@/store/useCartStore";
import { Category } from "@waw/types";
import { ProductDetail } from "@/data/mockProducts";
import {
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  Truck,
  Package,
  ArrowRight,
} from "lucide-react";

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
  const { language } = useCartStore();
  const isUrdu = language === "UR";

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [selectedSellerType, setSelectedSellerType] = useState<
    "ALL" | "1P" | "3P"
  >("ALL");
  const [maxPrice, setMaxPrice] = useState<number>(15000);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<
    "featured" | "price-asc" | "price-desc" | "rating"
  >("featured");

  useEffect(() => {
    async function loadCategoryData() {
      setLoading(true);
      try {
        const [catData, prodData] = await Promise.all([
          fetchCategoryBySlug(slug),
          fetchProducts({
            categorySlug: slug,
            city: selectedCity !== "All Cities" ? selectedCity : undefined,
            sellerType: selectedSellerType,
            maxPrice,
            sortBy,
          }),
        ]);
        setCategory(catData);
        setProducts(prodData);
      } catch (err) {
        console.error("Failed to load category data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCategoryData();
  }, [slug, selectedCity, selectedSellerType, maxPrice, sortBy]);

  // Fallback category metadata if database lookup is pending/offline
  const categoryTitle = isUrdu
    ? category?.nameUrdu || category?.name || "زمرہ"
    : category?.name || slug.replace(/-/g, " ").toUpperCase();

  const categoryDesc = isUrdu
    ? category?.descriptionUrdu || category?.description || "مستند پاکستانی مصنوعات دریافت کریں۔"
    : category?.description || "Explore authentic verified Pakistani products with secure payment protection.";

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
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" />
              <span>{isUrdu ? "ملک بھر میں ترسیل" : "Nationwide Delivery"}</span>
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
                setSelectedCity("All Cities");
                setSelectedSellerType("ALL");
                setMaxPrice(15000);
                setMinRating(0);
              }}
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
            >
              {isUrdu ? "تمام ری سیٹ کریں" : "Reset All"}
            </button>
          </div>

          {/* Price Range Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">
                {isUrdu ? "زیادہ سے زیادہ بجٹ:" : "Max Budget:"}
              </span>
              <span className="font-black text-slate-950">
                PKR {maxPrice.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="25000"
              step="500"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>PKR 1,000</span>
              <span>PKR 25,000+</span>
            </div>
          </div>

          {/* Origin City */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700">
              {isUrdu ? "شہر:" : "Artisan / Dispatch City:"}
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
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{isUrdu ? "ترتیب:" : "Sort by:"}</span>
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="featured">{isUrdu ? "نمایاں" : "Featured & Best Selling"}</option>
                <option value="price-asc">{isUrdu ? "قیمت: کم سے زیادہ" : "Price: Low to High"}</option>
                <option value="price-desc">{isUrdu ? "قیمت: زیادہ سے کم" : "Price: High to Low"}</option>
                <option value="rating">{isUrdu ? "بہترین ریٹنگ" : "Highest Customer Rating"}</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-400">
                {isUrdu ? "مصنوعات لوڈ ہو رہی ہیں..." : "Loading products..."}
              </p>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((prod) => (
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
                  deliveryTime={prod.deliveryTime}
                />
              ))}
            </div>
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
        </div>
      </div>
    </div>
  );
}
