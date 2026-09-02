const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("admin_token") || "";
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

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
    adminFetch<{ success: boolean }>(`/api/admin/kyc/${id}/approve`, {
      method: "PATCH",
    }),
  reject: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/kyc/${id}/reject`, {
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
