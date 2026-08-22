export enum UserRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
  SUPPORT = 'SUPPORT',
}

export enum StoreStatus {
  PENDING_KYC = 'PENDING_KYC',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

export enum SellerType {
  FIRST_PARTY = 'FIRST_PARTY', // Waw direct retail / inventory
  THIRD_PARTY = 'THIRD_PARTY', // Marketplace vendor
}

export enum PaymentMethod {
  RAAST_P2M_QR = 'RAAST_P2M_QR', // State Bank of Pakistan Raast Instant QR (via PostEx XPay)
  XPAY_CARD = 'XPAY_CARD', // Visa, Mastercard, PayPak (via PostEx XPay)
  XPAY_WALLET_JAZZCASH = 'XPAY_WALLET_JAZZCASH', // JazzCash Mobile Account (via PostEx XPay)
  XPAY_WALLET_EASYPAISA = 'XPAY_WALLET_EASYPAISA', // Easypaisa Mobile Wallet (via PostEx XPay)
  COD = 'COD', // Cash on Delivery (PostEx Courier Collection)
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  PAID = 'PAID',
  ESCROW_HELD = 'ESCROW_HELD', // SBP Escrow holding period
  COD_PENDING = 'COD_PENDING',
  COD_COLLECTED = 'COD_COLLECTED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  RETURNED = 'RETURNED',
}

export enum CourierProvider {
  POSTEX = 'POSTEX', // Designated primary logistics & COD partner
  LEOPARDS = 'LEOPARDS',
  TRAX = 'TRAX',
  WAW_FLEET = 'WAW_FLEET',
}

export enum PayoutStatus {
  SCHEDULED = 'SCHEDULED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
}

export enum ReturnStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  PICKUP_SCHEDULED = 'PICKUP_SCHEDULED',
  IN_TRANSIT = 'IN_TRANSIT',
  INSPECTED = 'INSPECTED',
  REFUNDED = 'REFUNDED',
  REJECTED = 'REJECTED',
}

export enum ReturnReason {
  DAMAGED_OR_DEFECTIVE = 'DAMAGED_OR_DEFECTIVE',
  SIZE_OR_FIT_MISMATCH = 'SIZE_OR_FIT_MISMATCH',
  ITEM_NOT_AS_DESCRIBED = 'ITEM_NOT_AS_DESCRIBED',
  CHANGED_MIND = 'CHANGED_MIND',
}
