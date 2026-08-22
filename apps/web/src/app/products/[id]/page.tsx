'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProductById, getRelatedProducts } from '@/data/mockProducts';
import { useCartStore } from '@/store/useCartStore';
import { ProductCard } from '@/components/ui/ProductCard';
import {
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Store,
  CheckCircle2,
  Share2,
  Heart,
  Plus,
  Minus,
  ShoppingBag,
  Zap,
  ChevronRight,
  MapPin,
  Flame,
  Award,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { SellerType } from '@waw/types';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const product = getProductById(productId) || getProductById('prod_m1')!;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewsList, setReviewsList] = useState(product.reviews);
  const [newRating, setNewRating] = useState(5);
  const [newAuthor, setNewAuthor] = useState('');
  const [newCity, setNewCity] = useState('Lahore');
  const [newComment, setNewComment] = useState('');

  const { addItem, selectedCity, toggleWishlist, isInWishlist } = useCartStore();
  const isWishlisted = isInWishlist(product.productId);
  const relatedProducts = getRelatedProducts(product.category, product.productId);

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

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor.trim() || !newComment.trim()) return;

    const newRev = {
      id: `rev_${Date.now()}`,
      author: newAuthor.trim(),
      city: newCity,
      rating: newRating,
      date: 'Just now',
      comment: newComment.trim(),
      verifiedPurchase: true,
    };

    setReviewsList([newRev, ...reviewsList]);
    setNewAuthor('');
    setNewComment('');
    setShowReviewModal(false);
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
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 bg-slate-50 ${
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
              <div className="text-[10px] text-slate-500 font-medium">Hassle Free</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-2xl text-center space-y-1 shadow-2xs">
              <Award className="w-5 h-5 text-sky-600 mx-auto" />
              <div className="text-[11px] font-black text-slate-900">Buyer Protection</div>
              <div className="text-[10px] text-slate-500 font-medium">Escrow Regulated</div>
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

            {/* Rating & Sold Stats */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span className="font-black text-slate-900">{product.rating}</span>
                <span className="text-slate-500">({product.reviewsCount} verified reviews)</span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-bold">
                <strong className="text-slate-900">{product.soldCount.toLocaleString()}+</strong> units sold
              </span>
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
                  Delivering directly to <strong className="text-slate-900">{selectedCity}, Pakistan</strong> & 200+ cities via TCS / PostEx.
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

              <span className="text-xs font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                ★ 4.9 Rating
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
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-black text-sm text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stockCount, quantity + 1))}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
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

            <button
              onClick={() => setShowReviewModal(true)}
              className="bg-slate-950 hover:bg-amber-400 hover:text-slate-950 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              ✍️ Write a Review
            </button>
          </div>
        </div>

        {/* Review Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviewsList.map((rev) => (
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
          ))}
        </div>
      </div>

      {/* Review Submission Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Write a Verified Review</h3>
                <p className="text-xs text-slate-500">{product.title}</p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-4 text-xs">
              {/* Star Rating Selector */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Your Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewRating(star)}
                      className="p-1 cursor-pointer hover:scale-125 transition-transform"
                    >
                      <Star className={`w-6 h-6 ${newRating >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                  <span className="font-black text-slate-800 ml-2">{newRating} of 5 Stars</span>
                </div>
              </div>

              {/* Name & City */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asad Malik"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">City</label>
                  <select
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  >
                    {['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Multan', 'Faisalabad', 'Sialkot', 'Quetta'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Your Feedback</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Share your experience regarding material quality, delivery time, or fit..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Buyer Badge Attached
                </span>
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Related / Frequently Bought Together Items ───────────────────── */}
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
              deliveryTime={rel.deliveryTime}
              imageUrl={rel.images[0]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
