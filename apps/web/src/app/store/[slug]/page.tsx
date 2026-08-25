'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getStoreBySlug } from '@/data/mockStores';
import { CATALOG_PRODUCTS } from '@/data/mockProducts';
import { ProductCard } from '@/components/ui/ProductCard';
import {
  Store,
  CheckCircle2,
  MapPin,
  Star,
  ShoppingBag,
  Clock,
  Calendar,
  Award,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Share2,
} from 'lucide-react';

export default function StoreProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const store = getStoreBySlug(slug) || getStoreBySlug('lahore-tech-hub')!;

  // Products belonging to this store
  const storeProducts = CATALOG_PRODUCTS.filter(
    (p) => p.storeSlug === store.slug || p.storeName.toLowerCase() === store.name.toLowerCase()
  );
  // If fewer than 2, show related products from the same city/category
  const displayProducts =
    storeProducts.length > 0 ? storeProducts : CATALOG_PRODUCTS.slice(0, 4);

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-6 space-y-8">
      {/* ── Breadcrumb Navigation ────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-amber-600 transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link href="/search?sellerType=3P" className="hover:text-amber-600 transition-colors">Verified Stores</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">{store.name}</span>
      </nav>

      {/* ── Store Header Banner & Identity Card ──────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        {/* Banner Graphic */}
        <div className="h-44 sm:h-56 w-full relative overflow-hidden bg-slate-900">
          <img
            src={store.bannerImage}
            alt={store.name}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
        </div>

        {/* Store Profile Strip */}
        <div className="p-6 sm:p-8 -mt-16 relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            {/* Logo & Main Info */}
            <div className="flex items-end gap-5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-white shrink-0">
                <img src={store.logoImage} alt={store.name} className="w-full h-full object-cover" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                    {store.name}
                  </h1>
                  {store.kycVerified && (
                    <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                      Identity Verified
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  <span>{store.location}</span>
                </p>
              </div>
            </div>

            {/* Performance Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center min-w-[90px]">
                <div className="text-base font-black text-slate-950 flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <span>{store.rating}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-bold">{store.reviewsCount} Reviews</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center min-w-[90px]">
                <div className="text-base font-black text-slate-950">{store.salesCount.toLocaleString()}+</div>
                <div className="text-[10px] text-slate-500 font-bold">Orders Shipped</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center min-w-[90px]">
                <div className="text-base font-black text-emerald-700">99.2%</div>
                <div className="text-[10px] text-slate-500 font-bold">On-Time Dispatch</div>
              </div>
            </div>
          </div>

          {/* Store Bio & Specialties */}
          <div className="border-t border-slate-100 pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-2">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">About This Merchant</h3>
              <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                {store.about}
              </p>
            </div>

            <div className="lg:col-span-4 space-y-2">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Specialties</h3>
              <div className="flex flex-wrap gap-1.5">
                {store.specialties.map((spec, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Store Catalog Section ────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
              <span>Products from {store.name}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Browse authentic items directly backed by store warranty and secure payments
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">{displayProducts.length} Items Available</span>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {displayProducts.map((prod) => (
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
              deliveryTime={prod.deliveryTime}
              imageUrl={prod.images[0]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
