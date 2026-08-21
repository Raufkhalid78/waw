'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { RatingStars, WawExpressBadge } from '../ui/Badges';
import { ShoppingBag, ArrowRight, Check } from 'lucide-react';
import { SellerType } from '@waw/types';

const EXPRESS_ITEMS = [
  {
    id: 'prod_m1',
    title: 'Waw Signature Genuine Leather Briefcase & Laptop Bag (15.6")',
    pricePkr: 2499,
    originalPricePkr: 3600,
    rating: 4.9,
    reviewsCount: 142,
    deliveryTime: 'Get it by Tomorrow',
    hubCity: 'Islamabad Central Hub',
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod_m7',
    title: 'Waw Official 65W GaN Fast Charger Multi-Port (Type-C PD + Quick Charge)',
    pricePkr: 2650,
    originalPricePkr: 3900,
    rating: 4.8,
    reviewsCount: 490,
    deliveryTime: 'Get it in 24 Hours',
    hubCity: 'Lahore Express Hub',
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod_m5',
    title: 'Original Sialkot Export Match Football (FIFA Pro Thermally Bonded)',
    pricePkr: 2800,
    originalPricePkr: 4200,
    rating: 5.0,
    reviewsCount: 210,
    deliveryTime: 'Get it by Tomorrow',
    hubCity: 'Islamabad Central Hub',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&auto=format&fit=crop&q=80',
  },
];

export function WawExpressSection() {
  const { addItem } = useCartStore();

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-6">
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-3xl p-6 sm:p-8 text-slate-950 shadow-md space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-2xl shadow-md">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                  Fulfilled by Waw (Waw Express)
                </h2>
                <span className="bg-slate-950 text-amber-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-sm">
                  1P DIRECT CATALOG
                </span>
              </div>
              <p className="text-xs text-slate-900 font-semibold mt-0.5">
                Stored in central fulfillment hubs • 100% Quality Inspected • Guaranteed 24-48h Nationwide Delivery
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="text-xs font-black text-slate-950 bg-white/90 hover:bg-white px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition-all"
          >
            <span>View All Waw Express Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 3-Column Product Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {EXPRESS_ITEMS.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group border border-amber-300"
            >
              <div>
                <Link href={`/products/${item.id}`} className="block relative aspect-video sm:aspect-square rounded-xl overflow-hidden bg-slate-100 mb-3">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2">
                    <WawExpressBadge />
                  </div>
                  <span className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    📍 {item.hubCity}
                  </span>
                </Link>

                <div className="space-y-1">
                  <Link href={`/products/${item.id}`}>
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-2 group-hover:text-amber-600 transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs">
                  <RatingStars rating={item.rating} count={item.reviewsCount} />
                  <span className="text-emerald-700 font-extrabold text-[11px] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {item.deliveryTime}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-lg font-black text-slate-950">
                    PKR {item.pricePkr.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400 line-through">
                    PKR {item.originalPricePkr.toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() =>
                    addItem({
                      productId: item.id,
                      title: item.title,
                      imageUrl: item.imageUrl,
                      pricePkr: item.pricePkr,
                      quantity: 1,
                      sellerType: SellerType.FIRST_PARTY,
                      storeName: 'Waw Official Retail',
                    })
                  }
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>ADD TO CART</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
