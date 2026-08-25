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
import { Flame, ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Truck, Award, Zap } from 'lucide-react';
import { SellerType } from '@waw/types';
import { fetchProducts } from '@/lib/api';

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
    originalPricePkr: 7999,
    discountPercent: 37,
    rating: 4.7,
    reviewsCount: 512,
    soldCount: 780,
    isExpress: true,
    sellerType: SellerType.FIRST_PARTY,
    storeName: 'Waw Electronics Hub',
    sellerCity: 'Lahore Hub',
    deliveryTime: 'Get it in 24 Hours',
    imageUrl: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&auto=format&fit=crop&q=80',
  },
  {
    productId: 'prod_m6',
    title: 'Original Sialkot Professional Match Football (Hand-Stitched)',
    category: 'Sialkot Sports' as MarketTab,
    pricePkr: 2800,
    originalPricePkr: 4200,
    discountPercent: 33,
    rating: 5.0,
    reviewsCount: 210,
    soldCount: 450,
    isExpress: true,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Sialkot Sports Direct',
    sellerCity: 'Sialkot',
    deliveryTime: '24-48h Dispatch',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&auto=format&fit=crop&q=80',
  },
  {
    productId: 'prod_m7',
    title: 'Royal Oud Al-Layl Concentrated Perfume Oil / Non-Alcoholic Attar (12ml)',
    category: 'Fragrances & Attar' as MarketTab,
    pricePkr: 1850,
    originalPricePkr: 2800,
    discountPercent: 34,
    rating: 4.9,
    reviewsCount: 820,
    soldCount: 820,
    isExpress: true,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Arabian Oud PK',
    sellerCity: 'Karachi',
    deliveryTime: '24-48h Dispatch',
    imageUrl: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80',
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
  const [liveProducts, setLiveProducts] = useState<any[]>([]);

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

  useEffect(() => {
    async function loadCatalog() {
      try {
        const data = await fetchProducts();
        if (Array.isArray(data) && data.length > 0) {
          setLiveProducts(data.map((p: any) => ({
            productId: p.id,
            title: p.title,
            category: (p.categoryName || 'Mobiles & Tech') as MarketTab,
            pricePkr: p.pricePkr || 2999,
            originalPricePkr: p.compareAtPricePkr || (p.pricePkr ? Math.round(p.pricePkr * 1.3) : 3999),
            discountPercent: p.compareAtPricePkr ? Math.round(((p.compareAtPricePkr - p.pricePkr) / p.compareAtPricePkr) * 100) : 25,
            rating: p.ratingAverage || 4.9,
            reviewsCount: p.reviewsCount || 88,
            soldCount: p.soldCount || 240,
            isExpress: p.isFirstParty ?? true,
            sellerType: p.isFirstParty ? SellerType.FIRST_PARTY : SellerType.THIRD_PARTY,
            storeName: p.storeName || 'Waw Official Hub',
            sellerCity: 'Pakistan',
            deliveryTime: '2-3 Days Fast Dispatch',
            imageUrl: p.imageUrl || p.images?.[0] || 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&auto=format&fit=crop&q=80',
          })));
        }
      } catch (err) {
        console.warn('Using baseline catalog for buyer homepage:', err);
      }
    }
    loadCatalog();
  }, []);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabScrollRef.current) {
      const amount = direction === 'left' ? -220 : 220;
      tabScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkTabScroll, 300);
    }
  };

  const allProductsList = liveProducts.length > 0 ? liveProducts : TRENDING_MARKETPLACE_PRODUCTS;

  const filteredProducts =
    activeTab === 'All Products'
      ? allProductsList
      : allProductsList.filter((p) => p.category === activeTab);

  return (
    <div className="space-y-3 pb-20">
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
      <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-5">
        <div className="bg-white border border-slate-200/90 rounded-[36px] p-6 sm:p-9 shadow-xs space-y-7">
          {/* Section Heading & Category Tabs with Scroll Chevrons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
                  <Flame className="w-5 h-5 fill-slate-950" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  Trending in Pakistan
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
                Top rated products with verified buyer reviews and fast nationwide shipping from local sellers.
              </p>
            </div>

            {/* Filter Tabs with Left & Right Chevrons */}
            <div className="flex items-center gap-2 max-w-full md:max-w-md relative">
              {canScrollLeft && (
                <button
                  onClick={() => scrollTabs('left')}
                  className="p-2 rounded-full bg-white border border-slate-200 shadow-xs text-slate-700 hover:text-amber-600 shrink-0 cursor-pointer"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              <div
                ref={tabScrollRef}
                className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-1"
              >
                {MARKETPLACE_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4.5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === tab
                        ? 'bg-slate-950 text-amber-400 shadow-md scale-102'
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
                  className="p-2 rounded-full bg-white border border-slate-200 shadow-xs text-slate-700 hover:text-amber-600 shrink-0 cursor-pointer"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((prod) => (
              <ProductCard
                key={prod.productId}
                productId={prod.productId}
                title={prod.title}
                storeName={prod.storeName}
                sellerCity={prod.sellerCity}
                pricePkr={prod.pricePkr}
                originalPricePkr={prod.originalPricePkr}
                discountPercent={prod.discountPercent}
                rating={prod.rating}
                reviewsCount={prod.reviewsCount}
                soldCount={prod.soldCount}
                imageUrl={prod.imageUrl}
                isExpress={prod.isExpress}
                sellerType={prod.sellerType}
                deliveryTime={prod.deliveryTime}
              />
            ))}
          </div>

          {/* View More Button */}
          <div className="text-center pt-5">
            <Link
              href="/category/mobiles-tech"
              className="inline-flex items-center gap-2.5 bg-slate-950 hover:bg-slate-900 text-amber-400 px-9 py-4 rounded-2xl text-sm sm:text-base font-black shadow-lg hover:scale-105 transition-all cursor-pointer"
            >
              <span>EXPLORE ALL PRODUCTS</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. VIP Perks & Buyer Protection Banner */}
      <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-5">
        <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white rounded-[36px] p-7 sm:p-12 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 text-amber-400 text-xs sm:text-sm font-black uppercase tracking-wider">
              <ShieldCheck className="w-5 h-5" />
              <span>State Bank Regulated Escrow Guarantee</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Shop with 100% Peace of Mind on Waw
            </h3>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              Your money stays in secure escrow until you inspect your parcel. Enjoy hassle-free 7-day doorstep returns with free PostEx rider pickups nationwide.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 relative z-10">
            <Link
              href="/buyer-protection"
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-7 py-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl hover:scale-105 transition-all"
            >
              <span>Learn About Escrow</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/help"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black px-7 py-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all"
            >
              <span>24/7 Support Desk</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
