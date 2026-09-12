import { PaymentMethod, SellerType } from "./enums.js";
export const MARKETPLACE_CONFIG = {
    FREE_DELIVERY_THRESHOLD_PKR: 5000,
    DEFAULT_SHIPPING_FEE_PKR: 200,
    DEFAULT_COD_FEE_PKR: 100,
    DEFAULT_COMMISSION_PERCENTAGE: 10,
    GST_RATE_PERCENTAGE: 18,
    CURRENCY: "PKR",
};
/**
 * Calculates complete order totals, applying the Free Delivery rule and the
 * COD Handling Surcharge. Supports coupon discounts and runtime fee
 * overrides so the display matches server-side pricing.
 */
export function calculateOrderSummary(items, paymentMethod, customShippingFee = MARKETPLACE_CONFIG.DEFAULT_SHIPPING_FEE_PKR, customCodFee = MARKETPLACE_CONFIG.DEFAULT_COD_FEE_PKR, couponDiscountPkr = 0, freeShipping = false, overrides) {
    const freeDeliveryThreshold = overrides?.freeDeliveryThresholdPkr ?? MARKETPLACE_CONFIG.FREE_DELIVERY_THRESHOLD_PKR;
    const gstRate = overrides?.gstRatePercentage ?? MARKETPLACE_CONFIG.GST_RATE_PERCENTAGE;
    const subtotalPkr = items.reduce((sum, item) => sum + item.unitPricePkr * item.quantity, 0);
    const isFreeDelivery = subtotalPkr >= freeDeliveryThreshold || freeShipping
        ? 1
        : 0;
    const shippingPkr = isFreeDelivery ? 0 : customShippingFee;
    const amountNeededForFreeDeliveryPkr = Math.max(0, freeDeliveryThreshold - subtotalPkr);
    const isCod = paymentMethod === PaymentMethod.COD;
    const codFeePkr = isCod ? customCodFee : 0;
    const savingsOnlinePaymentPkr = isCod ? 0 : customCodFee;
    // Coupon discount is subtracted from subtotal (before shipping/cod)
    const effectiveSubtotal = Math.max(0, subtotalPkr - couponDiscountPkr);
    const taxableAmount = effectiveSubtotal + shippingPkr + codFeePkr;
    // GST (default 18%)
    const gstPkr = Math.round(taxableAmount * (gstRate / 100));
    const totalPkr = taxableAmount + gstPkr;
    const defaultCommission = overrides?.commissionPercentage ?? MARKETPLACE_CONFIG.DEFAULT_COMMISSION_PERCENTAGE;
    const itemBreakdowns = items.map((item) => {
        const grossAmountPkr = item.unitPricePkr * item.quantity;
        const commissionRatePercentage = item.sellerType === SellerType.FIRST_PARTY
            ? 0
            : (item.commissionRatePercentage ?? defaultCommission);
        const wawCommissionPkr = item.sellerType === SellerType.FIRST_PARTY
            ? 0
            : Math.round((grossAmountPkr * commissionRatePercentage) / 100);
        const sellerPayoutPkr = item.sellerType === SellerType.FIRST_PARTY
            ? grossAmountPkr
            : grossAmountPkr - wawCommissionPkr;
        return {
            productId: item.productId,
            variantId: item.variantId,
            sellerId: item.sellerId || null,
            sellerType: item.sellerType,
            grossAmountPkr,
            commissionRatePercentage,
            wawCommissionPkr,
            sellerPayoutPkr,
        };
    });
    return {
        subtotalPkr,
        shippingPkr,
        isFreeDelivery,
        amountNeededForFreeDeliveryPkr,
        codFeePkr,
        couponDiscountPkr,
        gstPkr,
        totalPkr,
        savingsOnlinePaymentPkr,
        itemBreakdowns,
    };
}
