"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchCategories } from "@/lib/api";
import { Category } from "@waw/types";
import {
  ChevronRight,
  Loader2,
  ArrowRight,
  Smartphone,
  Shirt,
  Briefcase,
  Gem,
  Dumbbell,
  Home,
  Palette,
  Star,
  Grid3X3,
  Package,
  Sparkles,
} from "lucide-react";

const CATEGORY_CONFIG: Record<string, { icon: any; gradient: string; accent: string }> = {
  "electronics-mobility": { icon: Smartphone, gradient: "from-blue-500 to-blue-600", accent: "bg-blue-50 text-blue-600 border-blue-100" },
  "fashion-apparel": { icon: Shirt, gradient: "from-pink-500 to-rose-500", accent: "bg-pink-50 text-pink-600 border-pink-100" },
  "leather-craft": { icon: Briefcase, gradient: "from-amber-500 to-amber-600", accent: "bg-amber-50 text-amber-700 border-amber-100" },
  "beauty-fragrance": { icon: Gem, gradient: "from-purple-500 to-violet-500", accent: "bg-purple-50 text-purple-600 border-purple-100" },
  "sports-outdoors": { icon: Dumbbell, gradient: "from-emerald-500 to-green-500", accent: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  "home-living": { icon: Home, gradient: "from-orange-500 to-orange-600", accent: "bg-orange-50 text-orange-600 border-orange-100" },
  "pakistani-heritage": { icon: Palette, gradient: "from-rose-500 to-red-500", accent: "bg-rose-50 text-rose-600 border-rose-100" },
};

function CategoryCardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-50" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-100 rounded-lg w-3/4" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-50 rounded w-full" />
          <div className="h-3 bg-gray-50 rounded w-2/3" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-6 bg-gray-50 rounded-full w-20" />
          <div className="h-6 bg-gray-50 rounded-full w-16" />
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories("en")
      .then((cats) => setCategories(cats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalSubcategories = categories.reduce(
    (sum, cat) => sum + (cat.children?.length || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/" className="hover:text-amber-600 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-semibold">All Categories</span>
        </nav>

        {/* Hero Banner */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 sm:p-12 mb-10 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-400/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-amber-400/5 to-transparent rounded-full" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Premium Marketplace
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
                All Categories
              </h1>
              <p className="text-base text-slate-400 max-w-xl leading-relaxed">
                Discover authentic Pakistani products from verified merchants. Browse{" "}
                <span className="text-amber-400 font-bold">{categories.length} categories</span>{" "}
                with{" "}
                <span className="text-amber-400 font-bold">{totalSubcategories}+ subcategories</span>
              </p>
            </div>

            {/* Stats Cards */}
            <div className="flex gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-4 text-center">
                <div className="text-2xl font-black text-amber-400">{categories.length}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  Categories
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-4 text-center">
                <div className="text-2xl font-black text-amber-400">{totalSubcategories}+</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  Subcategories
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
              <Grid3X3 className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Categories Yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              We&apos;re setting up our marketplace. Check back soon for amazing products!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const config = CATEGORY_CONFIG[cat.slug] || {
                icon: Package,
                gradient: "from-gray-500 to-gray-600",
                accent: "bg-gray-50 text-gray-600 border-gray-100",
              };
              const IconComponent = config.icon;
              const subcategories = cat.children || [];

              return (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300"
                >
                  {/* Top Gradient Bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${config.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />

                  {/* Card Content */}
                  <div className="p-6">
                    {/* Icon + Title Row */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-2xl ${config.accent} border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="w-7 h-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 group-hover:text-amber-700 transition-colors flex items-center gap-2">
                          {cat.name}
                          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all duration-300" />
                        </h2>
                        {cat.description && (
                          <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Subcategory Pills */}
                    {subcategories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {subcategories.slice(0, 3).map((sub) => (
                          <span
                            key={sub.id}
                            className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-100 group-hover:bg-amber-50 group-hover:text-amber-700 group-hover:border-amber-100 transition-colors"
                          >
                            <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-400 transition-colors" />
                            {sub.name}
                          </span>
                        ))}
                        {subcategories.length > 3 && (
                          <span className="inline-flex items-center text-xs font-semibold text-amber-600 px-2">
                            +{subcategories.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                        <span>Browse products</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </div>

                  {/* Hover Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                </Link>
              );
            })}
          </div>
        )}

        {/* Bottom CTA Section */}
        {!loading && categories.length > 0 && (
          <div className="mt-12 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-8 sm:p-10 text-center">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              <Star className="w-3.5 h-3.5 fill-amber-500" />
              Need Help Finding Something?
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-3">
              Explore Our Full Catalog
            </h3>
            <p className="text-sm text-gray-600 max-w-lg mx-auto mb-6">
              Can&apos;t find the right category? Search across all products or browse our trending items.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/search"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20"
              >
                Search All Products
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="bg-white hover:bg-gray-50 text-gray-700 font-bold px-8 py-3 rounded-xl text-sm transition-all border border-gray-200"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
