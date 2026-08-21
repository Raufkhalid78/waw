'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { HeroBanner } from '@/components/home/HeroBanner';
import { CategoryCircles } from '@/components/home/CategoryCircles';
import { FlashDeals } from '@/components/home/FlashDeals';
import { StoreSpotlight } from '@/components/home/StoreSpotlight';
import { WawExpressSection } from '@/components/home/WawExpressSection';
import { FeaturedBrands } from '@/components/home/FeaturedBrands';
import { ProductCard } from '@/components/ui/ProductCard';
import { Flame, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { SellerType } from '@waw/types';

const MARKETPLACE_TABS = [
  'All Products',
  'Mobiles & Tech',
  "Women's Lawn",
  'Leather & Footwear',
  'Sialkot Sports',
  'Fragrances & Attar',
  'Smart Watches',
  'Power & Chargers',
] as const;

type MarketTab = typeof MARKETPLACE_TABS[number];

const TRENDING_MARKETPLACE_PRODUCTS = [
  {
    productId: 'prod_m1',
    title: 'Waw Signature Slim Bifold Pure Cow Leather Wallet',
    category: 'Leather & Footwear' as MarketTab,
    pricePkr: 2499,
    originalPricePkr: 3600,
    discountPercent: 30,
    rating: 4.9,
    reviewsCount: 382,
    soldCount: 1420,
    isExpress: true,
    sellerType: SellerType.FIRST_PARTY,
    storeName: 'Waw Official Hub',
    sellerCity: 'Islamabad Hub',
    deliveryTime: 'Get it by Tomorrow',
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80',
  },
  {
    productId: 'prod_m2',
    title: 'Pro ANC Wireless Earbuds with Heavy Bass & 40h Battery',
    category: 'Mobiles & Tech' as MarketTab,
    pricePkr: 3200,
    originalPricePkr: 4800,
    discountPercent: 33,
    rating: 4.8,
    reviewsCount: 1150,
    soldCount: 2190,
    isExpress: true,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Lahore Tech Hub',
    sellerCity: 'Lahore',
    deliveryTime: '24-48h Dispatch',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
  },
  {
    productId: 'prod_m3',
    title: 'Handmade Traditional Norozi Peshawari Chappal (Pure Mustard Leather)',
    category: 'Leather & Footwear' as MarketTab,
    pricePkr: 3800,
    originalPricePkr: 5200,
    discountPercent: 27,
    rating: 5.0,
    reviewsCount: 429,
    soldCount: 890,
    isExpress: false,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Khyber Artisans',
    sellerCity: 'Peshawar',
    deliveryTime: '3-4 Days Express',
    imageUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80',
  },
  {
    productId: 'prod_m4',
    title: 'Luxury Floral Embroidered 3-Piece Unstitched Summer Lawn Collection',
    category: "Women's Lawn" as MarketTab,
    pricePkr: 4499,
    originalPricePkr: 6500,
    discountPercent: 30,
    rating: 4.7,
    reviewsCount: 640,
    soldCount: 640,
    isExpress: true,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Sindh Lawn Gallery',
    sellerCity: 'Karachi',
    deliveryTime: '24-48h Dispatch',
    imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80',
  },
  {
    productId: 'prod_m5',
    title: 'Amoled Bluetooth Calling Smart Watch (Waterproof IP68)',
    category: 'Smart Watches' as MarketTab,
    pricePkr: 4999,
    originalPricePkr: 7499,
    discountPercent: 33,
    rating: 4.8,
    reviewsCount: 512,
    soldCount: 1100,
    isExpress: true,
    sellerType: SellerType.FIRST_PARTY,
    storeName: 'Waw Electronics',
    sellerCity: 'Lahore Hub',
    deliveryTime: 'Get it by Tomorrow',
    imageUrl: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&auto=format&fit=crop&q=80',
  },
  {
    productId: 'prod_m6',
    title: 'Natural Royal Ambergris & Oud Perfume Oil Attar (12ml Glass Vial)',
    category: 'Fragrances & Attar' as MarketTab,
    pricePkr: 2200,
    originalPricePkr: 3200,
    discountPercent: 31,
    rating: 4.9,
    reviewsCount: 430,
    soldCount: 430,
    isExpress: false,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Al-Haramain Fragrances',
    sellerCity: 'Lahore',
    deliveryTime: '2-3 Days Courier',
    imageUrl: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80',
  },
  {
    productId: 'prod_m7',
    title: 'Professional Tournament Hand-Stitched Match Football (Size 5)',
    category: 'Sialkot Sports' as MarketTab,
    pricePkr: 2999,
    originalPricePkr: 4500,
    discountPercent: 33,
    rating: 5.0,
    reviewsCount: 780,
    soldCount: 780,
    isExpress: true,
    sellerType: SellerType.FIRST_PARTY,
    storeName: 'Sialkot Sports World',
    sellerCity: 'Sialkot',
    deliveryTime: 'Get it by Tomorrow',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&auto=format&fit=crop&q=80',
  },
  {
    productId: 'prod_m8',
    title: '65W Fast Charging GaN Multi-Port USB-C Wall Charger',
    category: 'Power & Chargers' as MarketTab,
    pricePkr: 2800,
    originalPricePkr: 3999,
    discountPercent: 30,
    rating: 4.7,
    reviewsCount: 950,
    soldCount: 950,
    isExpress: true,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Islamabad Gadgets',
    sellerCity: 'Islamabad',
    deliveryTime: '24-48h Dispatch',
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<MarketTab>('All Products');
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkTabScroll = () => {
    if (tabScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabScrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkTabScroll();
    const el = tabScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkTabScroll);
      return () => el.removeEventListener('scroll', checkTabScroll);
    }
  }, []);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabScrollRef.current) {
      const amount = direction === 'left' ? -220 : 220;
      tabScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkTabScroll, 300);
    }
  };

  const filteredProducts =
    activeTab === 'All Products'
      ? TRENDING_MARKETPLACE_PRODUCTS
      : TRENDING_MARKETPLACE_PRODUCTS.filter((p) => p.category === activeTab);

  return (
    <div className="space-y-2 pb-16">
      {/* 1. Dynamic Hero Carousel + Sidekicks + Live Confidence Ticker */}
      <HeroBanner />

      {/* 2. Circular Category Story Bubbles */}
      <CategoryCircles />

      {/* 3. Lightning Flash Deals Section */}
      <FlashDeals />

      {/* 4. Multi-Vendor Store Spotlight (Etsy & Noon Style) */}
      <StoreSpotlight />

      {/* 5. Fulfilled by Waw (1P Official Express Catalog) */}
      <WawExpressSection />

      {/* 6. Official Brand Malls & Regional Hubs */}
      <FeaturedBrands />

      {/* 7. Trending Marketplace Catalog with Multi-Tab Filtering */}
      <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
          {/* Section Heading & Category Tabs with Scroll Chevrons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500 fill-amber-400" />
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                  Trending in Pakistan
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Top rated products with verified buyer reviews and fast nationwide shipping from 2,000+ local sellers.
              </p>
            </div>

            {/* Filter Tabs with Noon-style Left & Right Chevrons */}
            <div className="flex items-center gap-1.5 max-w-full md:max-w-md relative">
              {canScrollLeft && (
                <button
                  onClick={() => scrollTabs('left')}
                  className="p-1 rounded-full bg-white border border-slate-300 shadow-xs text-slate-700 hover:text-amber-600 shrink-0"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}

              <div
                ref={tabScrollRef}
                className="flex items-center gap-1.5 overflow-x-auto scrollbar-none scroll-smooth pb-1"
              >
                {MARKETPLACE_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                      activeTab === tab
                        ? 'bg-slate-950 text-amber-400 shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {canScrollRight && (
                <button
                  onClick={() => scrollTabs('right')}
                  className="p-1 rounded-full bg-white border border-slate-300 shadow-xs text-slate-700 hover:text-amber-600 shrink-0"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-3.5 h-3.5 font-bold" />
                </button>
              )}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredProducts.map((prod) => (
              <ProductCard key={prod.productId} {...prod} />
            ))}
          </div>

          {/* Load More Button */}
          <div className="pt-4 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-100 hover:bg-amber-400 hover:text-slate-950 text-slate-800 text-xs font-black rounded-full transition-all shadow-xs"
            >
              <span>Explore All 50,000+ Marketplace Items</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
