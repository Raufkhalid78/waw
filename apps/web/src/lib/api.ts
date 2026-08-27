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

function mapApiProductToDetail(p: any): ProductDetail {
  const basePrice = p.base_price_pkr || p.price_pkr || p.pricePkr;
  const comparePrice = p.compare_at_price_pkr || p.comparePricePkr || basePrice;
  const discountPercent =
    comparePrice > basePrice
      ? Math.round(((comparePrice - basePrice) / comparePrice) * 100)
      : 0;

  return {
    productId: p.id || p.productId,
    title: p.title,
    category: p.category?.name || p.categoryName || p.category || "Unknown",
    pricePkr: basePrice,
    originalPricePkr: comparePrice,
    discountPercent,
    rating: p.rating_average || p.ratingAverage || p.rating || 0,
    reviewsCount: p.rating_count || p.ratingCount || p.reviewsCount || 0,
    soldCount: p.sold_count || p.soldCount || 0,
    isExpress: p.is_first_party ?? p.isFirstParty ?? false,
    sellerType: p.is_first_party
      ? SellerType.FIRST_PARTY
      : SellerType.THIRD_PARTY,
    storeName: p.store?.name || p.storeName || "Unknown Store",
    storeSlug: p.store?.slug || p.storeSlug || "unknown-store",
    sellerCity: p.store?.city || p.sellerCity || "Unknown",
    images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [],
    description: p.description || "",
    highlights: p.attributes?.highlights || [],
    specifications: p.attributes?.specifications || {},
    inStock: (p.stock_quantity ?? p.stockQuantity ?? 0) > 0,
    stockCount: p.stock_quantity ?? p.stockQuantity ?? 0,
    sku: p.sku || "",
    reviews: [],
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
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn(`Failed to fetch category ${slug}:`, error);
    return null;
  }
}

export async function fetchProducts(params?: {
  q?: string;
  category?: string;
  categorySlug?: string;
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
      // Query Typesense Search Route
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
      facets: data.facets || { minPrice: 0, maxPrice: 15000, cities: [], sellerTypes: [] }
    };
  } catch (error) {
    return { items: [] };
  }
}

export async function fetchProductById(
  productId: string,
): Promise<ProductDetail | undefined> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.id) return mapApiProductToDetail(data);
    }
    return undefined;
  } catch (error) {
    return undefined;
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
    return await res.json();
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

