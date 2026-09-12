import { PaymentMethod, SellerType } from "./enums.js";
export declare const MARKETPLACE_CONFIG: {
    FREE_DELIVERY_THRESHOLD_PKR: number;
    DEFAULT_SHIPPING_FEE_PKR: number;
    DEFAULT_COD_FEE_PKR: number;
    DEFAULT_COMMISSION_PERCENTAGE: number;
    GST_RATE_PERCENTAGE: number;
    CURRENCY: string;
};
/**
 * Runtime marketplace fees, typically fetched from the server's
 * marketplace_settings (via /api/config/marketplace). When the admin
 * changes pricing at runtime, clients can override the defaults above so
 * cart/checkout displays match the server-authoritative quote.
 */
export interface MarketplacePricingOverrides {
    freeDeliveryThresholdPkr?: number;
    shippingFeePkr?: number;
    codFeePkr?: number;
    commissionPercentage?: number;
    gstRatePercentage?: number;
}
export interface OrderItemPricingInput {
    productId: string;
    variantId?: string;
    sellerId?: string | null;
    sellerType: SellerType;
    commissionRatePercentage?: number;
    unitPricePkr: number;
    quantity: number;
}
export interface OrderCalculationResult {
    subtotalPkr: number;
    shippingPkr: number;
    isFreeDelivery: number;
    amountNeededForFreeDeliveryPkr: number;
    codFeePkr: number;
    couponDiscountPkr: number;
    gstPkr: number;
    totalPkr: number;
    savingsOnlinePaymentPkr: number;
    itemBreakdowns: {
        productId: string;
        variantId?: string;
        sellerId: string | null;
        sellerType: SellerType;
        grossAmountPkr: number;
        commissionRatePercentage: number;
        wawCommissionPkr: number;
        sellerPayoutPkr: number;
    }[];
}
/**
 * Calculates complete order totals, applying the Free Delivery rule and the
 * COD Handling Surcharge. Supports coupon discounts and runtime fee
 * overrides so the display matches server-side pricing.
 */
export declare function calculateOrderSummary(items: OrderItemPricingInput[], paymentMethod: PaymentMethod, customShippingFee?: number, customCodFee?: number, couponDiscountPkr?: number, freeShipping?: boolean, overrides?: MarketplacePricingOverrides): OrderCalculationResult;
