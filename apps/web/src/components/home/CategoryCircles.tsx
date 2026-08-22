'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'cat_mobiles',
    slug: 'mobiles-tech',
    name: 'Smartphones & Tech',
    nameUrdu: 'موبائل اور ٹیکنالوجی',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80',
    tag: '340+ Verified Shops',
    discount: 'Up to 30% Off',
  },
  {
    id: 'cat_lawn',
    slug: 'womens-lawn',
    name: "Women's Lawn Suits",
    nameUrdu: 'خواتین کے ملبوسات',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&auto=format&fit=crop&q=80',
    tag: '520+ Fashion Shops',
    discount: 'Festive 2026',
  },
  {
    id: 'cat_leather',
    slug: 'leather-craft',
    name: 'Pure Leather Craft',
    nameUrdu: 'اصلی چمڑے کا سامان',
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&auto=format&fit=crop&q=80',
    tag: '180+ Artisans',
    discount: 'Handcrafted',
  },
  {
    id: 'cat_shoes',
    slug: 'peshawari-chappal',
    name: 'Peshawari Chappal',
    nameUrdu: 'پشاوری چپل',
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300&auto=format&fit=crop&q=80',
    tag: '120+ Master Makers',
    discount: 'Double Sole',
  },
  {
    id: 'cat_audio',
    slug: 'mobiles-tech',
    name: 'Wireless Earbuds',
    nameUrdu: 'ہیڈ فونز اور آڈیو',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&auto=format&fit=crop&q=80',
    tag: '290+ Audio Hubs',
    discount: 'Top Rated',
  },
  {
    id: 'cat_watches',
    slug: 'mobiles-tech',
    name: 'Smart Watches',
    nameUrdu: 'سمارٹ گھڑیاں',
    image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=300&auto=format&fit=crop&q=80',
    tag: '160+ Gadget Shops',
    discount: 'AMOLED 2026',
  },
  {
    id: 'cat_sports',
    slug: 'sialkot-sports',
    name: 'Sialkot Sports',
    nameUrdu: 'سیالکوٹ کھیلوں کا سامان',
    image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80',
    tag: '210+ Exporters',
    discount: 'FIFA Grade',
  },
  {
    id: 'cat_fragrance',
    slug: 'home-heritage',
    name: 'Attar & Fragrance',
    nameUrdu: 'عطر اور خوشبویات',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80',
    tag: '95+ Perfumers',
    discount: 'Pure Oud',
  },
  {
    id: 'cat_pottery',
    slug: 'home-heritage',
    name: 'Multani Blue Art',
    nameUrdu: 'ملتانی بلیو پوٹری',
    image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=300&auto=format&fit=crop&q=80',
    tag: '65+ Workshops',
    discount: 'Hand Painted',
  },
  {
    id: 'cat_power',
    slug: 'mobiles-tech',
    name: 'Power & Cables',
    nameUrdu: 'چارجرز اور بیٹریاں',
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=300&auto=format&fit=crop&q=80',
    tag: '140+ Sellers',
    discount: 'Fast Charging',
  },
];

export function CategoryCircles() {
  const { language } = useCartStore();
  const isUrdu = language === 'UR';
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  const handleScroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = dir === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

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
                {isUrdu ? 'مقبول پاکستانی کیٹیگریز' : 'Explore Top Marketplace Categories'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold hidden sm:block">
                {isUrdu
                  ? 'مستند پاکستانی برانڈز اور ہنر مندوں کے منتخب کردہ مجموعے'
                  : 'Curated Pakistani artisan crafts, Karachi fashion & tech hubs'}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all shadow-xs cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleScroll('right')}
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
          {CATEGORIES.map((cat) => {
            const displayName = isUrdu && cat.nameUrdu ? cat.nameUrdu : cat.name;

            return (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="group flex flex-col items-center text-center shrink-0 w-26 sm:w-32 transition-transform duration-200 hover:-translate-y-1.5"
              >
                {/* Circular Image Frame with Gradient Ring */}
                <div className="relative w-22 h-22 sm:w-28 sm:h-28 rounded-full p-1.5 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-md group-hover:shadow-xl transition-all group-hover:scale-105">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5 border-2 border-white">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      loading="lazy"
                      className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  {/* Top Floating Badge */}
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-950 text-[#FFEB00] text-[9px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider whitespace-nowrap border border-white/50">
                    {cat.discount}
                  </span>
                </div>

                {/* Category Label */}
                <span className="mt-3 text-xs sm:text-sm font-black text-slate-900 group-hover:text-amber-700 line-clamp-1 transition-colors">
                  {displayName}
                </span>

                {/* Subtitle / Shop Count */}
                <span className="text-[11px] sm:text-xs text-slate-500 font-semibold mt-0.5">
                  {cat.tag}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
