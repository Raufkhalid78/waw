'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, Flame } from 'lucide-react';
import { ProductCard } from '@/components/ui/ProductCard';
import { fetchBestSellers, ProductDetail } from '@/lib/api';
import { SellerType } from '@waw/types';

function BestSellerCard({ product }: { product: ProductDetail }) {
  return (
    <ProductCard
      productId={product.productId || product.id || ''}
      title={product.title}
      titleUrdu={product.titleUrdu}
      storeName={product.storeName}
      sellerCity={product.sellerCity}
      pricePkr={product.pricePkr}
      originalPricePkr={product.originalPricePkr}
      discountPercent={product.discountPercent}
      rating={product.rating}
      reviewsCount={product.reviewsCount}
      imageUrl={product.imageUrl || '/placeholder.png'}
      isExpress={product.isExpress}
      sellerType={product.sellerType as SellerType}
      soldCount={product.soldCount}
      badges={(product as any).badges || []}
      isFeaturedStore={(product as any).isFeaturedStore}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="mt-3 space-y-2">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
      </div>
    </div>
  );
}

export function BestSellers() {
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBestSellers(12)
      .then((items) => setProducts(items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && products.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-500" />
          Best Sellers
        </h2>
        <Link
          href="/search?sort=best-sellers"
          className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-0.5"
        >
          View All <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {products.map((product, i) => (
            <BestSellerCard key={product.productId || product.id || i} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
