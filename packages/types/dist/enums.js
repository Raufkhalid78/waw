export var UserRole;
(function (UserRole) {
    UserRole["BUYER"] = "BUYER";
    UserRole["SELLER"] = "SELLER";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["SUPPORT"] = "SUPPORT";
})(UserRole || (UserRole = {}));
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
    PaymentMethod["XPAY_CARD"] = "XPAY_CARD";
    PaymentMethod["XPAY_WALLET_JAZZCASH"] = "XPAY_WALLET_JAZZCASH";
    PaymentMethod["XPAY_WALLET_EASYPAISA"] = "XPAY_WALLET_EASYPAISA";
    PaymentMethod["COD"] = "COD";
})(PaymentMethod || (PaymentMethod = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["AUTHORIZED"] = "AUTHORIZED";
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["ESCROW_HELD"] = "ESCROW_HELD";
    PaymentStatus["COD_PENDING"] = "COD_PENDING";
    PaymentStatus["COD_COLLECTED"] = "COD_COLLECTED";
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
    CourierProvider["WAW_FLEET"] = "WAW_FLEET";
})(CourierProvider || (CourierProvider = {}));
export var PayoutStatus;
(function (PayoutStatus) {
    PayoutStatus["SCHEDULED"] = "SCHEDULED";
    PayoutStatus["PROCESSING"] = "PROCESSING";
    PayoutStatus["COMPLETED"] = "COMPLETED";
    PayoutStatus["ON_HOLD"] = "ON_HOLD";
})(PayoutStatus || (PayoutStatus = {}));
export var ReturnStatus;
(function (ReturnStatus) {
    ReturnStatus["REQUESTED"] = "REQUESTED";
    ReturnStatus["APPROVED"] = "APPROVED";
    ReturnStatus["PICKUP_SCHEDULED"] = "PICKUP_SCHEDULED";
    ReturnStatus["IN_TRANSIT"] = "IN_TRANSIT";
    ReturnStatus["INSPECTED"] = "INSPECTED";
    ReturnStatus["REFUNDED"] = "REFUNDED";
    ReturnStatus["REJECTED"] = "REJECTED";
})(ReturnStatus || (ReturnStatus = {}));
export var ReturnReason;
(function (ReturnReason) {
    ReturnReason["DAMAGED_OR_DEFECTIVE"] = "DAMAGED_OR_DEFECTIVE";
    ReturnReason["SIZE_OR_FIT_MISMATCH"] = "SIZE_OR_FIT_MISMATCH";
    ReturnReason["ITEM_NOT_AS_DESCRIBED"] = "ITEM_NOT_AS_DESCRIBED";
    ReturnReason["CHANGED_MIND"] = "CHANGED_MIND";
})(ReturnReason || (ReturnReason = {}));
