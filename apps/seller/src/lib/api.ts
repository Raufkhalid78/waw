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

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined")
    return { "Content-Type": "application/json" };
  const token =
    localStorage.getItem("waw_seller_token") ||
    localStorage.getItem("waw_auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = "Bearer " + token;
  return headers;
}

export async function fetchSellerStore(): Promise<SellerStore | null> {
  try {
    const res = await fetch(API_BASE + "/api/seller/store", {
      headers: getAuthHeader(),
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
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
    const res = await fetch(API_BASE + "/api/seller/orders", {
      headers: getAuthHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
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
  const res = await fetch(
    API_BASE + "/api/seller/orders/" + storeOrderId + "/status",
    {
      method: "PATCH",
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to update order status");
  }
  return true;
}

export async function fetchSellerProducts(): Promise<SellerProduct[]> {
  try {
    const res = await fetch(API_BASE + "/api/seller/products", {
      headers: getAuthHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
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
  const res = await fetch(API_BASE + "/api/products", {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({
      ...productData,
      sellerType: SellerType.THIRD_PARTY,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create product listing");
  }
  return await res.json();
}

export async function fetchSellerPayouts(): Promise<SellerPayout[]> {
  try {
    const res = await fetch(API_BASE + "/api/seller/payouts", {
      headers: getAuthHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data?.payouts || [];
  } catch (err) {
    console.error("Failed to fetch seller payouts:", err);
    return [];
  }
}

export async function fetchSellerCoupons(): Promise<SellerCoupon[]> {
  try {
    const res = await fetch(API_BASE + "/api/seller/coupons", {
      headers: getAuthHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
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
  const res = await fetch(API_BASE + "/api/seller/coupons", {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify(couponData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create promotional coupon");
  }
  return await res.json();
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
    const res = await fetch(API_BASE + "/api/seller/analytics", {
      headers: getAuthHeader(),
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        totalRevenuePkr: 0,
        pendingPayoutsPkr: 0,
        totalOrders: 0,
        activeProducts: 0,
        storeStatus: StoreStatus.PENDING_KYC,
      };
    }
    return await res.json();
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
  data: { title?: string; description?: string; base_price_pkr?: number; is_active?: boolean }
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/products/${productId}`, {
    method: "PATCH",
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update product" }));
    throw new Error(err.error || "Failed to update product");
  }
  return await res.json();
}

export async function deleteSellerProduct(productId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/products/${productId}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to delete product" }));
    throw new Error(err.error || "Failed to delete product");
  }
}

export async function updateStoreProfile(data: {
  name?: string;
  description?: string;
  logoUrl?: string;
  city?: string;
  address?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/seller/store`, {
    method: "PATCH",
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update store" }));
    throw new Error(err.error || "Failed to update store");
  }
  return await res.json();
}

export async function submitKyc(data: {
  cnic_number: string;
  business_registration?: string;
  bank_account_number: string;
  bank_name: string;
  bank_branch?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/seller/kyc`, {
    method: "POST",
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to submit KYC" }));
    throw new Error(err.error || "Failed to submit KYC");
  }
  return await res.json();
}

export async function fetchKycStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/seller/kyc/status`, {
    headers: getAuthHeader(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return await res.json();
}
