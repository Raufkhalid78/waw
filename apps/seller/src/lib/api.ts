import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  SellerType,
  StoreStatus,
} from "@waw/types";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
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
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/session/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) {
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
    } catch {
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
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
    console.error("Failed to fetch seller store:", err);
    return null;
  }
}

export async function fetchSellerOrders(): Promise<SellerOrder[]> {
  try {
    const data = await sellerFetch<any>("/api/seller/orders", { cache: "no-store" as any });
    return Array.isArray(data) ? data : data?.orders || [];
  } catch (err) {
    console.error("Failed to fetch seller orders:", err);
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

export async function fetchSellerProducts(): Promise<SellerProduct[]> {
  try {
    const data = await sellerFetch<any>("/api/seller/products", { cache: "no-store" as any });
    const rawItems = Array.isArray(data) ? data : data?.items || [];
    return rawItems.map((p: any) => ({
      id: p.id,
      title: p.title,
      titleUrdu: p.title_urdu || p.titleUrdu,
      slug: p.slug,
      categoryName: p.category?.name || p.categoryName || "General",
      categoryId: p.category_id || p.categoryId,
      basePricePkr: p.price_pkr || p.basePricePkr || 0,
      compareAtPricePkr: p.compare_at_price_pkr || p.compareAtPricePkr,
      stockQuantity: p.stock_quantity ?? p.stockQuantity ?? 0,
      isActive: p.is_active ?? p.isActive ?? false,
      status: p.status || "PENDING_REVIEW",
      sku: p.sku || "SKU-" + p.id.slice(-6),
      images: p.images || [],
      weightKg: p.weight_kg || 1.0,
      createdAt: p.created_at || p.createdAt || new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Failed to fetch seller products:", err);
    return [];
  }
}

export async function createSellerProduct(productData: {
  title: string;
  titleUrdu?: string;
  categoryId: string;
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

export async function fetchSellerPayouts(): Promise<SellerPayout[]> {
  try {
    const data = await sellerFetch<any>("/api/seller/payouts", { cache: "no-store" as any });
    return Array.isArray(data) ? data : data?.payouts || [];
  } catch (err) {
    console.error("Failed to fetch seller payouts:", err);
    return [];
  }
}

export async function fetchSellerCoupons(): Promise<SellerCoupon[]> {
  try {
    const data = await sellerFetch<any>("/api/seller/coupons", { cache: "no-store" as any });
    return Array.isArray(data) ? data : data?.coupons || [];
  } catch (err) {
    console.error("Failed to fetch seller coupons:", err);
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
    console.error("Failed to fetch seller analytics:", err);
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
    title_urdu?: string;
    description?: string;
    base_price_pkr?: number;
    compare_at_price_pkr?: number;
    stock_quantity?: number;
    category_id?: string;
    image_url?: string;
    weight_kg?: number;
    is_active?: boolean;
  }
): Promise<any> {
  return sellerFetch(`/api/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
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
  business_registration?: string;
  bank_account_number: string;
  bank_name: string;
  bank_branch?: string;
}): Promise<any> {
  return sellerFetch("/api/seller/kyc", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchKycStatus(): Promise<any> {
  return sellerFetch("/api/seller/kyc/status", { cache: "no-store" as any });
}
