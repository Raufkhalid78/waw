import { OrderStatus, PaymentMethod, PaymentStatus, PayoutStatus, SellerType, StoreStatus } from '@waw/types';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://waw-production-8aca.up.railway.app').replace(/\/+$/, '');

export interface PlatformStats {
  gmvPkr: number;
  totalOrders: number;
  totalSellers: number;
  totalProducts: number;
  totalCommissionsPkr: number;
  codFeesCollectedPkr: number;
  netPlatformRevenuePkr: number;
}

export interface AdminSeller {
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
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
  owner?: {
    full_name?: string;
    phone?: string;
    email?: string;
  };
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  subtotalPkr: number;
  shippingFeePkr: number;
  codFeePkr: number;
  totalPkr: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  courier?: string;
  trackingNumber?: string;
  createdAt: string;
  items?: {
    id: string;
    productTitle: string;
    productImage?: string;
    quantity: number;
    unitPricePkr: number;
    totalPricePkr: number;
    wawCommissionPkr: number;
    sellerPayoutPkr: number;
    storeId?: string | null;
  }[];
}

export interface AdminProduct {
  id: string;
  title: string;
  titleUrdu?: string;
  slug: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  isFirstParty: boolean;
  basePricePkr: number;
  compareAtPricePkr?: number;
  images: string[];
  stockQuantity: number;
  soldCount: number;
  ratingAverage: number;
  sellerType: SellerType;
  storeName?: string;
  createdAt: string;
}

export interface AdminPayout {
  id: string;
  storeId: string;
  storeName: string;
  city: string;
  bankName?: string;
  accountTitle?: string;
  iban?: string;
  amountPkr: number;
  status: PayoutStatus;
  bankReference?: string;
  scheduledFor: string;
  settledAt?: string;
  createdAt: string;
}

// ── API CLIENT FUNCTIONS ─────────────────────────────────────────────────────

function getAdminHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('waw_admin_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/stats`, {
      headers: getAdminHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function fetchSellers(status?: StoreStatus): Promise<AdminSeller[]> {
  try {
    const url = status ? `${API_BASE}/api/admin/sellers?status=${status}` : `${API_BASE}/api/admin/sellers`;
    const res = await fetch(url, {
      headers: getAdminHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch sellers');
    return await res.json();
  } catch (err) { throw err; }
}

export async function updateSellerStatus(
  storeId: string,
  status: StoreStatus,
  commissionRatePercentage?: number
): Promise<AdminSeller> {
  const res = await fetch(`${API_BASE}/api/admin/sellers/${storeId}`, {
    method: 'PATCH',
    headers: getAdminHeaders(),
    body: JSON.stringify({ status, commissionRatePercentage }),
  });
  if (!res.ok) throw new Error('Failed to update seller status');
  return await res.json();
}

export async function fetchOrders(status?: OrderStatus): Promise<AdminOrder[]> {
  try {
    const url = status ? `${API_BASE}/api/orders?status=${status}` : `${API_BASE}/api/orders`;
    const res = await fetch(url, {
      headers: getAdminHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return await res.json();
  } catch (err) { throw err; }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  courier = 'PostEx',
  trackingNumber?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: getAdminHeaders(),
    body: JSON.stringify({ status, courier, trackingNumber }),
  });
  if (!res.ok) throw new Error('Failed to update order status');
  return await res.json();
}

export async function fetchProducts(query?: { categoryId?: string; storeId?: string }): Promise<AdminProduct[]> {
  

  try {
    const params = new URLSearchParams();
    if (query?.categoryId) params.append('categoryId', query.categoryId);
    if (query?.storeId) params.append('storeId', query.storeId);
    const res = await fetch(`${API_BASE}/api/products?${params.toString()}`, {
      headers: getAdminHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch products');
    const data = await res.json();
    const rawItems = Array.isArray(data) ? data : (data?.items || []);
    if (!rawItems || rawItems.length === 0) return [];
    return rawItems.map((p: any) => ({
      id: p.id,
      title: p.title || 'Untitled Product',
      titleUrdu: p.title_urdu || p.titleUrdu,
      slug: p.slug,
      categoryId: p.category_id || p.categoryId || 'general',
      categoryName: p.category?.name || p.categoryName || 'General',
      isFirstParty: p.is_first_party ?? p.isFirstParty ?? true,
      basePricePkr: p.price_pkr || p.basePricePkr || 0,
      compareAtPricePkr: p.compare_at_price_pkr || p.compareAtPricePkr,
      images: p.images || [],
      stockQuantity: p.stock_quantity ?? p.stockQuantity ?? 0,
      soldCount: p.sold_count ?? p.soldCount ?? 0,
      ratingAverage: p.rating_average ?? p.ratingAverage ?? 5,
      sellerType: p.is_first_party ? SellerType.FIRST_PARTY : SellerType.THIRD_PARTY,
      storeName: p.store?.name || p.storeName || 'Waw Official Retail',
      createdAt: p.created_at || p.createdAt || new Date().toISOString(),
    }));
  } catch (err) {
    throw err;
  }
}

export async function createProduct(payload: {
  title: string;
  titleUrdu?: string;
  categoryId: string;
  basePricePkr: number;
  compareAtPricePkr?: number;
  stockQuantity: number;
  sku: string;
  imageUrl: string;
  sellerType: SellerType;
  storeId?: string | null;
  description: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/products`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create product in Supabase');
  return await res.json();
}

export async function fetchPayouts(): Promise<AdminPayout[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/payouts`, {
      headers: getAdminHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch payouts');
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function settlePayout(payoutId: string, bankReference: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/admin/payouts/${payoutId}/settle`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify({ bankReference }),
  });
  if (!res.ok) throw new Error('Failed to settle payout');
  return await res.json();
}
