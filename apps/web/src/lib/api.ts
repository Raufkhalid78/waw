import { ProductDetail } from "@/types/models";
import { StoreDetail } from "@/types/models";
import {
  Category,
  CheckoutQuoteRequest,
  CheckoutQuoteResponse,
  PaymentMethod,
  SellerType,
} from "@waw/types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

if (typeof window !== "undefined") {
  console.log(`[WAW] Client API Origin: ${API_BASE_URL}`);
}

function mapApiProductToDetail(p: any): ProductDetail {
  const basePrice = Number(p.base_price_pkr ?? p.price_pkr ?? p.basePricePkr ?? p.pricePkr ?? 0);
  const comparePrice = (p.compare_at_price_pkr ?? p.comparePricePkr ?? p.compareAtPricePkr) 
    ? Number(p.compare_at_price_pkr ?? p.comparePricePkr ?? p.compareAtPricePkr) 
    : undefined;
  const hasRealDiscount = comparePrice !== undefined && comparePrice > basePrice;
  const discountPercent = hasRealDiscount
    ? Math.round(((comparePrice - basePrice) / comparePrice) * 100)
    : 0;

  // Derive stock by summing up active variants stock, or fallback to root property
  const activeVariants = Array.isArray(p.variants) ? p.variants.filter((v: any) => v.is_active !== false) : [];
  const stockCount = activeVariants.length > 0 
    ? activeVariants.reduce((sum: number, v: any) => sum + (v.stock_quantity ?? v.stockQuantity ?? 0), 0)
    : Number(p.stock_quantity ?? p.stockQuantity ?? 0);

  const rawImages = Array.isArray(p.images) && p.images.length > 0
    ? p.images
    : (p.thumbnail ? [p.thumbnail] : (p.imageUrl ? [p.imageUrl] : []));

  return {
    id: p.id,
    productId: p.slug || p.id || p.productId,
    slug: p.slug || p.id,
    title: p.title || "Product",
    titleUrdu: p.title_urdu || p.titleUrdu,
    category: p.category?.name || p.categoryName || p.category || "General",
    categorySlug: p.category?.slug || p.categorySlug || "",
    categoryId: p.category_id || p.categoryId || p.category?.id || "",
    pricePkr: basePrice,
    originalPricePkr: hasRealDiscount ? comparePrice : undefined,
    discountPercent: hasRealDiscount ? discountPercent : 0,
    rating: p.rating_average !== undefined && p.rating_average !== null ? Number(p.rating_average) : (p.ratingAverage !== undefined ? Number(p.ratingAverage) : 0),
    reviewsCount: p.rating_count !== undefined && p.rating_count !== null ? Number(p.rating_count) : (p.ratingCount !== undefined ? Number(p.ratingCount) : (Array.isArray(p.reviews) ? p.reviews.length : 0)),
    soldCount: Number(p.sold_count ?? p.soldCount ?? 0),
    isExpress: Boolean(p.is_first_party ?? p.isFirstParty ?? false),
    sellerType: p.is_first_party || p.isFirstParty
      ? SellerType.FIRST_PARTY
      : SellerType.THIRD_PARTY,
    storeId: p.store_id || p.storeId || p.store?.id,
    storeName: p.store?.name || p.storeName || "Waw Official Store",
    storeSlug: p.store?.slug || p.storeSlug || "waw-official",
    sellerCity: p.store?.city || p.sellerCity || "Pakistan",
    imageUrl: rawImages[0] || "",
    images: rawImages,
    description: p.description || "",
    highlights: p.attributes?.highlights || [],
    specifications: p.attributes?.specifications || {},
    inStock: stockCount > 0,
    stockCount: stockCount,
    sku: p.sku || (activeVariants[0]?.sku ?? ""),
    reviews: Array.isArray(p.reviews) ? p.reviews.map((r: any) => ({
      id: r.id,
      author: r.author || r.profiles?.full_name || "",
      city: r.city || "",
      rating: Number(r.rating || 0),
      date: r.created_at ? new Date(r.created_at).toLocaleDateString() : (r.date || ""),
      comment: r.comment || "",
      verifiedPurchase: Boolean(r.is_verified_purchase ?? r.verifiedPurchase ?? false),
      is_verified_purchase: Boolean(r.is_verified_purchase ?? r.verifiedPurchase ?? false),
      created_at: r.created_at,
    })) : [],
  };
}

export async function fetchCategories(locale = "en"): Promise<Category[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/categories?locale=${encodeURIComponent(locale)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("Failed to fetch categories:", error);
    return [];
  }
}

export async function fetchCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/categories/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch category, status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`[API Error] fetchCategoryBySlug ${slug}:`, error);
    throw error;
  }
}

export async function fetchProducts(params?: {
  q?: string;
  category?: string;
  categorySlug?: string;
  storeId?: string;
  city?: string;
  sellerType?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "featured" | "price-asc" | "price-desc" | "rating";
  page?: number;
  limit?: number;
}): Promise<{ items: ProductDetail[]; facets?: any }> {
  try {
    if (params?.q) {
      // Query Search Route
      const res = await fetch(
        `${API_BASE_URL}/api/search?q=${encodeURIComponent(params.q)}`,
        {
          cache: "no-store",
        },
      );
      if (res.ok) {
        const searchData = await res.json();
        const hits = searchData.hits || searchData.results || [];
        if (hits.length > 0) {
          return { items: hits.map((h: any) => mapApiProductToDetail(h.document || h)) };
        }
      }
    }

    const query = new URLSearchParams();
    if (params?.category) query.append("categoryId", params.category);
    if (params?.categorySlug) query.append("categorySlug", params.categorySlug);
    if (params?.storeId) query.append("storeId", params.storeId);
    if (params?.city && params.city !== "All Cities")
      query.append("city", params.city);
    if (params?.sellerType && params.sellerType !== "ALL")
      query.append(
        "isFirstParty",
        params.sellerType === "1P" ? "true" : "false",
      );
    if (params?.minPrice !== undefined)
      query.append("minPrice", params.minPrice.toString());
    if (params?.maxPrice !== undefined)
      query.append("maxPrice", params.maxPrice.toString());
    if (params?.sortBy) query.append("sortBy", params.sortBy);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());

    const res = await fetch(
      `${API_BASE_URL}/api/products?${query.toString()}`,
      {
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error("API request failed");
    const data = await res.json();
    const items = Array.isArray(data) ? data : data.items || [];
    
    return {
      items: items.map(mapApiProductToDetail),
      facets: data.facets || { minPrice: 0, maxPrice: 500000, cities: [], sellerTypes: [] }
    };
  } catch (error) {
    console.error("[fetchProducts] API Error:", error);
    throw error;
  }
}

export async function fetchProductById(
  productId: string,
): Promise<ProductDetail | undefined> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(productId)}`, {
      cache: "no-store",
    });
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`Product fetch failed with status: ${res.status}`);
    const data = await res.json();
    if (data?.id || data?.slug || data?.productId) return mapApiProductToDetail(data);
    return undefined;
  } catch (error) {
    console.error(`[fetchProductById] Error loading product ${productId}:`, error);
    throw error;
  }
}

export async function fetchStoreBySlug(
  slug: string,
): Promise<StoreDetail | undefined> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/stores/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    if (!data) return undefined;
    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      city: data.city || "Pakistan",
      location: data.address || data.city || "Pakistan",
      category: data.seller_type === "FIRST_PARTY" ? "Official Retail" : "Verified Merchant",
      rating: data.rating_average !== undefined && data.rating_average !== null ? Number(data.rating_average) : undefined,
      rating_average: data.rating_average !== undefined && data.rating_average !== null ? Number(data.rating_average) : undefined,
      reviewsCount: Number(data.rating_count ?? data.ratingCount ?? 0),
      salesCount: 0,
      responseRate: data.response_rate || undefined,
      joinedYear: data.created_at ? new Date(data.created_at).getFullYear().toString() : undefined,
      bannerImage: data.banner_url || data.bannerImage || "",
      banner_url: data.banner_url || data.bannerImage || "",
      logoImage: data.logo_url || data.logoImage || "",
      logo_url: data.logo_url || data.logoImage || "",
      about: data.description || "",
      description: data.description,
      kycVerified: Boolean(data.is_verified ?? (data.status === "ACTIVE")),
      is_verified: Boolean(data.is_verified ?? (data.status === "ACTIVE")),
      isVerified: Boolean(data.is_verified ?? (data.status === "ACTIVE")),
      status: data.status,
      seller_type: data.seller_type,
      sellerType: data.seller_type,
      specialties: [],
      created_at: data.created_at,
    };
  } catch (error) {
    console.error("Failed to fetch store:", error);
    return undefined;
  }
}

export async function fetchCheckoutQuote(
  input: CheckoutQuoteRequest,
): Promise<CheckoutQuoteResponse> {
  const res = await fetch(`${API_BASE_URL}/api/checkout/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate checkout quote");
  }
  return await res.json();
}

export async function createOrderApi(orderInput: any): Promise<any> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("waw_auth_token")
      : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/orders`, {
    method: "POST",
    headers,
    body: JSON.stringify(orderInput),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to place order");
  }
  return await res.json();
}

export async function fetchOrderById(orderId: string): Promise<any> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("waw_auth_token")
      : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Order not found");
  }
  return await res.json();
}

export async function fetchUserOrders(): Promise<any[]> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("waw_auth_token")
      : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE_URL}/api/orders`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to fetch user orders:", err);
    return [];
  }
}

export async function submitOrderReturn(
  orderId: string,
  returnInput: {
    reason: string;
    comments?: string;
    refundPreference?: string;
    pickupAddress?: string;
    pickupCity?: string;
  },
): Promise<any> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("waw_auth_token")
      : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/return`, {
    method: "POST",
    headers,
    body: JSON.stringify(returnInput),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to submit return request");
  }
  return await res.json();
}

export async function initiatePaymentApi(paymentInput: {
  orderId: string;
  paymentMethod: PaymentMethod;
  customerPhone: string;
  customerEmail?: string;
  returnUrl: string;
}): Promise<{
  checkoutUrl?: string;
  transactionId?: string;
  qrPayload?: string;
}> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("waw_auth_token")
      : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/payments/xpay/initiate`, {
    method: "POST",
    headers,
    body: JSON.stringify(paymentInput),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to initiate payment gateway session");
  }
  return await res.json();
}

