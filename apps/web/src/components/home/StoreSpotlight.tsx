"use client";

import Link from "next/link";
import {
  Store,
  Star,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { SellerType } from "@waw/types";

interface ShopData {
  id: string;
  slug: string;
  name: string;
  nameUrdu: string;
  city: string;
  category: string;
  established: string;
  rating: number;
  reviewsCount: number;
  totalSales: string;
  bannerBg: string;
  avatarText: string;
  avatarBg: string;
  products: {
    id: string;
    title: string;
    pricePkr: number;
    originalPricePkr: number;
    imageUrl: string;
  }[];
}

const FEATURED_SHOPS: ShopData[] = [
  {
    id: "shop_khyber_leather",
    slug: "khyber-artisans",
    name: "Khyber Leather Craft",
    nameUrdu: "خیبر لیدر کرافٹ",
    city: "Peshawar",
    category: "Handmade Footwear & Wallets",
    established: "Est. 2012",
    rating: 4.9,
    reviewsCount: 1420,
    totalSales: "18.4k Sold",
    bannerBg: "from-amber-900 to-amber-950",
    avatarText: "KL",
    avatarBg: "bg-amber-400 text-slate-950",
    products: [
      {
        id: "kl_1",
        title: "Norozi Double Sole Peshawari Chappal",
        pricePkr: 3800,
        originalPricePkr: 5200,
        imageUrl:
          "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "kl_2",
        title: "Full Grain Slim Bifold Leather Wallet",
        pricePkr: 2499,
        originalPricePkr: 3600,
        imageUrl:
          "https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "kl_3",
        title: 'Handmade Leather Laptop Sleeve 15"',
        pricePkr: 4200,
        originalPricePkr: 5800,
        imageUrl:
          "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "shop_lahore_tech",
    slug: "lahore-tech-hub",
    name: "Lahore Tech Hub",
    nameUrdu: "لاہور ٹیک ہب",
    city: "Lahore (Hafeez Centre)",
    category: "Audio, Gadgets & Wearables",
    established: "Est. 2018",
    rating: 4.8,
    reviewsCount: 3850,
    totalSales: "35.1k Sold",
    bannerBg: "from-sky-900 to-slate-950",
    avatarText: "LT",
    avatarBg: "bg-sky-500 text-white",
    products: [
      {
        id: "lt_1",
        title: "Pro ANC Wireless Earbuds (Heavy Bass)",
        pricePkr: 3200,
        originalPricePkr: 4800,
        imageUrl:
          "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "lt_2",
        title: "65W GaN Fast Charger Multi-Port",
        pricePkr: 2800,
        originalPricePkr: 3999,
        imageUrl:
          "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "lt_3",
        title: "Amoled Bluetooth Calling Smart Watch",
        pricePkr: 4999,
        originalPricePkr: 7499,
        imageUrl:
          "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=300&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "shop_sindh_lawn",
    slug: "waw-official-hub",
    name: "Sindh Silk & Lawn Gallery",
    nameUrdu: "سندھ سلک اور لان گیلری",
    city: "Karachi (Tariq Road)",
    category: "Women's Unstitched Apparel",
    established: "Est. 2015",
    rating: 4.9,
    reviewsCount: 2190,
    totalSales: "24.8k Sold",
    bannerBg: "from-rose-900 to-slate-950",
    avatarText: "SL",
    avatarBg: "bg-rose-500 text-white",
    products: [
      {
        id: "sl_1",
        title: "Luxury 3-Piece Embroidered Summer Lawn",
        pricePkr: 4499,
        originalPricePkr: 6500,
        imageUrl:
          "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "sl_2",
        title: "Pure Chiffon Digital Printed Dupatta Suit",
        pricePkr: 5200,
        originalPricePkr: 7500,
        imageUrl:
          "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "sl_3",
        title: "Classic Jacquard Festive Collection 2026",
        pricePkr: 6499,
        originalPricePkr: 8999,
        imageUrl:
          "https://images.unsplash.com/photo-1596783049539-74d326233ba7?w=300&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "shop_sialkot_sports",
    slug: "sialkot-sports-direct",
    name: "Sialkot Sports World",
    nameUrdu: "سیالکوٹ اسپورٹس ورلڈ",
    city: "Sialkot Export Zone",
    category: "Handcrafted Match Gear",
    established: "Est. 2008",
    rating: 5.0,
    reviewsCount: 3100,
    totalSales: "42.9k Sold",
    bannerBg: "from-emerald-900 to-slate-950",
    avatarText: "SW",
    avatarBg: "bg-emerald-500 text-white",
    products: [
      {
        id: "sw_1",
        title: "Tournament Hand-Stitched Match Football",
        pricePkr: 2999,
        originalPricePkr: 4500,
        imageUrl:
          "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "sw_2",
        title: "Grade-A English Willow Cricket Bat",
        pricePkr: 8500,
        originalPricePkr: 12000,
        imageUrl:
          "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "sw_3",
        title: "Pro Leather Boxing & Training Gloves",
        pricePkr: 3600,
        originalPricePkr: 5200,
        imageUrl:
          "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=300&auto=format&fit=crop&q=80",
      },
    ],
  },
];

export function StoreSpotlight() {
  return null;

  const { addItem } = useCartStore();

  return (
    <section className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              Featured Verified Stores & Maker Workshops
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Shop directly from authentic craftsmen, workshops, and flagship
            brands across Pakistan.
          </p>
        </div>

        <Link
          href="/"
          className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>Explore All Stores</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 2x2 Grid of Store Showcases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {FEATURED_SHOPS.map((shop) => (
          <div
            key={shop.id}
            className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
          >
            {/* Store Top Card Header */}
            <div
              className={`bg-gradient-to-r ${shop.bannerBg} p-4 sm:p-5 text-white relative`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl ${shop.avatarBg} flex items-center justify-center font-black text-lg shadow-md shrink-0`}
                  >
                    {shop.avatarText}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Link href={`/store/${shop.slug}`}>
                        <h3 className="font-extrabold text-sm sm:text-base text-white hover:text-amber-300 transition-colors">
                          {shop.name}
                        </h3>
                      </Link>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-300 font-medium mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        {shop.city}
                      </span>
                      <span>•</span>
                      <span>{shop.category}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full text-amber-400 text-xs font-black">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{shop.rating.toFixed(1)}</span>
                    <span className="text-slate-400 font-normal text-[10px]">
                      ({shop.reviewsCount})
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-300 font-bold mt-1">
                    {shop.totalSales}
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Mini Product Showcase inside the store card */}
            <div className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {shop.products.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between hover:border-amber-400 transition-all group"
                  >
                    <div>
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-white mb-2">
                        <img
                          src={prod.imageUrl}
                          alt={prod.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <h4 className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-amber-600">
                        {prod.title}
                      </h4>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/60">
                      <div className="text-xs font-black text-slate-950">
                        PKR {prod.pricePkr.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-slate-400 line-through">
                        PKR {prod.originalPricePkr.toLocaleString()}
                      </div>
                      <button
                        onClick={() =>
                          addItem({
                            productId: prod.id,
                            title: prod.title,
                            imageUrl: prod.imageUrl,
                            pricePkr: prod.pricePkr,
                            quantity: 1,
                            sellerType: SellerType.THIRD_PARTY,
                            storeId: shop.id,
                            storeName: shop.name,
                          })
                        }
                        className="mt-1.5 w-full bg-slate-950 hover:bg-amber-400 hover:text-slate-950 text-white text-[10px] font-bold py-1 rounded-lg transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Store Footer Action */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium text-[11px]">
                  {shop.established} • 100% Genuine Direct Dispatch
                </span>
                <Link
                  href={`/store/${shop.slug || "lahore-tech-hub"}`}
                  className="font-bold text-slate-900 hover:text-amber-600 flex items-center gap-1 group"
                >
                  <span>Visit Shop Storefront</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
