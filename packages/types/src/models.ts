import { CourierProvider, OrderStatus, PaymentMethod, PaymentStatus, PayoutStatus, SellerType, StoreStatus, UserRole } from './enums.js';

export interface UserProfile {
  id: string; // Supabase auth.users id
  fullName: string;
  phone: string; // +923XXXXXXXXX
  email?: string;
  role: UserRole;
  avatarUrl?: string;
  isWhatsAppVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
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
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  title: string; // e.g. "Size 42 - Blue"
  pricePkr: number;
  compareAtPricePkr?: number;
  stockQuantity: number;
  attributes: Record<string, string>; // { size: '42', color: 'Blue' }
  imageUrl?: string;
}

export interface Product {
  id: string;
  storeId?: string | null; // null = First party (Waw)
  title: string;
  titleUrdu?: string;
  slug: string;
  description: string;
  descriptionUrdu?: string;
  categoryId: string;
  isFirstParty: boolean;
  isFeatured: boolean;
  isSponsored: boolean; // Boosted in Typesense
  basePricePkr: number;
  compareAtPricePkr?: number;
  images: string[];
  variants: ProductVariant[];
  ratingAverage: number;
  ratingCount: number;
  soldCount: number;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string;
  productTitle: string;
  variantTitle?: string;
  productImage?: string;
  storeId?: string | null;
  sellerType: SellerType;
  unitPricePkr: number;
  quantity: number;
  totalPricePkr: number;
  wawCommissionPkr: number;
  sellerPayoutPkr: number;
  status: OrderStatus;
  shipmentId?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "WAW-2026-98124"
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  items: OrderItem[];
  subtotalPkr: number;
  shippingFeePkr: number;
  codFeePkr: number;
  discountPkr: number;
  totalPkr: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  orderItemId?: string;
  courier: CourierProvider;
  trackingNumber: string;
  status: OrderStatus;
  isCod: boolean;
  codAmountPkr: number;
  estimatedDeliveryDate?: string;
  trackingUrl?: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  storeId: string;
  amountPkr: number;
  status: PayoutStatus;
  bankReference?: string;
  settledAt?: string;
  createdAt: string;
}
