import { ProductDetail } from "@/types/models";
import { StoreDetail } from "@/types/models";
import { logger } from "./logger";
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

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  logger.debug(`Client API Origin: ${API_BASE_URL}`, "API");
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
    isExpress: Boolean(p.isExpress ?? p.is_first_party ?? p.isFirstParty ?? false),
    sellerType: p.sellerType || (p.is_first_party || p.isFirstParty
      ? SellerType.FIRST_PARTY
      : SellerType.THIRD_PARTY),
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
    variants: activeVariants.map((v: any) => ({
      id: v.id,
      variant_name: v.variant_name || v.name || "",
      price_adjustment_pkr: Number(v.price_adjustment_pkr ?? v.priceAdjustmentPkr ?? 0),
      sku: v.sku || "",
      stock_quantity: Number(v.stock_quantity ?? v.stockQuantity ?? 0),
    })),
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

export class ApiError extends Error {
  public status?: number;
  public correlationId?: string;
  public isTimeout?: boolean;
  public isNetwork?: boolean;

  constructor(
    message: string,
    opts?: {
      status?: number;
      correlationId?: string;
      isTimeout?: boolean;
      isNetwork?: boolean;
    }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = opts?.status;
    this.correlationId = opts?.correlationId;
    this.isTimeout = opts?.isTimeout;
    this.isNetwork = opts?.isNetwork;
  }
}

/**
 * Safe, abortable fetch with bounded exponential retries and correlation tracking.
 */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit & { timeoutMs?: number; retries?: number }
): Promise<{ ok: boolean; status: number; data?: T; error?: ApiError }> {
  const timeoutMs = options?.timeoutMs ?? 8000;
  const maxRetries = options?.method && options.method !== "GET" ? 0 : (options?.retries ?? 2);
  const correlationId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = new Headers(options?.headers || {});
      headers.set("X-Correlation-Id", correlationId);

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
        credentials: "include",
      });

      clearTimeout(timer);

      if (res.status === 404) {
        return {
          ok: false,
          status: 404,
          error: new ApiError("Resource not found", { status: 404, correlationId }),
        };
      }

      if (!res.ok) {
        // Retry on 502, 503, 504 server unavailability
        if ([502, 503, 504].includes(res.status) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 300;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        let errMsg = `Request failed with HTTP status ${res.status}`;
        try {
          const errBody = await res.json();
          if (errBody?.error) errMsg = errBody.error;
        } catch {}

        return {
          ok: false,
          status: res.status,
          error: new ApiError(errMsg, { status: res.status, correlationId }),
        };
      }

      const data = await res.json();
      return { ok: true, status: res.status, data };
    } catch (err: any) {
      clearTimeout(timer);
      const isTimeout = err.name === "AbortError";
      lastError = new ApiError(
        isTimeout ? "Request timed out after 8 seconds" : (err.message || "Network error"),
        { correlationId, isTimeout, isNetwork: !isTimeout }
      );

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 300;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  return { ok: false, status: 0, error: lastError };
}

export async function fetchCategories(locale = "en"): Promise<Category[]> {
  const res = await safeFetch<Category[]>(
    `${API_BASE_URL}/api/categories?locale=${encodeURIComponent(locale)}`,
    { cache: "no-store", timeoutMs: 6000 }
  );
  if (res.ok && Array.isArray(res.data)) {
    return res.data;
  }
  return [];
}

export async function fetchCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  const res = await safeFetch<Category>(
    `${API_BASE_URL}/api/categories/${encodeURIComponent(slug)}`,
    { cache: "no-store", timeoutMs: 6000 }
  );

  if (res.status === 404) return null;
  if (res.ok && res.data) return res.data;
  if (res.error) throw res.error;
  return null;
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
  if (params?.q) {
    const searchRes = await safeFetch<any>(
      `${API_BASE_URL}/api/search?q=${encodeURIComponent(params.q)}`,
      { cache: "no-store", timeoutMs: 6000 }
    );
    if (searchRes.ok && searchRes.data) {
      const hits = searchRes.data.hits || searchRes.data.results || [];
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

  const res = await safeFetch<any>(
    `${API_BASE_URL}/api/products?${query.toString()}`,
    { cache: "no-store", timeoutMs: 8000 }
  );

  if (!res.ok) {
    if (res.error) throw res.error;
    throw new ApiError("Failed to fetch marketplace products", { status: res.status });
  }

  const data = res.data;
  const items = Array.isArray(data) ? data : data?.items || [];

  return {
    items: items.map(mapApiProductToDetail),
    facets: data?.facets || { minPrice: 0, maxPrice: 500000, cities: [], sellerTypes: [] }
  };
}

export async function fetchProductById(
  productId: string,
): Promise<ProductDetail | undefined> {
  const res = await safeFetch<any>(
    `${API_BASE_URL}/api/products/${encodeURIComponent(productId)}`,
    { cache: "no-store", timeoutMs: 8000 }
  );

  if (res.status === 404) return undefined;
  if (!res.ok) {
    if (res.error) throw res.error;
    throw new ApiError(`Product fetch failed with status: ${res.status}`, { status: res.status });
  }

  const data = res.data;
  if (data?.id || data?.slug || data?.productId) return mapApiProductToDetail(data);
  return undefined;
}

export interface StoreSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  seller_type?: string;
  city?: string;
  address?: string;
  rating_average?: number;
  rating_count?: number;
  is_verified?: boolean;
  productCount?: number;
  topProducts?: { title: string; pricePkr: number; imageUrl: string }[];
}

export async function fetchStores(): Promise<StoreSummary[]> {
  const res = await safeFetch<StoreSummary[]>(
    `${API_BASE_URL}/api/stores`,
    { cache: "no-store", timeoutMs: 6000 }
  );
  if (res.ok && Array.isArray(res.data)) return res.data;
  return [];
}

export async function fetchStoreBySlug(
  slug: string,
): Promise<StoreDetail | undefined> {
  const res = await safeFetch<any>(
    `${API_BASE_URL}/api/stores/${encodeURIComponent(slug)}`,
    { cache: "no-store", timeoutMs: 6000 }
  );

  if (res.status === 404 || !res.ok) return undefined;
  const data = res.data;
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
}

export async function fetchCheckoutQuote(
  input: CheckoutQuoteRequest,
): Promise<CheckoutQuoteResponse> {
  const res = await safeFetch<CheckoutQuoteResponse>(`${API_BASE_URL}/api/checkout/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: 10000,
  });
  if (!res.ok || !res.data) {
    throw res.error || new Error("Failed to generate checkout quote");
  }
  return res.data;
}

export async function createOrderApi(orderInput: any): Promise<any> {
  const res = await safeFetch<any>(`${API_BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderInput),
    timeoutMs: 12000,
  });
  if (!res.ok || !res.data) {
    throw res.error || new Error("Failed to place order");
  }
  return res.data;
}

export async function fetchOrderById(orderId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      let errMsg = "Order not found";
      try { const err = await res.json(); if (err?.error) errMsg = err.error; } catch {}
      throw new ApiError(errMsg, { status: res.status });
    }
    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || "Network error fetching order", { isNetwork: true });
  }
}

export async function fetchUserOrders(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/orders`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    logger.error("Failed to fetch user orders", "API", err);
    return [];
  }
}

export interface UserAddress {
  id: string;
  full_name: string;
  phone: string;
  street_address: string;
  city: string;
  province: string;
  postal_code?: string;
  is_default: boolean;
  created_at: string;
}

export async function fetchUserAddresses(): Promise<UserAddress[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/addresses`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createUserAddress(addr: {
  full_name: string;
  phone: string;
  street_address: string;
  city: string;
  province: string;
  postal_code?: string;
  is_default?: boolean;
}): Promise<UserAddress> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/addresses`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addr),
    });
    if (!res.ok) {
      let errMsg = "Failed to add address";
      try { const err = await res.json(); if (err?.error) errMsg = err.error; } catch {}
      throw new Error(errMsg);
    }
    return res.json();
  } catch (err: any) {
    if (err.message === "Failed to add address") throw err;
    throw new ApiError(err.message || "Network error adding address", { isNetwork: true });
  }
}

export async function deleteUserAddress(id: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/addresses/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      let errMsg = "Failed to delete address";
      try { const err = await res.json(); if (err?.error) errMsg = err.error; } catch {}
      throw new Error(errMsg);
    }
  } catch (err: any) {
    if (err.message === "Failed to delete address") throw err;
    throw new ApiError(err.message || "Network error deleting address", { isNetwork: true });
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
  try {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/return`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(returnInput),
    });
    if (!res.ok) {
      let errMsg = "Failed to submit return request";
      try { const err = await res.json(); if (err?.error) errMsg = err.error; } catch {}
      throw new Error(errMsg);
    }
    return await res.json();
  } catch (err: any) {
    if (err.message === "Failed to submit return request") throw err;
    throw new ApiError(err.message || "Network error submitting return", { isNetwork: true });
  }
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
  try {
    const res = await fetch(`${API_BASE_URL}/api/payments/xpay/initiate`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentInput),
    });
    if (!res.ok) {
      let errMsg = "Failed to initiate payment gateway session";
      try { const err = await res.json(); if (err?.error) errMsg = err.error; } catch {}
      throw new Error(errMsg);
    }
    return await res.json();
  } catch (err: any) {
    if (err.message === "Failed to initiate payment gateway session") throw err;
    throw new ApiError(err.message || "Network error initiating payment", { isNetwork: true });
  }
}

// ── Wishlist API ───────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
  products: any;
}

export async function fetchUserWishlist(): Promise<WishlistItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/wishlist`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function addToWishlist(productId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/wishlist`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId }),
    });
    if (!res.ok) {
      let errMsg = "Failed to add to wishlist";
      try { const err = await res.json(); if (err?.error) errMsg = err.error; } catch {}
      throw new Error(errMsg);
    }
    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || "Network error adding to wishlist", { isNetwork: true });
  }
}

export async function removeFromWishlist(productId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/wishlist/${encodeURIComponent(productId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      let errMsg = "Failed to remove from wishlist";
      try { const err = await res.json(); if (err?.error) errMsg = err.error; } catch {}
      throw new Error(errMsg);
    }
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || "Network error removing from wishlist", { isNetwork: true });
  }
}

