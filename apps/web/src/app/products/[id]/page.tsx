'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchProductById, fetchProducts } from '@/lib/api';
import { useCartStore } from '@/store/useCartStore';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductDetail } from "@/types/models";
import {
  Star, Truck, ShieldCheck, RotateCcw, Store, CheckCircle2, Share2, Heart,
  Plus, Minus, ShoppingBag, Zap, ChevronRight, MapPin, Flame, Award, Sparkles, MessageSquare, Loader2
} from 'lucide-react';
import { SellerType } from '@waw/types';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);

  const { addItem, selectedCity, toggleWishlist, isInWishlist } = useCartStore();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const data = await fetchProductById(productId);
      if (data) {
        setProduct(data);
        const related = await fetchProducts(
          data.categorySlug
            ? { categorySlug: data.categorySlug }
            : data.categoryId
              ? { category: data.categoryId }
              : undefined
        );
        setRelatedProducts((related.items || []).filter(p => p.productId !== data.productId).slice(0, 4));
      }
      setIsLoading(false);
    }
    loadData();
  }, [productId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="text-slate-500 font-medium">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h2 className="text-2xl font-black text-slate-900">Product Not Found</h2>
        <p className="text-slate-500">The product you are looking for does not exist or has been removed.</p>
        <button onClick={() => router.push('/')} className="bg-amber-400 text-slate-950 hover:bg-amber-500 font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer">
          Return to Home
        </button>
      </div>
    );
  }

  const isWishlisted = isInWishlist(product.productId);
  const reviewsList = product.reviews || [];

  const handleAddToCart = () => {
    addItem({
      productId: product.productId,
      title: product.title,
      pricePkr: product.pricePkr,
      quantity,
      sellerType: product.sellerType,
      storeName: product.storeName,
      imageUrl: product.images[0],
    });
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1500);
  };

  const handleBuyNow = () => {
    addItem({
      productId: product.productId,
      title: product.title,
      pricePkr: product.pricePkr,
      quantity,
      sellerType: product.sellerType,
      storeName: product.storeName,
      imageUrl: product.images[0],
    });
    router.push('/checkout');
  };

  const handleWhatsAppOrder = () => {
    const text = encodeURIComponent(
      `Salam Waw Customer Care! 🛍️\n\nI want to place an order for:\n📦 Product: ${product.title}\n🔖 SKU: ${product.sku}\n💵 Price: PKR ${(product.pricePkr * quantity).toLocaleString()} (Qty: ${quantity})\n📍 Delivery City: ${selectedCity}, Pakistan\n🔗 Link: ${typeof window !== 'undefined' ? window.location.href : ''}\n\nPlease confirm availability and dispatch details.`
    );
    window.open(`https://wa.me/923001234567?text=${text}`, '_blank');
  };

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-6 space-y-10">
      {/* ── Breadcrumb Navigation ────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-none">
        <Link href="/" className="hover:text-amber-600 transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <Link href="/" className="hover:text-amber-600 transition-colors">{product.category}</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-900 font-bold truncate max-w-md">{product.title}</span>
      </nav>

      {/* ── Main Product Display Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Left Column: Interactive Image Gallery (5 Cols) ──────────────── */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Large Image Preview */}
          <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm group">
            <img
              src={product.images[selectedImageIndex] || product.images[0]}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Discount Badge */}
            {product.discountPercent > 0 && (
              <div className="absolute top-4 left-4 bg-rose-600 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-md">
                SAVE {product.discountPercent}%
              </div>
            )}

            {/* Waw Express Pill */}
            {product.isExpress && (
              <div className="absolute top-4 right-4 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>WAW EXPRESS</span>
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 bg-slate-50 cursor-pointer ${
                    selectedImageIndex === idx
                      ? 'border-amber-500 ring-2 ring-amber-400/30 scale-105'
                      : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Trust Guarantees Strip */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-white border border-slate-200 rounded-2xl text-center space-y-1 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto" />
              <div className="text-[11px] font-black text-slate-900">100% Genuine</div>
              <div className="text-[10px] text-slate-500 font-medium">Verified Merchant</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-2xl text-center space-y-1 shadow-2xs">
              <RotateCcw className="w-5 h-5 text-amber-500 mx-auto" />
              <div className="text-[11px] font-black text-slate-900">7 Days Return</div>
              <div className="text-[10px] text-slate-500 font-medium">Doorstep Inspection</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-2xl text-center space-y-1 shadow-2xs">
              <Award className="w-5 h-5 text-sky-600 mx-auto" />
              <div className="text-[11px] font-black text-slate-900">Secure Checkout</div>
              <div className="text-[10px] text-slate-500 font-medium">Safe & Encrypted</div>
            </div>
          </div>
        </div>

        {/* ── Middle / Right Column: Product Info & Purchase Box (7 Cols) ──── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Info */}
          <div className="space-y-2.5">
            {/* Store & Category Tag */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                  {product.category}
                </span>
                <span className="text-xs font-semibold text-slate-500">SKU: {product.sku}</span>
              </div>

              {/* Wishlist & Share */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    toggleWishlist({
                      productId: product.productId,
                      title: product.title,
                      pricePkr: product.pricePkr,
                      quantity: 1,
                      sellerType: product.sellerType,
                      storeName: product.storeName,
                      imageUrl: product.images[0],
                    })
                  }
                  className={`p-2 rounded-full border transition-all cursor-pointer ${
                    isWishlisted
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Product link copied to clipboard!');
                    }
                  }}
                  className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  title="Share Product"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-snug">
              {product.title}
            </h1>

            {/* Rating & Stock Stats (Reconciled to Real Reviews List) */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {reviewsList.length > 0 ? (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <span className="font-black text-slate-900">
                    {(reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1)}
                  </span>
                  <span className="text-slate-500">({reviewsList.length} verified {reviewsList.length === 1 ? 'review' : 'reviews'})</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-500 font-medium">
                  <span>No customer reviews yet</span>
                </div>
              )}
              <span className="text-slate-300">|</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                In Stock ({product.stockCount} available)
              </span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-slate-950">
                PKR {product.pricePkr.toLocaleString()}
              </span>
              {product.originalPricePkr > product.pricePkr && (
                <>
                  <span className="text-base text-slate-400 line-through font-medium">
                    PKR {product.originalPricePkr.toLocaleString()}
                  </span>
                  <span className="bg-rose-100 text-rose-700 text-xs font-black px-2 py-0.5 rounded-md">
                    Save PKR {(product.originalPricePkr - product.pricePkr).toLocaleString()} ({product.discountPercent}% OFF)
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Inclusive of all retail taxes. Enjoy <strong className="text-emerald-700">FREE Delivery</strong> on orders over PKR 5,000.
            </p>
          </div>

          {/* Delivery & Seller Information Box */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
              <Truck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <span>{product.isExpress ? '⚡ Waw Express Delivery' : '🚚 Standard Marketplace Delivery'}</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded text-[10px] font-bold">
                    {product.isExpress ? `4-5 Days in ${selectedCity}` : `7-9 Days in ${selectedCity}`}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Delivering directly to <strong className="text-slate-900">{selectedCity}, Pakistan</strong> & 200+ cities via PostEx Express Logistics.
                </p>
              </div>
            </div>

            {/* Seller Profile Card */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                  <Store className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <span>{product.storeName}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {product.sellerCity} • {product.sellerType === SellerType.FIRST_PARTY ? 'Waw 1P Flagship Store' : 'Verified 3P Artisan Maker'}
                  </div>
                </div>
              </div>

              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Store</span>
              </span>
            </div>
          </div>

          {/* Quantity & Action Buttons */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              {/* Quantity Counter */}
              <div className="flex items-center border-2 border-slate-200 rounded-2xl bg-slate-50 p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-white transition-colors cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-black text-sm text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stockCount, quantity + 1))}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-white transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
               onClick={handleAddToCart}
                className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black py-3.5 px-6 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{addedAnimation ? 'Added to Cart!' : 'Add to Cart'}</span>
              </button>
            </div>

            {/* Buy Now Direct Button */}
            <button
              onClick={handleBuyNow}
              className="w-full bg-slate-950 hover:bg-slate-900 text-white font-black py-4 px-6 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>Buy Now • PKR {(product.pricePkr * quantity).toLocaleString()}</span>
            </button>

            {/* Quick Order via WhatsApp */}
            <button
              onClick={handleWhatsAppOrder}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-6 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-100" />
              <span>Quick Order via WhatsApp Helpline (+92 300 1234567)</span>
            </button>
          </div>

          {/* Key Product Highlights List */}
          <div className="border-t border-slate-200 pt-5 space-y-3">
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Key Highlights</span>
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 font-medium">
              {product.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Product Specifications & Description Tabs ───────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-xl font-black text-slate-950 tracking-tight">Product Specifications & Story</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Detailed technical parameters and craftsmanship background</p>
        </div>

        {/* Description Text */}
        <p className="text-sm text-slate-700 leading-relaxed font-medium">
          {product.description}
        </p>

        {/* Technical Specifications Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-black text-xs text-slate-900 uppercase tracking-wider">
            Technical Parameters
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {Object.entries(product.specifications).map(([key, val], idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 p-3.5 hover:bg-slate-50/60 transition-colors">
                <span className="font-bold text-slate-500">{key}</span>
                <span className="sm:col-span-2 font-semibold text-slate-900 mt-0.5 sm:mt-0">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Customer Reviews & Ratings Section ───────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              <span>Verified Customer Reviews</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Read real feedback from verified buyers across Pakistan
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-black text-slate-950">{product.rating}</div>
              <div>
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 font-bold">{reviewsList.length} Verified Reviews</div>
              </div>
            </div>
            {/* Fake review form button removed for Phase A compliance */}
          </div>
        </div>

        {/* Review Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviewsList.length > 0 ? reviewsList.map((rev) => (
            <div key={rev.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(Math.floor(rev.rating))].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>
                <span className="text-[10px] font-semibold text-slate-400">{rev.date}</span>
              </div>

              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                &ldquo;{rev.comment}&rdquo;
              </p>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="font-black text-slate-900">{rev.author} ({rev.city})</span>
                {rev.verifiedPurchase && (
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[10px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified Purchase
                  </span>
                )}
              </div>
            </div>
          )) : (
            <div className="col-span-full py-8 text-center text-slate-500 text-sm">
              No customer reviews yet. Purchase this item to be the first to review!
            </div>
          )}
        </div>
      </div>

      {/* ── Related / Frequently Bought Together Items ───────────────────── */}
      {relatedProducts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-400" />
              <span>Similar Items You Might Like</span>
            </h2>
            <Link href="/" className="text-xs font-bold text-amber-600 hover:text-amber-700">
              View All in {product.category} →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {relatedProducts.map((rel) => (
              <ProductCard
                key={rel.productId}
                productId={rel.productId}
                title={rel.title}
                pricePkr={rel.pricePkr}
                originalPricePkr={rel.originalPricePkr}
                discountPercent={rel.discountPercent}
                rating={rel.rating}
                reviewsCount={rel.reviewsCount}
                soldCount={rel.soldCount}
                isExpress={rel.isExpress}
                sellerType={rel.sellerType}
                storeName={rel.storeName}
                sellerCity={rel.sellerCity}
                imageUrl={rel.images[0]}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Mobile Sticky Bottom Action Bar ───────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] text-slate-500 font-medium">Total Price:</div>
          <div className="text-lg font-black text-slate-950 font-mono">PKR {(product.pricePkr * quantity).toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-[220px]">
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-950 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{addedAnimation ? 'Added!' : 'Add'}</span>
          </button>
          <button
            onClick={handleBuyNow}
            className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center transition-all shadow-md cursor-pointer"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}