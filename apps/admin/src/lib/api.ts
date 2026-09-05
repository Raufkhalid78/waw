const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )waw_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method?.toUpperCase();
  const isStateChanging = method !== undefined && !["GET", "HEAD", "OPTIONS"].includes(method);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (isStateChanging) {
    const csrf = getCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  // If 401, try refreshing the session once
  if (res.status === 401) {
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/session/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (refreshRes.ok) {
        // Retry the original request
        res = await fetch(`${API_BASE}${path}`, {
          ...options,
          credentials: "include",
          headers,
        });
      }
    } catch {
      // Refresh failed, redirect to login
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

// ── Type Definitions ───────────────────────────────────────────────────

export interface AdminProduct {
  id: string;
  title: string;
  slug: string;
  price_pkr: number;
  status: string;
  is_active: boolean;
  store_id: string;
  store_name?: string;
  images?: string[];
  created_at: string;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  buyer_id: string;
  buyer_name: string;
  buyer_phone: string;
  shipping_address: string;
  shipping_city: string;
  total_amount_pkr: number;
  payment_method: string;
  payment_status: string;
  global_status: string;
  item_count?: number;
  created_at: string;
}

export interface AdminUser {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  role: string;
  is_banned?: boolean;
  created_at: string;
}

export interface AdminStore {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  owner_name?: string;
  status: string;
  city?: string;
  commission_rate_percentage?: number;
  created_at: string;
}

export interface AdminStats {
  gmvPkr: number;
  totalOrders: number;
  totalSellers: number;
  totalProducts: number;
  totalCommissionsPkr: number;
  codFeesCollectedPkr: number;
  netPlatformRevenuePkr: number;
}

export interface MarketplaceSettings {
  marketplace_name?: string;
  default_currency?: string;
  default_commission_pct?: number;
  free_delivery_threshold?: number;
  default_shipping_fee?: number;
  cod_fee?: number;
  whatsapp_number?: string;
  support_email?: string;
}

export interface AdminDispute {
  id: string;
  order_id: string;
  buyer_id: string;
  buyer_name?: string;
  seller_id: string;
  seller_name?: string;
  reason: string;
  description?: string;
  status: string;
  resolution?: string;
  created_at: string;
}

export interface AdminReturn {
  id: string;
  order_id: string;
  buyer_id: string;
  buyer_name?: string;
  seller_id: string;
  seller_name?: string;
  reason: string;
  status: string;
  refund_amount_pkr?: number;
  pickup_address?: string;
  created_at: string;
}

export interface AdminReview {
  id: string;
  product_id: string;
  product_title?: string;
  user_id: string;
  user_name?: string;
  rating: number;
  comment?: string;
  is_verified_purchase: boolean;
  status: string;
  created_at: string;
}

export interface AdminPayout {
  id: string;
  seller_id: string;
  seller_name?: string;
  store_name?: string;
  amount_pkr: number;
  status: string;
  bank_account?: string;
  created_at: string;
  settled_at?: string;
}

export interface AdminKyc {
  id: string;
  store_id: string;
  store_name?: string;
  owner_name?: string;
  cnic_number?: string;
  business_registration?: string;
  bank_account_number?: string;
  bank_name?: string;
  status: string;
  submitted_at: string;
}

// ── API Modules ────────────────────────────────────────────────────────

// Products
export const productsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    return adminFetch<{ products: AdminProduct[]; total: number }>(
      `/api/admin/products?${query}`
    );
  },
  approve: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/products/${id}/approve`, {
      method: "PATCH",
    }),
  reject: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/products/${id}/reject`, {
      method: "PATCH",
    }),
};

// Orders
export const ordersApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    return adminFetch<{ orders: AdminOrder[]; total: number }>(
      `/api/admin/orders?${query}`
    );
  },
  updateStatus: (id: string, status: string) =>
    adminFetch<{ success: boolean }>(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

// Users
export const usersApi = {
  list: (params?: { page?: number; limit?: number; role?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.role) query.set("role", params.role);
    return adminFetch<{ users: AdminUser[]; total: number }>(
      `/api/admin/users?${query}`
    );
  },
  ban: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/users/${id}/ban`, {
      method: "POST",
    }),
  unban: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/users/${id}/unban`, {
      method: "POST",
    }),
};

// Stores
export const storesApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    return adminFetch<{ stores: AdminStore[]; total: number }>(
      `/api/admin/sellers?${query}`
    );
  },
  approve: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/stores/${id}/approve`, {
      method: "PATCH",
    }),
  reject: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/stores/${id}/reject`, {
      method: "PATCH",
    }),
};

// Settings
export const settingsApi = {
  get: () =>
    adminFetch<{ settings: MarketplaceSettings; metadata: any[] }>(
      "/api/admin/settings"
    ),
  update: (settings: Partial<MarketplaceSettings>) =>
    adminFetch<{ success: boolean }>("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(settings),
    }),
};

// Stats
export const statsApi = {
  get: () => adminFetch<AdminStats>("/api/admin/stats"),
};

// Disputes
export const disputesApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    return adminFetch<{ disputes: AdminDispute[]; total: number }>(
      `/api/admin/disputes?${query}`
    );
  },
  resolve: (id: string, resolution: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/disputes/${id}/resolve`, {
      method: "PATCH",
      body: JSON.stringify({ resolution }),
    }),
};

// Returns
export const returnsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    return adminFetch<{ returns: AdminReturn[]; total: number }>(
      `/api/admin/returns?${query}`
    );
  },
  receive: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/returns/${id}/receive`, {
      method: "PATCH",
    }),
  refund: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/returns/${id}/refund`, {
      method: "PATCH",
    }),
  reject: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/returns/${id}/reject`, {
      method: "PATCH",
    }),
};

// Reviews
export const reviewsApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    return adminFetch<{ reviews: AdminReview[]; total: number }>(
      `/api/admin/reviews/pending?${query}`
    );
  },
  approve: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/reviews/${id}/approve`, {
      method: "PATCH",
    }),
  reject: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/reviews/${id}/reject`, {
      method: "PATCH",
    }),
};

// Payouts
export const payoutsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    return adminFetch<{ payouts: AdminPayout[]; total: number }>(
      `/api/admin/payouts?${query}`
    );
  },
  settle: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/payouts/${id}/settle`, {
      method: "PATCH",
    }),
};

// KYC
export const kycApi = {
  listPending: () =>
    adminFetch<{ submissions: AdminKyc[] }>("/api/admin/kyc/pending"),
  approve: (storeId: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/kyc/${storeId}/approve`, {
      method: "PATCH",
    }),
  reject: (storeId: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/kyc/${storeId}/reject`, {
      method: "PATCH",
    }),
};

// Sellers
export const sellersApi = {
  update: (id: string, data: { status?: string; commission_rate_percentage?: number }) =>
    adminFetch<{ success: boolean }>(`/api/admin/sellers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// Flash Sales
export interface AdminFlashSale {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  discount_percent?: number;
  item_count?: number;
  created_at: string;
}

export interface AdminFlashSaleItem {
  id: string;
  flash_sale_id: string;
  variant_id: string;
  product_title?: string;
  promotional_price_pkr: number;
  allocated_stock: number;
  sold_count: number;
}

export const flashSalesApi = {
  list: () => adminFetch<AdminFlashSale[]>("/api/admin/flash-sales"),
  create: (data: { name: string; starts_at: string; ends_at: string; discount_percent?: number }) =>
    adminFetch<AdminFlashSale>("/api/admin/flash-sales", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<AdminFlashSale>) =>
    adminFetch<{ success: boolean }>(`/api/admin/flash-sales/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/flash-sales/${id}`, {
      method: "DELETE",
    }),
  addItem: (saleId: string, data: { variant_id: string; promotional_price_pkr: number; allocated_stock: number }) =>
    adminFetch<{ success: boolean }>(`/api/admin/flash-sales/${saleId}/items`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeItem: (itemId: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/flash-sales/items/${itemId}`, {
      method: "DELETE",
    }),
};

// Banners
export interface AdminBanner {
  id: string;
  title: string;
  title_urdu?: string;
  subtitle?: string;
  tag?: string;
  image_url: string;
  link_url?: string;
  link_text?: string;
  position?: string;
  campaign_type?: string;
  sort_order?: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export const bannersApi = {
  list: () => adminFetch<AdminBanner[]>("/api/admin/banners"),
  create: (data: Partial<AdminBanner>) =>
    adminFetch<AdminBanner>("/api/admin/banners", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<AdminBanner>) =>
    adminFetch<{ success: boolean }>(`/api/admin/banners/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/banners/${id}`, {
      method: "DELETE",
    }),
};

// Categories
export interface AdminCategory {
  id: string;
  name: string;
  name_urdu?: string;
  slug: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
  is_active: boolean;
  sort_order?: number;
  created_at: string;
}

export const categoriesApi = {
  list: () => adminFetch<AdminCategory[]>("/api/admin/categories"),
  create: (data: Partial<AdminCategory>) =>
    adminFetch<AdminCategory>("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<AdminCategory>) =>
    adminFetch<{ success: boolean }>(`/api/admin/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/categories/${id}`, {
      method: "DELETE",
    }),
};

// File Upload
export const uploadApi = {
  upload: async (file: File, bucket: string): Promise<{ url: string; path: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/api/uploads/${bucket}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },
};

// MFA
export const mfaApi = {
  getStatus: () => adminFetch<{ enrolled: boolean; enabled: boolean }>("/api/admin/mfa/status"),
  enroll: () => adminFetch<{ secret: string; otpauthUrl: string }>("/api/admin/mfa/enroll", { method: "POST" }),
  verify: (code: string) =>
    adminFetch<{ success: boolean }>("/api/admin/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  disable: (code: string) =>
    adminFetch<{ success: boolean }>("/api/admin/mfa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
};
