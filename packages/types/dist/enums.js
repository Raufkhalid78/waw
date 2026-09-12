export var UserRole;
(function (UserRole) {
    UserRole["BUYER"] = "BUYER";
    UserRole["SELLER"] = "SELLER";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["OPS_AGENT"] = "OPS_AGENT";
    UserRole["FINANCE"] = "FINANCE";
    UserRole["MODERATOR"] = "MODERATOR";
    UserRole["SUPPORT"] = "SUPPORT";
})(UserRole || (UserRole = {}));
/**
 * Roles permitted to sign in to the Admin Control Center.
 * Shared single source of truth — the admin login proxy AND the admin
 * middleware MUST both use this list (a previous divergence locked
 * FINANCE/OPS_AGENT/MODERATOR accounts in a logout loop).
 */
export const ADMIN_PANEL_ROLES = [
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.FINANCE,
    UserRole.OPS_AGENT,
    UserRole.MODERATOR,
];
export function isAdminPanelRole(role) {
    return (typeof role === "string" &&
        ADMIN_PANEL_ROLES.includes(role));
}
export var StoreStatus;
(function (StoreStatus) {
    StoreStatus["PENDING_KYC"] = "PENDING_KYC";
    StoreStatus["ACTIVE"] = "ACTIVE";
    StoreStatus["SUSPENDED"] = "SUSPENDED";
    StoreStatus["REJECTED"] = "REJECTED";
})(StoreStatus || (StoreStatus = {}));
export var SellerType;
(function (SellerType) {
    SellerType["FIRST_PARTY"] = "FIRST_PARTY";
    SellerType["THIRD_PARTY"] = "THIRD_PARTY";
})(SellerType || (SellerType = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["RAAST_P2M_QR"] = "RAAST_P2M_QR";
    PaymentMethod["COD"] = "COD";
    PaymentMethod["ALFA_WALLET"] = "ALFA_WALLET";
    PaymentMethod["ALFALAH_ACCOUNT"] = "ALFALAH_ACCOUNT";
    PaymentMethod["ALFA_CARD"] = "ALFA_CARD";
})(PaymentMethod || (PaymentMethod = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["AUTHORIZED"] = "AUTHORIZED";
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["ESCROW_HELD"] = "ESCROW_HELD";
    PaymentStatus["COD_PENDING"] = "COD_PENDING";
    PaymentStatus["COD_COLLECTED"] = "COD_COLLECTED";
    PaymentStatus["AWAITING_COD_REMITTANCE"] = "AWAITING_COD_REMITTANCE";
    PaymentStatus["SETTLED"] = "SETTLED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (PaymentStatus = {}));
export var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["CONFIRMED"] = "CONFIRMED";
    OrderStatus["PROCESSING"] = "PROCESSING";
    OrderStatus["SHIPPED"] = "SHIPPED";
    OrderStatus["OUT_FOR_DELIVERY"] = "OUT_FOR_DELIVERY";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["CANCELLED"] = "CANCELLED";
    OrderStatus["RETURN_REQUESTED"] = "RETURN_REQUESTED";
    OrderStatus["RETURNED"] = "RETURNED";
})(OrderStatus || (OrderStatus = {}));
export var CourierProvider;
(function (CourierProvider) {
    CourierProvider["POSTEX"] = "POSTEX";
    CourierProvider["LEOPARDS"] = "LEOPARDS";
    CourierProvider["TRAX"] = "TRAX";
    CourierProvider["TCS"] = "TCS";
    CourierProvider["WAW_FLEET"] = "WAW_FLEET";
})(CourierProvider || (CourierProvider = {}));
export var PayoutStatus;
(function (PayoutStatus) {
    PayoutStatus["SCHEDULED"] = "SCHEDULED";
    PayoutStatus["PROCESSING"] = "PROCESSING";
    PayoutStatus["PAID"] = "PAID";
    PayoutStatus["COMPLETED"] = "COMPLETED";
    PayoutStatus["SETTLED"] = "SETTLED";
    PayoutStatus["HELD"] = "HELD";
    PayoutStatus["HELD_PENDING_DELIVERY"] = "HELD_PENDING_DELIVERY";
    PayoutStatus["FAILED"] = "FAILED";
})(PayoutStatus || (PayoutStatus = {}));
export var ReturnReason;
(function (ReturnReason) {
    ReturnReason["DAMAGED_ITEM"] = "DAMAGED_ITEM";
    ReturnReason["DAMAGED_OR_DEFECTIVE"] = "DAMAGED_OR_DEFECTIVE";
    ReturnReason["DEFECTIVE_OR_NOT_WORKING"] = "DEFECTIVE_OR_NOT_WORKING";
    ReturnReason["WRONG_ITEM_SENT"] = "WRONG_ITEM_SENT";
    ReturnReason["ITEM_NOT_AS_DESCRIBED"] = "ITEM_NOT_AS_DESCRIBED";
    ReturnReason["SIZE_OR_FIT_MISMATCH"] = "SIZE_OR_FIT_MISMATCH";
    ReturnReason["CHANGED_MIND"] = "CHANGED_MIND";
})(ReturnReason || (ReturnReason = {}));
export var ReturnStatus;
(function (ReturnStatus) {
    ReturnStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    ReturnStatus["APPROVED"] = "APPROVED";
    ReturnStatus["PICKUP_SCHEDULED"] = "PICKUP_SCHEDULED";
    ReturnStatus["REVERSE_PICKUP_BOOKED"] = "REVERSE_PICKUP_BOOKED";
    ReturnStatus["RECEIVED_AT_HUB"] = "RECEIVED_AT_HUB";
    ReturnStatus["REFUND_APPROVED"] = "REFUND_APPROVED";
    ReturnStatus["REJECTED"] = "REJECTED";
})(ReturnStatus || (ReturnStatus = {}));
