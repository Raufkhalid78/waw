"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/store/useCartStore";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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
      const amount = dir === "left" ? -380 : 380;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  if (categories.length === 0) return null;

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-5">
      <div className="bg-white border border-slate-200/90 rounded-[32px] p-5 sm:p-8 shadow-xs relative">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
              <Sparkles className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-950 tracking-tight">
                {isUrdu
                  ? "مقبول پاکستانی کیٹیگریز"
                  : "Explore Top Marketplace Categories"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold hidden sm:block">
                {isUrdu
                  ? "مستند پاکستانی برانڈز اور ہنر مندوں کے منتخب کردہ مجموعے"
                  : "Curated Pakistani artisan crafts, Karachi fashion & tech hubs"}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all shadow-xs cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all shadow-xs cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories Strip */}
        <div
          ref={scrollRef}
          className="flex items-center gap-5 sm:gap-8 overflow-x-auto no-scrollbar scroll-smooth py-3 px-1"
        >
          {categories.map((cat) => {
            const displayName =
              isUrdu ? (cat.nameUrdu || cat.name_urdu || cat.name) : cat.name;
            const imgUrl = cat.imageUrl || cat.image_url;

            return (
              <Link
                key={cat.id || cat.slug}
                href={`/category/${cat.slug}`}
                className="group flex flex-col items-center text-center shrink-0 w-26 sm:w-32 transition-transform duration-200 hover:-translate-y-1.5"
              >
                {/* Circular Image Frame with Gradient Ring */}
                <div className="relative w-22 h-22 sm:w-28 sm:h-28 rounded-full p-1.5 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-md group-hover:shadow-xl transition-all group-hover:scale-105">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5 border-2 border-white flex items-center justify-center bg-slate-50">
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt={cat.name}
                        fill
                        sizes="112px"
                        className="object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-slate-300 font-black text-xl flex items-center justify-center w-full h-full rounded-full group-hover:scale-110 transition-transform duration-300">
                        واو
                      </span>
                    )}
                  </div>

                  {/* Top Floating Badge */}
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-950 text-[#FFEB00] text-[9px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider whitespace-nowrap border border-white/50">
                    SHOP NOW
                  </span>
                </div>

                {/* Category Label */}
                <span className="mt-3 text-xs sm:text-sm font-black text-slate-900 group-hover:text-amber-700 line-clamp-1 transition-colors">
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
