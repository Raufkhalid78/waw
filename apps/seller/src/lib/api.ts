import { API_BASE_URL } from "@waw/config";
import { reportApiError } from "./api-errors";

import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  SellerType,
  StoreStatus,
} from "@waw/types";

const API_BASE = (
  API_BASE_URL
).replace(/\/+$/, "");

export interface SellerStore {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  sellerType: SellerType;
  status: StoreStatus;
  commissionRatePercentage: number;
  cnicNumber?: string;
  bankAccountTitle?: string;
  bankAccountNumber?: string;
  bankName?: string;
  city: string;
  address: string;
  isVerified: boolean;
  ratingAverage: number;
  ratingCount: number;
}

export interface SellerOrderItem {
  id: string;
  productId: string;
  productTitle: string;
  variantId?: string;
  variantSku?: string;
  quantity: number;
  unitPricePkr: number;
  totalPricePkr: number;
}

export interface SellerOrder {
  id: string;
  parentOrderId: string;
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  subtotalPkr: number;
  shippingFeePkr: number;
  commissionPkr: number;
  sellerPayoutPkr: number;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  trackingNumber?: string;
  courierProvider?: string;
  createdAt: string;
  items: SellerOrderItem[];
}

export interface SellerProduct {
  id: string;
  title: string;
  titleUrdu?: string;
  slug: string;
  categoryName: string;
  categoryId?: string;
  basePricePkr: number;
  compareAtPricePkr?: number;
  stockQuantity: number;
  isActive: boolean;
  sku: string;
  images?: string[];
  description?: string;
  weightKg?: number;
  createdAt: string;
}

export interface SellerPayout {
  id: string;
  storeOrderId: string;
  orderNumber: string;
  grossAmountPkr: number;
  commissionPkr: number;
  netPayoutPkr: number;
  status: PayoutStatus;
  scheduledFor: string;
  settledAt?: string;
  bankReference?: string;
  createdAt: string;
}

export interface SellerCoupon {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED_PKR" | "FREE_SHIPPING";
  discountValue: number;
  minSpendPkr: number;
  maxDiscountPkr?: number;
  expiresAt: string;
  currentUses: number;
  maxUses?: number;
  isActive: boolean;
  createdAt: string;
}

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )waw_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function getHeaders(isStateChanging = false): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (isStateChanging) {
    const csrf = getCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }
  return headers;
}

export async function sellerFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method?.toUpperCase();
  const isStateChanging = method !== undefined && !["GET", "HEAD", "OPTIONS"].includes(method);
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...getHeaders(isStateChanging),
      ...(options?.headers as Record<string, string>),
    },
  });

  if (res.status === 401) {
    let refreshed = false;
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/session/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) {
        refreshed = true;
        const retryRes = await fetch(`${API_BASE}${path}`, {
          ...options,
          credentials: "include",
          headers: {
            ...getHeaders(isStateChanging),
            ...(options?.headers as Record<string, string>),
          },
        });
        if (!retryRes.ok) {
          const error = await retryRes.json().catch(() => ({ error: "Request failed" }));
          throw new Error(error.error || `HTTP ${retryRes.status}`);
        }
        return retryRes.json();
      }
    } catch (err) {
      // Network error during refresh — fall through to redirect below.
      void err;
    }
    // Refresh failed (401) or errored: the session is dead. Send the seller
    // to login instead of throwing a raw "HTTP 401" that the page surfaces
    // as a generic outage banner.
    if (!refreshed && typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function fetchSellerStore(): Promise<SellerStore | null> {
  try {
    const data = await sellerFetch<any>("/api/seller/store", { cache: "no-store" as any });
    if (!data || data.message || !data.id) return null;

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      logoUrl: data.logo_url,
      sellerType: data.seller_type || SellerType.THIRD_PARTY,
      status: data.status || StoreStatus.PENDING_KYC,
      commissionRatePercentage: Number(data.commission_rate_percentage) || 10,
      cnicNumber: data.cnic_number,
      bankAccountTitle: data.bank_account_title,
      bankAccountNumber: data.bank_account_number,
      bankName: data.bank_name,
      city: data.city || "",
      address: data.address || "",
      isVerified: Boolean(data.is_verified),
      ratingAverage: Number(data.rating_average) || 0,
      ratingCount: Number(data.rating_count) || 0,
    };
  } catch (err) {
    reportApiError("Failed to fetch seller store", err);
    return null;
  }
}

/**
 * Maps a raw snake_case store_orders row (what /api/seller/orders returns)
 * to the camelCase SellerOrder shape the portal UI consumes. Without this,
 * order.sellerPayoutPkr was undefined and .toLocaleString() crashed the
 * orders page + dashboard with real data.
 */
function mapStoreOrder(o: any): SellerOrder {
  // /api/seller/orders embeds the parent order as `orders` (many-to-one →
  // object; PostgREST may deliver it as an array defensively handled here).
  const parent: any = Array.isArray(o.orders) ? o.orders[0] : o.orders;
  return {
    id: o.id,
    parentOrderId: o.order_id || o.parentOrderId,
    orderNumber: o.order_number || o.sub_order_number || o.id.slice(0, 8),
    buyerName: parent?.buyer_name || o.buyer_name || o.buyerName,
    buyerPhone: parent?.buyer_phone || o.buyer_phone || o.buyerPhone,
    shippingAddress: parent?.shipping_address || o.shipping_address || o.shippingAddress,
    shippingCity: parent?.shipping_city || o.shipping_city || o.shippingCity,
    subtotalPkr: Number(o.subtotal_pkr ?? o.subtotalPkr ?? 0),
    shippingFeePkr: Number(o.shipping_fee_pkr ?? o.shippingFeePkr ?? 0),
    commissionPkr: Number(o.commission_pkr ?? o.commissionPkr ?? 0),
    sellerPayoutPkr: Number(
      o.seller_payout_pkr ??
      o.sellerPayoutPkr ??
      (Number(o.subtotal_pkr ?? 0) - Number(o.commission_pkr ?? 0)),
    ),
    orderStatus: o.status ?? o.orderStatus,
    paymentMethod: parent?.payment_method ?? o.payment_method ?? o.paymentMethod,
    paymentStatus: parent?.payment_status ?? o.payment_status ?? o.paymentStatus,
    trackingNumber: o.tracking_number ?? o.trackingNumber,
    courierProvider: o.courier_provider ?? o.courierProvider,
    createdAt: o.created_at ?? o.createdAt,
    items: (o.items || o.order_items || []).map((it: any) => ({
      id: it.id,
      productId: it.product_id ?? it.productId,
      productTitle:
        it.product_title ??
        it.productTitle ??
        it.catalog_product?.title ??
        it.catalog_products?.title ??
        it.product?.title ??
        "Item",
      variantId: it.variant_id ?? it.variantId ?? it.offer_variant_id,
      variantSku: it.variant_sku ?? it.variantSku ?? it.sku,
      quantity: Number(it.quantity ?? 1),
      unitPricePkr: Number(it.unit_price_pkr ?? it.unitPricePkr ?? it.price_pkr ?? 0),
      totalPricePkr: Number(
        it.total_price_pkr ??
        it.totalPricePkr ??
        (Number(it.quantity ?? 1) * Number(it.unit_price_pkr ?? it.price_pkr ?? 0)),
      ),
    })),
  };
}

// Throwing variant for polling callers — lets them distinguish "no orders"
// from a transient failure so a silent refresh never wipes a good list.
export async function fetchSellerOrdersRaw(): Promise<SellerOrder[]> {
  const data = await sellerFetch<any>("/api/seller/orders", { cache: "no-store" as any });
  const rows = Array.isArray(data) ? data : data?.orders || [];
  return rows.map(mapStoreOrder);
}

export async function fetchSellerOrders(): Promise<SellerOrder[]> {
  try {
    return await fetchSellerOrdersRaw();
  } catch (err) {
    reportApiError("Failed to fetch seller orders", err);
    return [];
  }
}

export async function updateStoreOrderStatus(
  storeOrderId: string,
  status: OrderStatus,
): Promise<boolean> {
  await sellerFetch(`/api/seller/orders/${storeOrderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return true;
}

// - Category taxonomy (public API — live from the database) -
export interface SellerCategory {
  id: string;
  name: string;
  nameUrdu?: string;
  slug: string;
  children?: SellerCategory[];
}

export async function fetchSellerCategories(): Promise<SellerCategory[]> {
  try {
    return await sellerFetch<SellerCategory[]>("/api/categories");
  } catch (err) {
    reportApiError("Failed to fetch categories", err);
    return [];
  }
}

export async function fetchSellerProducts(): Promise<SellerProduct[]> {
  try {
    const data = await sellerFetch<any>("/api/seller/products", { cache: "no-store" as any });
    const rawItems = Array.isArray(data) ? data : data?.items || [];
    return rawItems.map((p: any) => {
      // /api/seller/products returns raw seller_offers rows with NESTED
      // catalog_product + variants + category. The old flat reads produced
      // blank titles, missing images, 0 stock and "General" category.
      const catalog = p.catalog_product || p.catalog_products || {};
      const variants = p.variants || [];
      const firstVariant = variants[0] || {};
      const stock = Number(
        p.stock_quantity ??
        firstVariant.stock_quantity ??
        variants.reduce((s: number, v: any) => s + Number(v.stock_quantity ?? 0), 0) ??
        0,
      );
      return {
        id: p.id,
        title: catalog.title || p.title || "Untitled product",
        titleUrdu: catalog.title_urdu || p.title_urdu,
        slug: catalog.slug || p.slug || p.id,
        categoryName: p.category?.name || catalog.category?.name || p.categoryName || "General",
        categoryId: p.category_id || catalog.category_id || p.categoryId,
        basePricePkr: Number(p.price_pkr ?? p.basePricePkr ?? firstVariant.price_pkr ?? 0),
        compareAtPricePkr:
          p.original_price_pkr ??
          p.compare_at_price_pkr ??
          catalog.original_price_pkr ??
          p.compareAtPricePkr,
        stockQuantity: stock,
        isActive: p.is_active ?? catalog.is_active ?? p.isActive ?? false,
        status: p.status || "PENDING",
        sku: p.sku || "SKU-" + p.id.slice(-6),
        images: catalog.images || p.images || [],
        description: catalog.description || p.description || "",
        weightKg: p.weight_kg || catalog.weight_kg || 1.0,
        createdAt: p.created_at || catalog.created_at || new Date().toISOString(),
      } as SellerProduct & { status: string; description: string };
    });
  } catch (err) {
    reportApiError("Failed to fetch seller products", err);
    return [];
  }
}

export async function createSellerProduct(productData: {
  title: string;
  titleUrdu?: string;
  categoryId?: string;
  categorySlug?: string;
  basePricePkr: number;
  compareAtPricePkr?: number;
  stockQuantity: number;
  sku: string;
  imageUrl: string;
  description: string;
  weightKg?: number;
}): Promise<any> {
  return sellerFetch("/api/products", {
    method: "POST",
    body: JSON.stringify({
      ...productData,
      sellerType: SellerType.THIRD_PARTY,
    }),
  });
}

/**
 * Maps a raw snake_case payouts row to the camelCase SellerPayout shape.
 * Without this, payouts-page totals crashed ("netPayoutPkr.toLocaleString
 * is not a function") and dates rendered "Invalid Date".
 */
function mapPayout(p: any): SellerPayout {
  const gross = Number(p.amount_pkr ?? p.grossAmountPkr ?? p.gross_amount_pkr ?? 0);
  const commission = Number(p.commission_pkr ?? p.commissionPkr ?? 0);
  return {
    id: p.id,
    storeOrderId: p.store_order_id ?? p.storeOrderId,
    orderNumber: p.order_number ?? p.orderNumber ?? (p.store_order_id || p.id).slice(0, 8),
    grossAmountPkr: gross,
    commissionPkr: commission,
    netPayoutPkr: Number(p.net_payout_pkr ?? p.netPayoutPkr ?? Math.max(0, gross - commission)),
    status: p.status,
    scheduledFor: p.scheduled_for ?? p.scheduledFor ?? p.created_at,
    settledAt: p.settled_at ?? p.processed_at ?? p.settledAt,
    bankReference: p.gateway_reference ?? p.bank_reference ?? p.bankReference,
    createdAt: p.created_at ?? p.createdAt,
  };
}

export async function fetchSellerPayouts(): Promise<SellerPayout[]> {
  try {
    const data = await sellerFetch<any>("/api/seller/payouts", { cache: "no-store" as any });
    const rows = Array.isArray(data) ? data : data?.payouts || [];
    return rows.map(mapPayout);
  } catch (err) {
    reportApiError("Failed to fetch seller payouts", err);
    return [];
  }
}

export async function fetchSellerCoupons(): Promise<SellerCoupon[]> {
  try {
    const data = await sellerFetch<any>("/api/seller/coupons", { cache: "no-store" as any });
    const rows = Array.isArray(data) ? data : data?.coupons || [];
    return rows.map((c: any) => ({
      id: c.id,
      code: c.code,
      discountType: c.discount_type ?? c.discountType ?? "PERCENTAGE",
      discountValue: Number(c.discount_value ?? c.discountValue ?? 0),
      minSpendPkr: Number(c.min_spend_pkr ?? c.minSpendPkr ?? 0),
      maxDiscountPkr: c.max_discount_pkr ?? c.maxDiscountPkr,
      expiresAt: c.expires_at ?? c.expiresAt ?? "",
      currentUses: Number(c.current_uses ?? c.currentUses ?? c.times_used ?? 0),
      maxUses: c.max_uses ?? c.maxUses,
      isActive: c.is_active ?? c.isActive ?? true,
      createdAt: c.created_at ?? c.createdAt,
    }));
  } catch (err) {
    reportApiError("Failed to fetch seller coupons", err);
    return [];
  }
}

export async function createSellerCoupon(couponData: {
  code: string;
  discountType: "PERCENTAGE" | "FIXED_PKR" | "FREE_SHIPPING";
  discountValue: number;
  minSpendPkr: number;
  maxDiscountPkr?: number;
  expiresAt?: string;
  maxUses?: number;
}): Promise<any> {
  return sellerFetch("/api/seller/coupons", {
    method: "POST",
    body: JSON.stringify(couponData),
  });
}

export interface SellerAnalytics {
  totalRevenuePkr: number;
  pendingPayoutsPkr: number;
  totalOrders: number;
  activeProducts: number;
  storeStatus: StoreStatus | string;
  storeName?: string;
}

export async function fetchSellerAnalytics(): Promise<SellerAnalytics> {
  try {
    return await sellerFetch<SellerAnalytics>("/api/seller/analytics", { cache: "no-store" as any });
  } catch (err) {
    reportApiError("Failed to fetch seller analytics", err);
    return {
      totalRevenuePkr: 0,
      pendingPayoutsPkr: 0,
      totalOrders: 0,
      activeProducts: 0,
      storeStatus: StoreStatus.PENDING_KYC,
    };
  }
}

export async function updateSellerProduct(
  productId: string,
  data: {
    title?: string;
    titleUrdu?: string;
    title_urdu?: string;
    description?: string;
    // camelCase is the canonical API contract (UpdateProductSchema). The
    // snake_case aliases are normalized here so older callers keep working.
    basePricePkr?: number;
    base_price_pkr?: number;
    compareAtPricePkr?: number;
    compare_at_price_pkr?: number;
    stockQuantity?: number;
    stock_quantity?: number;
    categoryId?: string;
    category_id?: string;
    imageUrl?: string;
    image_url?: string;
    weightKg?: number;
    weight_kg?: number;
    isActive?: boolean;
    is_active?: boolean;
  }
): Promise<any> {
  // Normalize snake_case → camelCase BEFORE sending: Zod strips unknown keys,
  // so a raw snake_case body silently drops every field but title/description.
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.titleUrdu !== undefined || data.title_urdu !== undefined) {
    payload.titleUrdu = data.titleUrdu ?? data.title_urdu;
  }
  if (data.description !== undefined) payload.description = data.description;
  if (data.basePricePkr !== undefined || data.base_price_pkr !== undefined) {
    payload.basePricePkr = data.basePricePkr ?? data.base_price_pkr;
  }
  if (data.compareAtPricePkr !== undefined || data.compare_at_price_pkr !== undefined) {
    payload.compareAtPricePkr = data.compareAtPricePkr ?? data.compare_at_price_pkr;
  }
  if (data.stockQuantity !== undefined || data.stock_quantity !== undefined) {
    payload.stockQuantity = data.stockQuantity ?? data.stock_quantity;
  }
  if (data.categoryId !== undefined || data.category_id !== undefined) {
    payload.categoryId = data.categoryId ?? data.category_id;
  }
  if (data.imageUrl !== undefined || data.image_url !== undefined) {
    const img = data.imageUrl ?? data.image_url;
    // Empty string fails z.string().url() — send only a real URL.
    if (img) payload.imageUrl = img;
  }
  if (data.weightKg !== undefined || data.weight_kg !== undefined) {
    payload.weightKg = data.weightKg ?? data.weight_kg;
  }
  if (data.isActive !== undefined || data.is_active !== undefined) {
    payload.isActive = data.isActive ?? data.is_active;
  }
  return sellerFetch(`/api/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteSellerProduct(productId: string): Promise<void> {
  await sellerFetch(`/api/products/${productId}`, { method: "DELETE" });
}

export async function uploadFile(file: File, bucket: string): Promise<{ url: string; path: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const csrf = getCsrfToken();
  const res = await fetch(`${API_BASE}/api/uploads/${bucket}`, {
    method: "POST",
    credentials: "include",
    headers: csrf ? { "X-CSRF-Token": csrf } : {},
    body: formData,
  });

  if (res.status === 401) {
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/session/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) {
        const retryRes = await fetch(`${API_BASE}/api/uploads/${bucket}`, {
          method: "POST",
          credentials: "include",
          headers: csrf ? { "X-CSRF-Token": csrf } : {},
          body: formData,
        });
        if (!retryRes.ok) {
          const error = await retryRes.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(error.error || `HTTP ${retryRes.status}`);
        }
        return retryRes.json();
      }
    } catch (e) {
      throw e;
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function updateStoreProfile(data: {
  name?: string;
  description?: string;
  logoUrl?: string;
  city?: string;
  address?: string;
}): Promise<any> {
  return sellerFetch("/api/seller/store", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function submitKyc(data: {
  cnic_number: string;
  account_title?: string;
  business_registration?: string;
  bank_account_number: string;
  bank_iban?: string;
  bank_name: string;
  branch_city?: string;
  ntn_number?: string;
  address?: string;
}): Promise<any> {
  return sellerFetch("/api/seller/kyc", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchKycStatus(): Promise<any> {
  return sellerFetch("/api/seller/kyc/status", { cache: "no-store" as any });
}
