import { API_BASE_URL } from "@waw/config";

const API_BASE = API_BASE_URL;

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

// - Type Definitions -

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
  free_delivery_threshold_pkr?: number;
  default_shipping_fee_pkr?: number;
  cod_handling_fee_pkr?: number;
  gst_rate_percentage?: number;
  whatsapp_number?: string;
  support_email?: string;
  discount_tier_1_threshold?: number;
  discount_tier_2_threshold?: number;
  discount_tier_3_threshold?: number;
  best_seller_days?: number;
  best_seller_limit?: number;
  new_arrival_days?: number;
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
  refund_amount_pkr?: number;
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

// - API Modules -

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
  // Cancellation must go through the atomic cancel_order RPC — it releases
  // inventory reservations, cancels payouts and reverses payments. A raw
  // status flip leaves phantom stock and payouts behind.
  cancel: (id: string, reason?: string) =>
    adminFetch<any>(`/api/orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "Cancelled by admin" }),
    }),
  // Full financial reversal (inventory + payouts + gateway refund).
  reverse: (id: string, reason?: string) =>
    adminFetch<any>(`/api/admin/orders/${id}/reverse`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "Admin reversal", reversalType: "REFUND" }),
    }),
};

// Users
export const usersApi = {
  list: (params?: { page?: number; limit?: number; role?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.role) query.set("role", params.role);
    if (params?.search) query.set("search", params.search);
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

// Stores — the API returns { sellers, pagination } from /api/admin/sellers
// (listSellers in admin.service.ts). The old client read data.stores which
// was always undefined, so the page permanently showed "No stores found".
export const storesApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    return adminFetch<{ sellers: AdminStore[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/api/admin/sellers?${query}`
    );
  },
  // Store approve/reject is the sellers endpoint with a status PATCH —
  // /api/admin/stores/:id/approve|reject never existed in the API.
  approve: (id: string) =>
    adminFetch<any>(`/api/admin/sellers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "ACTIVE" }),
    }),
  reject: (id: string) =>
    adminFetch<any>(`/api/admin/sellers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "REJECTED" }),
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

// Disputes — the API returns a raw array (listDisputes in admin.service.ts).
export const disputesApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    // Server returns AdminDispute[]; page/limit are sliced client-side.
    void params?.page;
    void params?.limit;
    return adminFetch<AdminDispute[]>(`/api/admin/disputes?${query}`);
  },
  // The API expects the DisputeResolution ENUM from support.service.ts:
  // REFUND_BUYER | RELEASE_SELLER_PAYOUT | REPLACEMENT_ISSUED | DISMISSED.
  // Any other value silently closes the ticket with NO financial action.
  resolve: (id: string, resolution: "REFUND_BUYER" | "RELEASE_SELLER_PAYOUT" | "REPLACEMENT_ISSUED" | "DISMISSED", refundAmountPkr?: number, staffNotes?: string) =>
    adminFetch<any>(`/api/admin/disputes/${id}/resolve`, {
      method: "PATCH",
      body: JSON.stringify({ resolution, refundAmountPkr, staffNotes }),
    }),
};

// Returns — the API returns a raw array (listReturns in admin.service.ts).
export const returnsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    void params?.page;
    void params?.limit;
    return adminFetch<AdminReturn[]>(`/api/admin/returns?${query}`);
  },
  receive: (id: string) =>
    adminFetch<any>(`/api/admin/returns/${id}/receive`, {
      method: "PATCH",
    }),
  refund: (id: string) =>
    adminFetch<any>(`/api/admin/returns/${id}/refund`, {
      method: "PATCH",
    }),
  reject: (id: string) =>
    adminFetch<any>(`/api/admin/returns/${id}/reject`, {
      method: "PATCH",
    }),
};

// Reviews — the API returns a raw array (listPendingReviews).
export const reviewsApi = {
  list: (params?: { page?: number; limit?: number }) => {
    void params;
    return adminFetch<AdminReview[]>(`/api/admin/reviews/pending`);
  },
  approve: (id: string) =>
    adminFetch<any>(`/api/admin/reviews/${id}/approve`, {
      method: "PATCH",
    }),
  reject: (id: string) =>
    adminFetch<any>(`/api/admin/reviews/${id}/reject`, {
      method: "PATCH",
    }),
};

// Payouts — the API returns { payouts, pagination } (listPayouts).
export const payoutsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    return adminFetch<{ payouts: AdminPayout[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/api/admin/payouts?${query}`
    );
  },
  // The API registers POST /api/admin/payouts/:id/settle (not PATCH).
  settle: (id: string, bankReference: string) =>
    adminFetch<any>(`/api/admin/payouts/${id}/settle`, {
      method: "POST",
      body: JSON.stringify({ bankReference }),
    }),
};

// KYC — the API returns a raw array of store rows (listPendingKyc).
export const kycApi = {
  listPending: () =>
    adminFetch<AdminKyc[]>("/api/admin/kyc/pending"),
  approve: (storeId: string) =>
    adminFetch<any>(`/api/admin/kyc/${storeId}/approve`, {
      method: "PATCH",
    }),
  reject: (storeId: string) =>
    adminFetch<any>(`/api/admin/kyc/${storeId}/reject`, {
      method: "PATCH",
    }),
};

// Sellers
export const sellersApi = {
  update: (
    id: string,
    data: { status?: string; commission_rate_percentage?: number | null }
  ) =>
    adminFetch<{ success: boolean }>(`/api/admin/sellers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// Subscriptions
export interface AdminStoreSubscription {
  id: string;
  name: string;
  slug: string;
  city?: string;
  status: string;
  subscription_plan?: string;
  subscription_active?: boolean;
  subscription_expires_at?: string;
  owner?: { full_name?: string; phone?: string } | null;
  subscription?: {
    status?: string;
    expires_at?: string;
    payment_reference?: string;
    plan?: { display_name?: string; price_pkr?: number } | null;
  } | null;
}

export const subscriptionsApi = {
  list: () =>
    adminFetch<{ stores: AdminStoreSubscription[] }>("/api/admin/subscriptions"),
  activate: (storeId: string, months: number) =>
    adminFetch<{ success: boolean; planName: string; expiresAt: string }>(
      `/api/admin/subscriptions/${storeId}/activate`,
      { method: "POST", body: JSON.stringify({ months }) }
    ),
  revoke: (storeId: string) =>
    adminFetch<{ success: boolean }>(
      `/api/admin/subscriptions/${storeId}/revoke`,
      { method: "POST" }
    ),
};

// Flash Sales — field names match the API/DB contract (flash_sales table:
// title, start_time, end_time; item counts via items relation).
export interface AdminFlashSale {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  items?: AdminFlashSaleItem[];
  item_count?: number;
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
  create: (data: { title: string; start_time: string; end_time: string; title_urdu?: string; banner_url?: string }) =>
    adminFetch<AdminFlashSale>("/api/admin/flash-sales", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Pick<AdminFlashSale, "title" | "start_time" | "end_time" | "is_active">> & { title_urdu?: string; banner_url?: string }) =>
    adminFetch<{ success: boolean }>(`/api/admin/flash-sales/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/flash-sales/${id}`, {
      method: "DELETE",
    }),
  addItem: (saleId: string, data: { variantId: string; salePricePkr: number; stockQuantity: number }) =>
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
  commission_percentage?: number | null;
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
    // CSRF: the API enforces the double-submit token on every POST — raw
    // fetch must include it just like adminFetch does.
    const headers: Record<string, string> = {};
    const csrf = getCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
    const res = await fetch(`${API_BASE}/api/uploads/${bucket}`, {
      method: "POST",
      credentials: "include",
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },
};

// Audit Logs — GET /api/admin/audit-logs (ADMIN/SUPER_ADMIN/OPS_AGENT).
export interface AdminAuditLog {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  target_resource_type: string;
  target_resource_id: string | null;
  previous_state: unknown;
  new_state: unknown;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
}

export const auditLogsApi = {
  list: (params?: {
    limit?: number;
    offset?: number;
    action?: string;
    resourceType?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    if (params?.action) query.set("action", params.action);
    if (params?.resourceType) query.set("resourceType", params.resourceType);
    return adminFetch<{ logs: AdminAuditLog[]; total: number }>(
      `/api/admin/audit-logs?${query}`
    );
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
