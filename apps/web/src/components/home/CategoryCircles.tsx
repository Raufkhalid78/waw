"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/store/useCartStore";
import { ChevronLeft, ChevronRight, Grid3X3 } from "lucide-react";
import { fetchCategories } from "@/lib/api";

export function CategoryCircles() {
  const { language } = useCartStore();
  const isUrdu = language === "UR";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    async function load() {
      const cats = await fetchCategories(language.toLowerCase());
      setCategories(cats);
    }
    load();
  }, [language]);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [categories]);

  const handleScroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      const amount = dir === "left" ? -320 : 320;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  if (categories.length === 0) return null;

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-4">
      <div className="relative">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
              <Grid3X3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                {isUrdu ? "کیٹیگریز منتخب کریں" : "Shop by Category"}
              </h2>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {isUrdu
                  ? "پاکستان بھر سے مستند برانڈز اور دکانیں"
                  : "Browse verified brands and stores across Pakistan"}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Link
              href="/categories"
              className="text-xs font-bold text-amber-600 hover:text-amber-700 hidden sm:flex items-center gap-1 mr-2"
            >
              View All
            </Link>
            <button
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Categories Strip */}
        <div
          ref={scrollRef}
          className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth pb-2"
        >
          {categories.map((cat) => {
            const displayName = isUrdu ? (cat.nameUrdu || cat.name_urdu || cat.name) : cat.name;
            const imgUrl = cat.imageUrl || cat.image_url;

            return (
              <Link
                key={cat.id || cat.slug}
                href={`/category/${cat.slug}`}
                className="group flex flex-col items-center text-center shrink-0 w-24 sm:w-28"
              >
                {/* Circle Image */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-2 border-slate-100 group-hover:border-amber-400 overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-200">
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={cat.name}
                      fill
                      sizes="96px"
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 font-black text-lg">
                      {cat.name?.charAt(0) || "?"}
                    </div>
                  )}
                </div>

                {/* Label */}
                <span className="mt-2.5 text-xs sm:text-sm font-bold text-slate-800 group-hover:text-amber-700 line-clamp-1 transition-colors">
                  {displayName}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
