"use client";

import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import {
  Heart,
  ShoppingBag,
  Trash2,
  Share2,
  MessageSquare,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addItem } = useCartStore();

  const handleMoveToCart = (item: any) => {
    addItem({
      productId: item.productId,
      title: item.title,
      pricePkr: item.pricePkr,
      quantity: 1,
      sellerType: item.sellerType,
      storeName: item.storeName,
      imageUrl: item.imageUrl,
    });
    toggleWishlist(item);
  };

  const handleShareWishlist = () => {
    const listText = wishlist
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.title} - PKR ${item.pricePkr.toLocaleString()}`,
      )
      .join("\n");
    const text = encodeURIComponent(
      `Check out my Waw Pakistan Wishlist! 🛍️✨\n\n${listText}\n\nShop on Waw: http://localhost:3000`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8 space-y-8">
      {/* ── Breadcrumb Navigation ────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-amber-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">My Saved Wishlist</span>
      </nav>

      {/* ── Header Title & Actions ───────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2">
            <Heart className="w-7 h-7 text-rose-600 fill-rose-600" />
            <span>My Saved Wishlist</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {wishlist.length} {wishlist.length === 1 ? "item" : "items"} saved
            from verified Pakistani artisans & flagship stores
          </p>
        </div>

        {wishlist.length > 0 && (
          <button
            onClick={handleShareWishlist}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl transition-all shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Share2 className="w-4 h-4" />
            <span>Share on WhatsApp</span>
          </button>
        )}
      </div>

      {/* ── Wishlist Items Grid ──────────────────────────────────────────── */}
      {wishlist.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {wishlist.map((item) => (
            <div
              key={item.productId}
              className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col justify-between hover:border-amber-400 hover:shadow-lg transition-all group"
            >
              <div className="space-y-3">
                {/* Image */}
                <Link
                  href={`/products/${item.productId}`}
                  className="block relative aspect-square rounded-2xl overflow-hidden bg-slate-50"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(item);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-rose-600 hover:scale-110 shadow-xs transition-transform cursor-pointer"
                    title="Remove from Wishlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Link>

                {/* Seller & Title */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 truncate">
                    🏬 {item.storeName || "Verified Store"}
                  </div>
                  <Link href={`/products/${item.productId}`}>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                </div>
              </div>

              {/* Price & Move to Cart */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="text-base font-black text-slate-950">
                  PKR {item.pricePkr.toLocaleString()}
                </div>

                <button
                  onClick={() => handleMoveToCart(item)}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Move to Cart</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-950">
              Your Wishlist is Empty
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Save your favorite items by tapping the heart icon on any product
              to easily find them later or track price drops.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-950 hover:bg-amber-400 hover:text-slate-950 text-white font-black rounded-full text-xs transition-all shadow-xs"
          >
            <span>Explore Trending Products</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
