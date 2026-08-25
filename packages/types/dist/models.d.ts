import { CourierProvider, OrderStatus, PaymentMethod, PaymentStatus, PayoutStatus, SellerType, StoreStatus, UserRole } from './enums.js';
export interface UserProfile {
    id: string;
    fullName: string;
    phone: string;
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
    title: string;
    pricePkr: number;
    compareAtPricePkr?: number;
    stockQuantity: number;
    attributes: Record<string, string>;
    imageUrl?: string;
}
export interface Product {
    id: string;
    storeId?: string | null;
    title: string;
    titleUrdu?: string;
    slug: string;
    description: string;
    descriptionUrdu?: string;
    categoryId: string;
    isFirstParty: boolean;
    isFeatured: boolean;
    isSponsored: boolean;
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
    orderNumber: string;
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
    storeId?: string | null;
    discountType: 'PERCENTAGE' | 'FIXED_PKR' | 'FREE_SHIPPING';
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
    expiresAt: string;
    subtotalPkr: number;
    shippingFeePkr: number;
    codFeePkr: number;
    couponDiscountPkr: number;
    totalPkr: number;
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
    status: 'PENDING_REVIEW' | 'APPROVED' | 'REVERSE_PICKUP_BOOKED' | 'RECEIVED' | 'REFUNDED' | 'REJECTED';
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
