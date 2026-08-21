'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'cat_mobiles',
    slug: 'mobiles-tech',
    name: 'Smartphones & Tech',
    nameUrdu: 'موبائل اور ٹیکنالوجی',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80',
    tag: '340+ Shops',
    discount: 'Up to 30% Off',
  },
  {
    id: 'cat_lawn',
    slug: 'womens-lawn',
    name: "Women's Lawn Suits",
    nameUrdu: 'خواتین کے ملبوسات',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&auto=format&fit=crop&q=80',
    tag: '520+ Shops',
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
    tag: '120+ Makers',
    discount: 'Double Sole',
  },
  {
    id: 'cat_audio',
    slug: 'mobiles-tech',
    name: 'Wireless Earbuds',
    nameUrdu: 'ہیڈ فونز اور آڈیو',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&auto=format&fit=crop&q=80',
    tag: '290+ Shops',
    discount: 'Top Rated',
  },
  {
    id: 'cat_watches',
    slug: 'mobiles-tech',
    name: 'Smart Watches',
    nameUrdu: 'سمارٹ گھڑیاں',
    image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=300&auto=format&fit=crop&q=80',
    tag: '160+ Shops',
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollability = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollability();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      return () => {
        el.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScrollability, 300);
    }
  };

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-5">
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {language === 'UR' ? 'مشہور مارکیٹ کیٹیگریز' : 'Explore Popular Marketplace Categories'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {language === 'UR'
                ? 'پورے پاکستان کے ہزاروں تصدیق شدہ اسٹورز سے اشیاء دریافت کریں'
                : 'Discover products across thousands of verified stores in Pakistan'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Scroll Buttons */}
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`p-1.5 rounded-full border border-slate-200 shadow-xs transition-all ${
                canScrollLeft ? 'bg-white hover:bg-slate-50 text-slate-900 cursor-pointer' : 'opacity-40 text-slate-400 cursor-not-allowed'
              }`}
              aria-label="Previous categories"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`p-1.5 rounded-full border border-slate-200 shadow-xs transition-all ${
                canScrollRight ? 'bg-white hover:bg-slate-50 text-slate-900 cursor-pointer' : 'opacity-40 text-slate-400 cursor-not-allowed'
              }`}
              aria-label="Next categories"
            >
              <ChevronRight className="w-4 h-4 font-bold" />
            </button>
          </div>
        </div>

        {/* Scrollable Story Track with Chevron Navigation */}
        <div
          ref={scrollRef}
          className="flex items-start gap-4 sm:gap-6 md:gap-7 overflow-x-auto scrollbar-none scroll-smooth pb-2 pt-1"
        >
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group flex flex-col items-center gap-2 transition-transform hover:-translate-y-1 shrink-0 w-24 sm:w-28 text-center"
            >
              {/* Strict Square Image Thumbnail */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 group-hover:border-amber-400 group-hover:shadow-md transition-all bg-slate-100 shrink-0">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Title & Tag Pill */}
              <div className="w-full flex flex-col items-center space-y-1">
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 group-hover:text-amber-600 block line-clamp-2 leading-snug h-8 flex items-center justify-center text-center px-0.5">
                  {language === 'UR' ? cat.nameUrdu : cat.name}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full inline-block whitespace-nowrap">
                  {cat.tag}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
