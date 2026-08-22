import { PaymentMethod, SellerType } from './enums.js';
export declare const MARKETPLACE_CONFIG: {
    FREE_DELIVERY_THRESHOLD_PKR: number;
    DEFAULT_SHIPPING_FEE_PKR: number;
    DEFAULT_COD_FEE_PKR: number;
    DEFAULT_COMMISSION_PERCENTAGE: number;
    CURRENCY: string;
};
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
 * Calculates complete order totals, applying the Free Delivery rule (Subtotal >= 5000 PKR)
 * and the COD Handling Surcharge (+100 PKR).
 */
export declare function calculateOrderSummary(items: OrderItemPricingInput[], paymentMethod: PaymentMethod, customShippingFee?: number, customCodFee?: number): OrderCalculationResult;
