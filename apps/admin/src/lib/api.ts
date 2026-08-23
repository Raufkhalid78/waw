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

export async function fetchPlatformStats(): Promise<PlatformStats> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/stats`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('Using baseline stats fallback:', err);
    return {
      gmvPkr: 5699000,
      totalOrders: 1240,
      totalSellers: 84,
      totalProducts: 420,
      totalCommissionsPkr: 569900,
      codFeesCollectedPkr: 124000,
      netPlatformRevenuePkr: 693900,
    };
  }
}

export async function fetchSellers(status?: StoreStatus): Promise<AdminSeller[]> {
  try {
    const url = status ? `${API_BASE}/api/admin/sellers?status=${status}` : `${API_BASE}/api/admin/sellers`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch sellers');
    return await res.json();
  } catch (err) {
    console.warn('Using demo sellers fallback:', err);
    return [
      {
        id: 'store_1',
        name: 'Karachi Leather Goods',
        slug: 'karachi-leather-goods',
        city: 'Karachi',
        cnicNumber: '42101-9876543-1',
        bankAccountTitle: 'Karachi Leather Enterprise',
        bankAccountNumber: 'PK36MEZN0001234567890123',
        bankName: 'Meezan Bank',
        sellerType: SellerType.THIRD_PARTY,
        status: StoreStatus.PENDING_KYC,
        commissionRatePercentage: 10,
        address: 'Plot 45, Sector 15, Korangi Industrial Area, Karachi',
        ratingAverage: 4.8,
        ratingCount: 142,
        createdAt: '2026-08-19T10:00:00Z',
        owner: { full_name: 'Tariq Mehmood', phone: '+923001234567', email: 'tariq@karachileather.pk' },
      },
      {
        id: 'store_2',
        name: 'Lahore Tech & Audio Hub',
        slug: 'lahore-tech-hub',
        city: 'Lahore',
        cnicNumber: '35202-1234567-3',
        bankAccountTitle: 'Lahore Tech Hub SMC-Pvt',
        bankAccountNumber: 'PK44HABB0009876543210987',
        bankName: 'Habib Bank Limited (HBL)',
        sellerType: SellerType.THIRD_PARTY,
        status: StoreStatus.ACTIVE,
        commissionRatePercentage: 8,
        address: 'Shop 12, Hafeez Center, Main Boulevard Gulberg, Lahore',
        ratingAverage: 4.9,
        ratingCount: 310,
        createdAt: '2026-08-15T12:00:00Z',
        owner: { full_name: 'Bilal Ahmed', phone: '+923219876543', email: 'bilal@lahoretech.pk' },
      },
      {
        id: 'store_3',
        name: 'Peshawar Master Chappal Craft',
        slug: 'peshawar-chappal-craft',
        city: 'Peshawar',
        cnicNumber: '17301-5544332-9',
        bankAccountTitle: 'Zubair Artisan Footwear',
        bankAccountNumber: 'PK12BOK0004561237890456',
        bankName: 'Bank of Khyber',
        sellerType: SellerType.THIRD_PARTY,
        status: StoreStatus.ACTIVE,
        commissionRatePercentage: 12,
        address: 'Namak Mandi Heritage Bazaar, Peshawar',
        ratingAverage: 4.95,
        ratingCount: 520,
        createdAt: '2026-08-12T09:00:00Z',
        owner: { full_name: 'Zubair Khan', phone: '+923335551234', email: 'zubair@peshawarchappal.pk' },
      },
      {
        id: 'store_4',
        name: 'Faisalabad Handloom Weavers',
        slug: 'faisalabad-weavers',
        city: 'Faisalabad',
        cnicNumber: '33100-8877665-5',
        bankAccountTitle: 'Faisalabad Textile Traders',
        bankAccountNumber: 'PK88BAHL0001122334455667',
        bankName: 'Bank AL Habib',
        sellerType: SellerType.THIRD_PARTY,
        status: StoreStatus.PENDING_KYC,
        commissionRatePercentage: 10,
        address: 'Factory Area, Jhang Road, Faisalabad',
        ratingAverage: 4.7,
        ratingCount: 88,
        createdAt: '2026-08-21T14:30:00Z',
        owner: { full_name: 'Usman Ghani', phone: '+923456789012', email: 'usman@faisalabadtextiles.pk' },
      },
    ];
  }
}

export async function updateSellerStatus(
  storeId: string,
  status: StoreStatus,
  commissionRatePercentage?: number
): Promise<AdminSeller> {
  const res = await fetch(`${API_BASE}/api/admin/sellers/${storeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, commissionRatePercentage }),
  });
  if (!res.ok) throw new Error('Failed to update seller status');
  return await res.json();
}

export async function fetchOrders(status?: OrderStatus): Promise<AdminOrder[]> {
  try {
    const url = status ? `${API_BASE}/api/orders?status=${status}` : `${API_BASE}/api/orders`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return await res.json();
  } catch (err) {
    console.warn('Using demo orders fallback:', err);
    return [
      {
        id: 'ord_1',
        orderNumber: 'WAW-PK-98421',
        buyerName: 'Muhammad Hamza',
        buyerPhone: '+923001234567',
        shippingAddress: 'House 14, Street 9, Sector F-7/2',
        shippingCity: 'Islamabad',
        subtotalPkr: 6499,
        shippingFeePkr: 0,
        codFeePkr: 0,
        totalPkr: 6499,
        paymentMethod: PaymentMethod.XPAY_CARD,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.CONFIRMED,
        courier: 'PostEx',
        trackingNumber: 'PTX-98421-440',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        items: [
          {
            id: 'it_1',
            productTitle: 'Waw Signature Handcrafted Cowhide Leather Duffle Bag',
            productImage: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=400&auto=format&fit=crop&q=80',
            quantity: 1,
            unitPricePkr: 6499,
            totalPricePkr: 6499,
            wawCommissionPkr: 650,
            sellerPayoutPkr: 5849,
          },
        ],
      },
      {
        id: 'ord_2',
        orderNumber: 'WAW-PK-98422',
        buyerName: 'Ayesha Siddiqui',
        buyerPhone: '+923219876543',
        shippingAddress: 'Apartment 4B, Clifton Block 5',
        shippingCity: 'Karachi',
        subtotalPkr: 3200,
        shippingFeePkr: 200,
        codFeePkr: 100,
        totalPkr: 3500,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.COD_PENDING,
        orderStatus: OrderStatus.PROCESSING,
        courier: 'PostEx',
        trackingNumber: 'PTX-98422-819',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        items: [
          {
            id: 'it_2',
            productTitle: 'ANC Pro Wireless Earbuds (Deep Bass Edition)',
            productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80',
            quantity: 1,
            unitPricePkr: 3200,
            totalPricePkr: 3200,
            wawCommissionPkr: 320,
            sellerPayoutPkr: 2880,
          },
        ],
      },
      {
        id: 'ord_3',
        orderNumber: 'WAW-PK-98423',
        buyerName: 'Dr. Kamran Malik',
        buyerPhone: '+923334445566',
        shippingAddress: 'House 88, Phase 6, DHA',
        shippingCity: 'Lahore',
        subtotalPkr: 7600,
        shippingFeePkr: 0,
        codFeePkr: 0,
        totalPkr: 7600,
        paymentMethod: PaymentMethod.RAAST_P2M_QR,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.SHIPPED,
        courier: 'PostEx',
        trackingNumber: 'PTX-98423-112',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        items: [
          {
            id: 'it_3',
            productTitle: 'Khyber Master Artisan Peshawari Norozi Chappal',
            productImage: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&auto=format&fit=crop&q=80',
            quantity: 2,
            unitPricePkr: 3800,
            totalPricePkr: 7600,
            wawCommissionPkr: 912,
            sellerPayoutPkr: 6688,
          },
        ],
      },
      {
        id: 'ord_4',
        orderNumber: 'WAW-PK-98424',
        buyerName: 'Zainab Fatima',
        buyerPhone: '+923125556677',
        shippingAddress: 'House 19, Street 4, University Town',
        shippingCity: 'Peshawar',
        subtotalPkr: 4999,
        shippingFeePkr: 200,
        codFeePkr: 0,
        totalPkr: 5199,
        paymentMethod: PaymentMethod.XPAY_WALLET_JAZZCASH,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.DELIVERED,
        courier: 'PostEx',
        trackingNumber: 'PTX-98424-904',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        items: [
          {
            id: 'it_4',
            productTitle: 'Chiniot Heritage Carved Rosewood Spice Box & Brass Inlay',
            productImage: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&auto=format&fit=crop&q=80',
            quantity: 1,
            unitPricePkr: 4999,
            totalPricePkr: 4999,
            wawCommissionPkr: 500,
            sellerPayoutPkr: 4499,
          },
        ],
      },
    ];
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  courier = 'PostEx',
  trackingNumber?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${API_BASE}/api/products?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch products');
    return await res.json();
  } catch (err) {
    console.warn('Using demo products fallback:', err);
    return [
      {
        id: 'prod_1',
        title: 'Waw Signature Handcrafted Leather Duffle Bag',
        titleUrdu: 'واو سگنیچر پریمیم لیدر ٹریول ڈفل بیگ',
        slug: 'waw-leather-duffle-bag',
        categoryId: 'cat_leather',
        categoryName: 'Fashion & Leather',
        isFirstParty: true,
        basePricePkr: 6499,
        compareAtPricePkr: 8999,
        images: ['https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&auto=format&fit=crop&q=80'],
        stockQuantity: 45,
        soldCount: 182,
        ratingAverage: 4.9,
        sellerType: SellerType.FIRST_PARTY,
        storeName: 'Waw Official Retail',
        createdAt: '2026-08-10T10:00:00Z',
      },
      {
        id: 'prod_2',
        title: 'ANC Pro Wireless Bluetooth Earbuds (Deep Bass)',
        titleUrdu: 'وائرلیس ایکٹو نائز کینسلیشن ائیربڈز',
        slug: 'anc-pro-wireless-earbuds',
        categoryId: 'cat_tech',
        categoryName: 'Electronics & Audio',
        isFirstParty: false,
        basePricePkr: 3200,
        compareAtPricePkr: 4500,
        images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80'],
        stockQuantity: 120,
        soldCount: 430,
        ratingAverage: 4.85,
        sellerType: SellerType.THIRD_PARTY,
        storeName: 'Lahore Tech & Audio Hub',
        createdAt: '2026-08-14T11:00:00Z',
      },
      {
        id: 'prod_3',
        title: 'Khyber Master Artisan Peshawari Norozi Chappal',
        titleUrdu: 'خیبر دستکار روایتی نوروزی پشاوری چپل',
        slug: 'khyber-norozi-chappal',
        categoryId: 'cat_footwear',
        categoryName: 'Heritage Footwear',
        isFirstParty: false,
        basePricePkr: 3800,
        compareAtPricePkr: 5200,
        images: ['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80'],
        stockQuantity: 28,
        soldCount: 310,
        ratingAverage: 4.95,
        sellerType: SellerType.THIRD_PARTY,
        storeName: 'Peshawar Master Chappal Craft',
        createdAt: '2026-08-12T15:00:00Z',
      },
      {
        id: 'prod_4',
        title: 'Chiniot Carved Rosewood Spice Box with Brass Inlay',
        titleUrdu: 'چنیوٹی شیشم لکڑی کا مصالحہ دان بمعہ پیتل کا کام',
        slug: 'chiniot-rosewood-spice-box',
        categoryId: 'cat_artisan',
        categoryName: 'Home & Heritage Decor',
        isFirstParty: true,
        basePricePkr: 4999,
        compareAtPricePkr: 6500,
        images: ['https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80'],
        stockQuantity: 15,
        soldCount: 94,
        ratingAverage: 4.92,
        sellerType: SellerType.FIRST_PARTY,
        storeName: 'Waw Artisan Guild',
        createdAt: '2026-08-16T16:00:00Z',
      },
    ];
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create product in Supabase');
  return await res.json();
}

export async function fetchPayouts(): Promise<AdminPayout[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/payouts`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch payouts');
    return await res.json();
  } catch (err) {
    console.warn('Using demo payouts fallback:', err);
    return [
      {
        id: 'pay_1',
        storeId: 'store_2',
        storeName: 'Lahore Tech & Audio Hub',
        city: 'Lahore',
        bankName: 'Habib Bank Limited (HBL)',
        accountTitle: 'Lahore Tech Hub SMC-Pvt',
        iban: 'PK44HABB0009876543210987',
        amountPkr: 89400,
        status: PayoutStatus.PROCESSING,
        scheduledFor: '2026-08-25T00:00:00Z',
        createdAt: '2026-08-20T10:00:00Z',
      },
      {
        id: 'pay_2',
        storeId: 'store_3',
        storeName: 'Peshawar Master Chappal Craft',
        city: 'Peshawar',
        bankName: 'Bank of Khyber',
        accountTitle: 'Zubair Artisan Footwear',
        iban: 'PK12BOK0004561237890456',
        amountPkr: 142500,
        status: PayoutStatus.PAID,
        bankReference: 'RAAST-FT-992014-PK',
        scheduledFor: '2026-08-21T00:00:00Z',
        settledAt: '2026-08-21T11:45:00Z',
        createdAt: '2026-08-18T09:00:00Z',
      },
      {
        id: 'pay_3',
        storeId: 'store_1',
        storeName: 'Karachi Leather Goods',
        city: 'Karachi',
        bankName: 'Meezan Bank',
        accountTitle: 'Karachi Leather Enterprise',
        iban: 'PK36MEZN0001234567890123',
        amountPkr: 64200,
        status: PayoutStatus.HELD,
        scheduledFor: '2026-08-26T00:00:00Z',
        createdAt: '2026-08-22T14:00:00Z',
      },
    ];
  }
}

export async function settlePayout(payoutId: string, bankReference: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/admin/payouts/${payoutId}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bankReference }),
  });
  if (!res.ok) throw new Error('Failed to settle payout');
  return await res.json();
}
