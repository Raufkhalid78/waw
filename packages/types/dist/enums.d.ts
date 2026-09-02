export declare enum UserRole {
    BUYER = "BUYER",
    SELLER = "SELLER",
    ADMIN = "ADMIN",
    SUPPORT = "SUPPORT"
}
export declare enum StoreStatus {
    PENDING_KYC = "PENDING_KYC",
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    REJECTED = "REJECTED"
}
export declare enum SellerType {
    FIRST_PARTY = "FIRST_PARTY",// Waw direct retail / inventory
    THIRD_PARTY = "THIRD_PARTY"
}
export declare enum PaymentMethod {
    XPAY_CARD = "XPAY_CARD",// Visa, Mastercard, PayPak (via PostEx XPay)
    XPAY_WALLET_JAZZCASH = "XPAY_WALLET_JAZZCASH",// JazzCash Mobile Account (via PostEx XPay)
    XPAY_WALLET_EASYPAISA = "XPAY_WALLET_EASYPAISA",// Easypaisa Mobile Wallet (via PostEx XPay)
    COD = "COD"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    AUTHORIZED = "AUTHORIZED",
    PAID = "PAID",
    ESCROW_HELD = "ESCROW_HELD",// Marketplace Escrow holding period
    COD_PENDING = "COD_PENDING",
    COD_COLLECTED = "COD_COLLECTED",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED"
}
export declare enum OrderStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    PROCESSING = "PROCESSING",
    SHIPPED = "SHIPPED",
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
    DELIVERED = "DELIVERED",
    CANCELLED = "CANCELLED",
    RETURN_REQUESTED = "RETURN_REQUESTED",
    RETURNED = "RETURNED"
}
export declare enum CourierProvider {
    POSTEX = "POSTEX",// Designated primary logistics & COD partner
    LEOPARDS = "LEOPARDS",
    TRAX = "TRAX",
    WAW_FLEET = "WAW_FLEET"
}
export declare enum PayoutStatus {
    SCHEDULED = "SCHEDULED",
    PROCESSING = "PROCESSING",
    PAID = "PAID",
    COMPLETED = "COMPLETED",
    HELD = "HELD",
    FAILED = "FAILED"
}
export declare enum ReturnReason {
    DAMAGED_ITEM = "DAMAGED_ITEM",
    DAMAGED_OR_DEFECTIVE = "DAMAGED_OR_DEFECTIVE",
    DEFECTIVE_OR_NOT_WORKING = "DEFECTIVE_OR_NOT_WORKING",
    WRONG_ITEM_SENT = "WRONG_ITEM_SENT",
    ITEM_NOT_AS_DESCRIBED = "ITEM_NOT_AS_DESCRIBED",
    SIZE_OR_FIT_MISMATCH = "SIZE_OR_FIT_MISMATCH",
    CHANGED_MIND = "CHANGED_MIND"
}
export declare enum ReturnStatus {
    PENDING_REVIEW = "PENDING_REVIEW",
    APPROVED = "APPROVED",
    PICKUP_SCHEDULED = "PICKUP_SCHEDULED",
    REVERSE_PICKUP_BOOKED = "REVERSE_PICKUP_BOOKED",
    RECEIVED_AT_HUB = "RECEIVED_AT_HUB",
    REFUND_APPROVED = "REFUND_APPROVED",
    REJECTED = "REJECTED"
}
