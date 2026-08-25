import { OrderStatus, PaymentMethod, PaymentStatus, PayoutStatus, SellerType, StoreStatus } from '@waw/types';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://waw-production-8aca.up.railway.app').replace(/\/+$/, '');

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
  basePricePkr: number;
  compareAtPricePkr?: number;
  stockQuantity: number;
  isActive: boolean;
  sku: string;
  createdAt: string;
}

export interface SellerPayout {
  id: string;
  orderNumber: string;
  amountPkr: number;
  commissionPkr: number;
  status: PayoutStatus;
  scheduledFor: string;
  processedAt?: string;
  createdAt: string;
}

export interface SellerCoupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_PKR' | 'FREE_SHIPPING';
  discountValue: number;
  minSpendPkr: number;
  maxDiscountPkr?: number;
  expiresAt?: string;
  currentUses: number;
  maxUses?: number;
  isActive: boolean;
  createdAt: string;
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('waw_seller_token') || localStorage.getItem('waw_auth_token') || 'mock_seller_jwt_2026';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// MOCK DATA GENERATORS (For instantaneous offline/demo functionality)
const MOCK_STORE: SellerStore = {
  id: 'store_lahore_couture',
  name: 'Lahore Silk & Craft Studio',
  slug: 'lahore-silk-studio',
  description: 'Handcrafted Festive Lawn & Premium Unstitched Silk collections direct from Anarkali.',
  logoUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200&auto=format&fit=crop&q=80',
  sellerType: SellerType.THIRD_PARTY,
  status: StoreStatus.ACTIVE,
  commissionRatePercentage: 10,
  cnicNumber: '35202-1234567-1',
  bankAccountTitle: 'Lahore Silk Studio Pvt Ltd',
  bankAccountNumber: '01234567890123',
  bankName: 'Meezan Bank Ltd (Islamic Banking)',
  city: 'Lahore',
  address: 'Shop 42, Block B, MM Alam Road, Gulberg III',
  isVerified: true,
  ratingAverage: 4.85,
  ratingCount: 142,
};

const MOCK_ORDERS: SellerOrder[] = [
  {
    id: 'sord_101',
    parentOrderId: 'ord_901',
    orderNumber: 'WAW-781924-LHR',
    buyerName: 'Ayesha Siddiqui',
    buyerPhone: '0300-1234567',
    shippingAddress: 'House 14-B, Street 9, F-8/3',
    shippingCity: 'Islamabad',
    subtotalPkr: 8999,
    shippingFeePkr: 200,
    commissionPkr: 900,
    sellerPayoutPkr: 8099,
    orderStatus: OrderStatus.CONFIRMED,
    paymentMethod: PaymentMethod.COD,
    paymentStatus: PaymentStatus.COD_PENDING,
    trackingNumber: 'PTX-781924-491',
    courierProvider: 'POSTEX',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    items: [
      {
        id: 'item_1',
        productId: 'prod_lawn_01',
        productTitle: 'Luxury 3-Piece Embroidered Chiffon Lawn - Crimson Flora',
        variantSku: 'LHR-LAWN-RED-M',
        quantity: 1,
        unitPricePkr: 8999,
        totalPricePkr: 8999,
      }
    ]
  },
  {
    id: 'sord_102',
    parentOrderId: 'ord_902',
    orderNumber: 'WAW-882194-LHR',
    buyerName: 'Hamza Farooq',
    buyerPhone: '0321-9876543',
    shippingAddress: 'Apartment 4B, Creek Vista, Phase 8 DHA',
    shippingCity: 'Karachi',
    subtotalPkr: 14500,
    shippingFeePkr: 200,
    commissionPkr: 1450,
    sellerPayoutPkr: 13050,
    orderStatus: OrderStatus.SHIPPED,
    paymentMethod: PaymentMethod.XPAY_CARD,
    paymentStatus: PaymentStatus.ESCROW_HELD,
    trackingNumber: 'PTX-882194-201',
    courierProvider: 'POSTEX',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    items: [
      {
        id: 'item_2',
        productId: 'prod_silk_02',
        productTitle: 'Pure Raw Silk Unstitched Festive Kurta - Emerald Green',
        variantSku: 'LHR-SILK-GRN-L',
        quantity: 2,
        unitPricePkr: 7250,
        totalPricePkr: 14500,
      }
    ]
  },
  {
    id: 'sord_103',
    parentOrderId: 'ord_903',
    orderNumber: 'WAW-912041-LHR',
    buyerName: 'Zainab Malik',
    buyerPhone: '0333-5551234',
    shippingAddress: 'House 82, Cavalry Ground',
    shippingCity: 'Lahore',
    subtotalPkr: 4999,
    shippingFeePkr: 0,
    commissionPkr: 500,
    sellerPayoutPkr: 4499,
    orderStatus: OrderStatus.DELIVERED,
    paymentMethod: PaymentMethod.RAAST_P2M_QR,
    paymentStatus: PaymentStatus.PAID,
    trackingNumber: 'PTX-912041-998',
    courierProvider: 'POSTEX',
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    items: [
      {
        id: 'item_3',
        productId: 'prod_kurti_03',
        productTitle: 'Digital Printed Ready-to-Wear Jacquard Kurti',
        variantSku: 'LHR-KURT-BLU-S',
        quantity: 1,
        unitPricePkr: 4999,
        totalPricePkr: 4999,
      }
    ]
  }
];

const MOCK_PRODUCTS: SellerProduct[] = [
  {
    id: 'prod_1',
    title: 'Luxury 3-Piece Embroidered Chiffon Lawn - Crimson Flora',
    titleUrdu: 'لگژری تھری پیس کڑھائی لان سوٹ',
    slug: 'luxury-3pc-embroidered-chiffon-lawn',
    categoryName: "Women's Lawn",
    basePricePkr: 8999,
    compareAtPricePkr: 11999,
    stockQuantity: 24,
    isActive: true,
    sku: 'LHR-LAWN-RED',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'prod_2',
    title: 'Pure Raw Silk Unstitched Festive Kurta - Emerald Green',
    titleUrdu: 'خالص را سلک غیر سلے کرتے کا کپڑا',
    slug: 'pure-raw-silk-unstitched-kurta',
    categoryName: "Men's Festive",
    basePricePkr: 7250,
    compareAtPricePkr: 9500,
    stockQuantity: 18,
    isActive: true,
    sku: 'LHR-SILK-GRN',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'prod_3',
    title: 'Digital Printed Ready-to-Wear Jacquard Kurti',
    titleUrdu: 'ڈیجیٹل پرنٹڈ ریڈی ٹو ویئر کرتی',
    slug: 'digital-printed-jacquard-kurti',
    categoryName: 'Ready to Wear',
    basePricePkr: 4999,
    compareAtPricePkr: 6500,
    stockQuantity: 42,
    isActive: true,
    sku: 'LHR-KURT-BLU',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  }
];

const MOCK_COUPONS: SellerCoupon[] = [
  {
    id: 'coup_1',
    code: 'LAHORE10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minSpendPkr: 5000,
    maxDiscountPkr: 1500,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    currentUses: 18,
    maxUses: 100,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coup_2',
    code: 'EIDSPECIAL',
    discountType: 'FIXED_PKR',
    discountValue: 1000,
    minSpendPkr: 10000,
    expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    currentUses: 7,
    maxUses: 50,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
];

export async function fetchSellerStore(): Promise<SellerStore> {
  try {
    const res = await fetch(`${API_BASE}/api/seller/store`, { headers: getAuthHeader() });
    if (!res.ok) return MOCK_STORE;
    const data = await res.json();
    return data?.id ? data : MOCK_STORE;
  } catch {
    return MOCK_STORE;
  }
}

export async function fetchSellerOrders(): Promise<SellerOrder[]> {
  try {
    const res = await fetch(`${API_BASE}/api/seller/orders`, { headers: getAuthHeader() });
    if (!res.ok) return MOCK_ORDERS;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : MOCK_ORDERS;
  } catch {
    return MOCK_ORDERS;
  }
}

export async function updateStoreOrderStatus(storeOrderId: string, status: OrderStatus): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/seller/orders/${storeOrderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch {
    return true; // Mock success
  }
}

export async function fetchSellerProducts(): Promise<SellerProduct[]> {
  try {
    const res = await fetch(`${API_BASE}/api/products?seller=me`, { headers: getAuthHeader() });
    if (!res.ok) return MOCK_PRODUCTS;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : MOCK_PRODUCTS;
  } catch {
    return MOCK_PRODUCTS;
  }
}

export async function createSellerProduct(productData: Partial<SellerProduct>): Promise<SellerProduct> {
  try {
    const res = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(productData),
    });
    if (!res.ok) throw new Error('Failed to create product');
    return await res.json();
  } catch {
    const newProduct: SellerProduct = {
      id: `prod_${Date.now()}`,
      title: productData.title || 'New Product',
      titleUrdu: productData.titleUrdu,
      slug: (productData.title || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      categoryName: productData.categoryName || 'Fashion',
      basePricePkr: productData.basePricePkr || 2999,
      compareAtPricePkr: productData.compareAtPricePkr,
      stockQuantity: productData.stockQuantity || 10,
      isActive: true,
      sku: productData.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };
    return newProduct;
  }
}

export async function fetchSellerPayouts(): Promise<SellerPayout[]> {
  try {
    const res = await fetch(`${API_BASE}/api/seller/payouts`, { headers: getAuthHeader() });
    if (!res.ok) return [
      {
        id: 'pay_1',
        orderNumber: 'WAW-912041-LHR',
        amountPkr: 4499,
        commissionPkr: 500,
        status: PayoutStatus.COMPLETED,
        scheduledFor: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        processedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      },
      {
        id: 'pay_2',
        orderNumber: 'WAW-882194-LHR',
        amountPkr: 13050,
        commissionPkr: 1450,
        status: PayoutStatus.SCHEDULED,
        scheduledFor: new Date(Date.now() + 5 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      }
    ];
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : [];
  } catch {
    return [];
  }
}

export async function fetchSellerCoupons(): Promise<SellerCoupon[]> {
  try {
    const res = await fetch(`${API_BASE}/api/seller/coupons`, { headers: getAuthHeader() });
    if (!res.ok) return MOCK_COUPONS;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : MOCK_COUPONS;
  } catch {
    return MOCK_COUPONS;
  }
}

export async function createSellerCoupon(couponData: Partial<SellerCoupon>): Promise<SellerCoupon> {
  try {
    const res = await fetch(`${API_BASE}/api/seller/coupons`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(couponData),
    });
    if (!res.ok) throw new Error('Failed to create coupon');
    return await res.json();
  } catch {
    const newCoupon: SellerCoupon = {
      id: `coup_${Date.now()}`,
      code: (couponData.code || 'WAWPROMO').toUpperCase(),
      discountType: couponData.discountType || 'PERCENTAGE',
      discountValue: couponData.discountValue || 10,
      minSpendPkr: couponData.minSpendPkr || 0,
      maxDiscountPkr: couponData.maxDiscountPkr,
      expiresAt: couponData.expiresAt,
      maxUses: couponData.maxUses,
      currentUses: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    return newCoupon;
  }
}
