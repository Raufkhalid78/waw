import {
  CourierProvider,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  SellerType,
  StoreStatus,
  UserRole,
} from "./enums.js";

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
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  nameUrdu?: string;
  slug: string;
  parentId?: string | null;
  imageUrl?: string;
  description?: string;
  descriptionUrdu?: string;
  sortOrder?: number;
  isActive?: boolean;
  children?: Category[];
  productCount?: number;
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

export interface StoreOrder {
  id: string;
  orderId: string;
  storeId: string;
  subtotalPkr: number;
  shippingFeePkr: number;
  commissionPkr: number;
  sellerPayoutPkr: number;
  orderStatus: OrderStatus;
  packedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  shipments?: Shipment[];
}

export interface Coupon {
  id: string;
  code: string;
  storeId?: string | null; // null = platform-wide
  discountType: "PERCENTAGE" | "FIXED_PKR" | "FREE_SHIPPING";
  discountValue: number;
  minSpendPkr: number;
  maxDiscountPkr?: number;
  expiresAt?: string;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  createdAt: string;
}

export interface CheckoutQuoteItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CheckoutQuoteRequest {
  items: CheckoutQuoteItemInput[];
  shippingCity: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
}

export interface CheckoutQuoteResponse {
  quoteToken: string;
  expiresAt: string; // ISO timestamp (15 mins)
  subtotalPkr: number;
  shippingFeePkr: number;
  codFeePkr: number;
  couponDiscountPkr: number;
  totalPkr: number;
  estimatedDeliveryDays?: {
    min: number;
    max: number;
    label: string;
  };
  items: {
    productId: string;
    variantId?: string;
    title: string;
    storeId: string;
    unitPricePkr: number;
    quantity: number;
    totalPricePkr: number;
  }[];
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  storeOrderId?: string;
  buyerId?: string;
  reason: string;
  evidenceImages: string[];
  status:
    | "PENDING_REVIEW"
    | "APPROVED"
    | "REVERSE_PICKUP_BOOKED"
    | "RECEIVED"
    | "REFUNDED"
    | "REJECTED";
  reverseCourierCn?: string;
  refundAmountPkr: number;
  staffNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorRole: string;
  action: string;
  targetResourceType: string;
  targetResourceId: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface CatalogProduct {
  id: string;
  title: string;
  titleUrdu?: string;
  slug: string;
  description: string;
  descriptionUrdu?: string;
  categoryId: string;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  is_sponsored: boolean;
  rating_average: number;
  rating_count: number;
  sold_count: number;
  cost_price_pkr?: number;
  tags?: string[];
  weight_kg?: number;
  merchandising_rank?: number;
  created_at: string;
  updated_at: string;
}

export interface SellerOffer {
  id: string;
  store_id: string;
  catalog_product_id: string;
  sku: string;
  price_pkr: number;
  original_price_pkr?: number;
  condition: "NEW" | "REFURBISHED" | "USED";
  status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfferVariant {
  id: string;
  offer_id: string;
  sku: string;
  attributes: Record<string, string>;
  price_adjustment_pkr: number;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryLedgerEntry {
  id: string;
  offer_variant_id: string;
  store_id: string;
  transaction_type: "RESTOCK" | "RESERVE" | "RELEASE" | "SALE" | "RETURN_RESTOCK" | "DAMAGE_ADJUSTMENT";
  quantity: number;
  reference_id?: string;
  notes?: string;
  actor_id?: string;
  created_at: string;
}
