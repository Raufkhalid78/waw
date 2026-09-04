'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { fetchProductById, fetchProducts } from '@/lib/api';
import { useCartStore } from '@/store/useCartStore';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductDetail } from "@/types/models";
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import {
  Star, Truck, ShieldCheck, RotateCcw, Store, CheckCircle2, Share2, Heart,
  Plus, Minus, ShoppingBag, Zap, ChevronRight, ChevronLeft, MapPin, Award,
  Loader2, Info, Package, BadgeCheck
} from 'lucide-react';
import { SellerType } from '@waw/types';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductDetail[]>([]);
  const [storeProducts, setStoreProducts] = useState<ProductDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews'>('overview');

  const storeScrollRef = useRef<HTMLDivElement>(null);
  const fbtScrollRef = useRef<HTMLDivElement>(null);

  const { addItem, selectedCity, toggleWishlist, isInWishlist } = useCartStore();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProductById(productId);
      if (data) {
        setProduct(data);

        const categoryParam = data.categorySlug
          ? { categorySlug: data.categorySlug }
          : data.categoryId
            ? { category: data.categoryId }
            : undefined;

        // Fetch related products independently — don't let one failure block the other
        const fetchRelated = async (): Promise<ProductDetail[]> => {
          try {
            const res = categoryParam
              ? await fetchProducts(categoryParam)
              : await fetchProducts({ limit: 20 });
            return (res.items || []).filter(p => p.productId !== data.productId).slice(0, 8);
          } catch (err) {
            logger.error("Failed to load related products, trying fallback", "PDP", err);
            try {
              const fallback = await fetchProducts({ limit: 20 });
              return (fallback.items || []).filter(p => p.productId !== data.productId).slice(0, 8);
            } catch (err2) {
              logger.error("Fallback fetch also failed", "PDP", err2);
              return [];
            }
          }
        };

        const fetchStoreProducts = async (): Promise<ProductDetail[]> => {
          if (!data.storeId) return [];
          try {
            const res = await fetchProducts({ storeId: data.storeId, limit: 12 });
            return (res.items || []).filter(p => p.productId !== data.productId).slice(0, 12);
          } catch (err) {
            logger.error("Failed to load store products", "PDP", err);
            return [];
          }
        };

        const [relatedItems, storeItems] = await Promise.all([fetchRelated(), fetchStoreProducts()]);
        setRelatedProducts(relatedItems);
        setStoreProducts(storeItems);
      } else {
        setProduct(null);
      }
    } catch (err: any) {
      logger.error("Failed to load product", "PDP", err);
      setError("Unable to load product information. Please check your connection and retry.");
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm text-gray-500">Loading product details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 max-w-md mx-auto text-center px-4">
        <h2 className="text-lg font-bold text-gray-900">Something went wrong</h2>
        <p className="text-sm text-gray-500">{error}</p>
        <button onClick={loadData} className="bg-amber-400 text-slate-900 hover:bg-amber-500 font-semibold px-5 py-2 rounded-lg text-sm transition-all cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Product Not Found</h2>
        <p className="text-sm text-gray-500">This product doesn't exist or has been removed.</p>
        <button onClick={() => router.push('/')} className="bg-amber-400 text-slate-900 hover:bg-amber-500 font-semibold px-5 py-2 rounded-lg text-sm cursor-pointer">
          Back to Home
        </button>
      </div>
    );
  }

  const isWishlisted = isInWishlist(product.productId);
  const reviewsList = product.reviews || [];
  const hasDiscount = Boolean(product.originalPricePkr && product.originalPricePkr > product.pricePkr);
  const hasVariants = product.variants && product.variants.length > 0;
  const selectedVariant = hasVariants ? product.variants.find(v => v.id === selectedVariantId) || product.variants[0] : null;
  const effectivePrice = product.pricePkr + (selectedVariant?.price_adjustment_pkr || 0);
  const effectiveOriginalPrice = product.originalPricePkr
    ? product.originalPricePkr + (selectedVariant?.price_adjustment_pkr || 0)
    : undefined;
  const effectiveHasDiscount = Boolean(effectiveOriginalPrice && effectiveOriginalPrice > effectivePrice);
  const effectiveDiscountPercent = effectiveHasDiscount
    ? Math.round(((effectiveOriginalPrice! - effectivePrice) / effectiveOriginalPrice!) * 100)
    : 0;

  // "Customers also viewed" — same category products sorted by popularity (sold count desc, then rating desc)
  const customersAlsoViewed = [...relatedProducts]
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0) || (b.rating || 0) - (a.rating || 0))
    .slice(0, 8);

  // "Similar Items" — same category, similar price range (±40%), excluding current product
  const priceMin = product.pricePkr * 0.6;
  const priceMax = product.pricePkr * 1.4;
  const similarItems = relatedProducts
    .filter(p => p.pricePkr >= priceMin && p.pricePkr <= priceMax)
    .slice(0, 8);

  const handleAddToCart = () => {
    addItem({
      productId: product.productId,
      title: product.title,
      pricePkr: effectivePrice,
      quantity,
      sellerType: product.sellerType,
      storeName: product.storeName,
      imageUrl: product.images?.[0] || product.imageUrl,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.variant_name,
    });
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1500);
  };

  const handleBuyNow = () => {
    addItem({
      productId: product.productId,
      title: product.title,
      pricePkr: effectivePrice,
      quantity,
      sellerType: product.sellerType,
      storeName: product.storeName,
      imageUrl: product.images?.[0] || product.imageUrl,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.variant_name,
    });
    router.push('/checkout');
  };

  const jsonLdProduct = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title,
    "image": product.images || [product.imageUrl],
    "description": product.description || product.title,
    "sku": product.sku || product.productId,
    "brand": { "@type": "Brand", "name": product.storeName || "Waw Official" },
    "offers": {
      "@type": "Offer",
      "url": `${process.env.NEXT_PUBLIC_SITE_URL || "https://waw.com.pk"}/products/${product.productId}`,
      "priceCurrency": "PKR",
      "price": product.pricePkr,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.inStock !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": { "@type": "Organization", "name": product.storeName || "Waw Official Retail" }
    },
    ...(product.rating ? { "aggregateRating": { "@type": "AggregateRating", "ratingValue": product.rating, "reviewCount": product.reviewsCount || 1 } } : {})
  };

  const avgRating = reviewsList.length > 0
    ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1)
    : "0.0";

  const specs = product.specifications || {};
  const highlights = product.highlights || [];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 py-4 space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 overflow-x-auto whitespace-nowrap">
        <Link href="/" className="hover:text-amber-600 transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
        <Link href={`/category/${product.categorySlug || 'all'}`} className="hover:text-amber-600 transition-colors">{product.category}</Link>
        <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
        <span className="text-gray-900 font-medium truncate max-w-xs">{product.title}</span>
      </nav>

      {/* Main Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
            <img
              src={product.images?.[selectedImageIndex] || product.images?.[0] || product.imageUrl}
              alt={product.title}
              className="w-full h-full object-contain"
            />
            {hasDiscount && product.discountPercent && (
              <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                -{product.discountPercent}%
              </span>
            )}
            {product.isExpress && (
              <span className="absolute top-3 right-3 bg-amber-400 text-slate-900 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                <Zap className="w-3 h-3 fill-current" /> Express
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    selectedImageIndex === idx
                      ? 'border-amber-500 ring-1 ring-amber-400/30'
                      : 'border-gray-200 hover:border-gray-300 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Trust Strip */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { icon: ShieldCheck, label: "100% Genuine", sub: "Verified Merchant", color: "text-green-600" },
              { icon: RotateCcw, label: "7 Days Return", sub: "Doorstep Inspection", color: "text-amber-500" },
              { icon: Award, label: "Secure Checkout", sub: "Safe & Encrypted", color: "text-blue-600" },
            ].map((item, i) => (
              <div key={i} className="p-2.5 bg-white border border-gray-200 rounded-lg text-center">
                <item.icon className={`w-4 h-4 ${item.color} mx-auto mb-1`} />
                <div className="text-[11px] font-semibold text-gray-900">{item.label}</div>
                <div className="text-[10px] text-gray-500">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Product Info */}
        <div className="lg:col-span-7 space-y-4">
          {/* Category + Actions */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {product.category}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleWishlist({
                  productId: product.productId, title: product.title, pricePkr: product.pricePkr,
                  quantity: 1, sellerType: product.sellerType, storeName: product.storeName,
                  imageUrl: product.images?.[0] || product.imageUrl,
                })}
                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                  isWishlisted ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-gray-200 text-gray-400 hover:text-red-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500' : ''}`} />
              </button>
              <button
                onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
                className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
            {product.title}
          </h1>

          {/* Rating + Stock */}
          <div className="flex items-center gap-3 text-sm">
            {reviewsList.length > 0 ? (
              <div className="flex items-center gap-1 bg-green-700 text-white text-xs font-bold px-2 py-0.5 rounded">
                <Star className="w-3 h-3 fill-current" />
                {avgRating}
              </div>
            ) : null}
            <span className="text-gray-500 text-xs">{reviewsList.length} {reviewsList.length === 1 ? 'review' : 'reviews'}</span>
            <span className="text-gray-300">|</span>
            <span className="text-green-700 text-xs font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> In Stock
            </span>
          </div>

          {/* Price */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                PKR {effectivePrice.toLocaleString()}
              </span>
              {effectiveHasDiscount && (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    PKR {effectiveOriginalPrice!.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                    Save PKR {(effectiveOriginalPrice! - effectivePrice).toLocaleString()}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Inclusive of all taxes. Free delivery on orders over PKR 5,000.
            </p>
          </div>

          {/* Variant Selector */}
          {hasVariants && (
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">
                {selectedVariant ? `Selected: ${selectedVariant.variant_name}` : 'Select Variant'}
              </div>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const isSelected = (selectedVariantId || product.variants[0]?.id) === variant.id;
                  const variantPrice = product.pricePkr + variant.price_adjustment_pkr;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 text-amber-800 ring-1 ring-amber-400/30'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div>{variant.variant_name}</div>
                      {variant.price_adjustment_pkr !== 0 && (
                        <div className={`text-[10px] mt-0.5 ${variant.price_adjustment_pkr > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {variant.price_adjustment_pkr > 0 ? `+PKR ${variant.price_adjustment_pkr.toLocaleString()}` : `-PKR ${Math.abs(variant.price_adjustment_pkr).toLocaleString()}`}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delivery */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Truck className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">
                  {product.isExpress ? 'Express Delivery' : 'Standard Delivery'}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Delivering to <span className="font-medium text-gray-700">{selectedCity}, Pakistan</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full ${product.isExpress ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <span className="text-gray-700">
                      Get it <span className="font-semibold text-gray-900">
                        {product.isExpress ? 'Wed, Sep 9' : 'Fri, Sep 11'}
                      </span>
                    </span>
                  </div>
                  {product.pricePkr >= 5000 && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-green-700 font-medium">FREE delivery</span>
                    </div>
                  )}
                  {product.pricePkr < 5000 && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      <span className="text-gray-500">Delivery fee: PKR 200</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                  <Store className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900 flex items-center gap-1">
                    {product.storeName}
                    <CheckCircle2 className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="text-[11px] text-gray-500">{product.sellerCity}</div>
                </div>
              </div>
              <Link href={`/store/${product.storeSlug}`} className="text-xs font-semibold text-amber-600 hover:text-amber-700">
                Visit Store →
              </Link>
            </div>
          </div>

          {/* Quantity + Actions */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stockCount || 10, quantity + 1))}
                  className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
              >
                <ShoppingBag className="w-4 h-4" />
                {addedAnimation ? 'Added!' : 'Add to Cart'}
              </button>
            </div>

            <button
              onClick={handleBuyNow}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
            >
              Buy Now — PKR {(effectivePrice * quantity).toLocaleString()}
            </button>

            <button
              onClick={() => {
                const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+923001234567";
                const variantText = selectedVariant ? ` (${selectedVariant.variant_name})` : '';
                const text = encodeURIComponent(`Hi! I want to order: ${product.title}${variantText} (PKR ${(effectivePrice * quantity).toLocaleString()})`);
                window.open(`https://wa.me/${wa.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Order via WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Tabs: Product Overview | Ratings & Reviews                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-5 py-3.5 text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Product Overview
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 px-5 py-3.5 text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'reviews'
                ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Ratings & Reviews {reviewsList.length > 0 && `(${reviewsList.length})`}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Product Overview</h3>
                  <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </div>
                </div>
              )}

              {/* Key Highlights */}
              {highlights.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Key Highlights</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-gray-600">
                    {highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Specifications Table */}
              {Object.keys(specs).length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Specifications</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        {Object.entries(specs).map(([key, val], idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-4 py-2.5 text-gray-500 font-medium w-1/3">{key}</td>
                            <td className="px-4 py-2.5 text-gray-900 font-medium">{String(val)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!product.description && highlights.length === 0 && Object.keys(specs).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">No product details available yet.</p>
              )}
            </div>
          ) : (
            /* Reviews Tab */
            <div className="space-y-5">
              {reviewsList.length > 0 ? (
                <>
                  {/* Rating Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-6 pb-5 border-b border-gray-100">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-gray-900">{avgRating}</div>
                      <div className="flex justify-center text-amber-400 my-2">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                      </div>
                      <div className="text-xs text-gray-500">{reviewsList.length} {reviewsList.length === 1 ? 'rating' : 'ratings'}</div>
                    </div>
                    <div className="space-y-1.5">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviewsList.filter(r => Math.round(r.rating) === star).length;
                        const pct = reviewsList.length > 0 ? Math.round((count / reviewsList.length) * 100) : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-xs">
                            <span className="w-6 text-right text-gray-600 font-medium">{star}</span>
                            <Star className="w-3 h-3 text-amber-400 fill-current shrink-0" />
                            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-10 text-right text-gray-500 font-medium">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Individual Reviews */}
                  <div className="space-y-3">
                    {reviewsList.map((rev) => (
                      <div key={rev.id} className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-600">
                              {rev.author?.[0] || '?'}
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-gray-900">{rev.author}</span>
                              {rev.verifiedPurchase && (
                                <span className="text-[10px] text-green-700 font-medium flex items-center gap-0.5 ml-1.5">
                                  <BadgeCheck className="w-3 h-3" /> Verified Purchase
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {[...Array(Math.floor(rev.rating))].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{rev.comment}</p>
                        <div className="text-[10px] text-gray-400 mt-2">{rev.city} • {rev.date}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-1">No reviews yet. Be the first to review this product.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Frequently Bought Together — Always shown                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Frequently Bought Together</h2>
        </div>
        <div className="relative">
          <div ref={fbtScrollRef} className="flex items-stretch gap-4 overflow-x-auto pb-2 scrollbar-none">
            {/* Current product first */}
            <div className="flex items-center gap-3 min-w-[240px] max-w-[280px] shrink-0 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-white shrink-0">
                <img src={product.images?.[0] || product.imageUrl || ""} alt={product.title} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-gray-900 line-clamp-2">{product.title}</div>
                <div className="text-xs font-bold text-gray-900 mt-1">PKR {effectivePrice.toLocaleString()}</div>
              </div>
            </div>

            {relatedProducts.slice(0, 4).map((rel) => (
              <div key={rel.productId} className="flex items-center gap-3 min-w-[240px] max-w-[280px] shrink-0">
                <span className="text-gray-300 text-lg font-bold shrink-0">+</span>
                <div className="flex items-center gap-3 flex-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-white shrink-0">
                    <img src={rel.images?.[0] || rel.imageUrl || ""} alt={rel.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${rel.productId}`} className="text-xs font-medium text-gray-900 line-clamp-2 hover:text-amber-600 transition-colors">
                      {rel.title}
                    </Link>
                    <div className="text-xs font-bold text-gray-900 mt-1">PKR {rel.pricePkr.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500">Total: </span>
            <span className="text-sm font-bold text-gray-900">
              PKR {[product, ...relatedProducts.slice(0, 4)].reduce((sum, p) => sum + (p.productId === product.productId ? effectivePrice : p.pricePkr), 0).toLocaleString()}
            </span>
          </div>
          <button
            onClick={() => {
              [product, ...relatedProducts.slice(0, 4)].forEach(p => {
                addItem({
                  productId: p.productId,
                  title: p.title,
                  pricePkr: p.productId === product.productId ? effectivePrice : p.pricePkr,
                  quantity: 1,
                  sellerType: p.sellerType,
                  storeName: p.storeName,
                  imageUrl: p.images?.[0] || p.imageUrl,
                });
              });
              setAddedAnimation(true);
              setTimeout(() => setAddedAnimation(false), 1500);
            }}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer"
          >
            Add All to Cart
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* More From [Store] — Always shown (Noon-style)                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">More From {product.storeName}</h2>
          <Link
            href={`/store/${product.storeSlug}`}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            Visit Store <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {storeProducts.length > 0 ? (
          <div className="relative group/scroll">
            <button
              onClick={() => storeScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-amber-600 opacity-0 group-hover/scroll:opacity-100 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div ref={storeScrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {storeProducts.map((prod) => (
                <div key={prod.productId} className="min-w-[180px] max-w-[200px] shrink-0">
                  <ProductCard
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
                    imageUrl={prod.images?.[0] || prod.imageUrl || ""}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => storeScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-amber-600 opacity-0 group-hover/scroll:opacity-100 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <Store className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No other products from this store yet.</p>
            <Link href={`/store/${product.storeSlug}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700">
              Visit Store <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Customers Also Viewed — Horizontal Scroll                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {customersAlsoViewed.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Customers Also Viewed</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {customersAlsoViewed.map((rel) => (
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
                imageUrl={rel.images?.[0] || rel.imageUrl || ""}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Similar Items — Same category, similar price range                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {similarItems.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Similar Items</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {similarItems.map((rel) => (
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
                imageUrl={rel.images?.[0] || rel.imageUrl || ""}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* You May Also Like — Grid                                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {relatedProducts.slice(0, 8).map((rel) => (
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
                imageUrl={rel.images?.[0] || rel.imageUrl || ""}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mobile Sticky Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[10px] text-gray-500">Total</div>
          <div className="text-lg font-bold text-gray-900">PKR {(effectivePrice * quantity).toLocaleString()}</div>
        </div>
        <button
          onClick={handleAddToCart}
          className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2.5 px-4 rounded-lg text-xs transition-all cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 inline mr-1" />
          {addedAnimation ? 'Added!' : 'Cart'}
        </button>
        <button
          onClick={handleBuyNow}
          className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-2.5 px-5 rounded-lg text-xs transition-all cursor-pointer"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}
