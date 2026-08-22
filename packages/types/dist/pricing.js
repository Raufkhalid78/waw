import { PaymentMethod, SellerType } from './enums.js';
export const MARKETPLACE_CONFIG = {
    FREE_DELIVERY_THRESHOLD_PKR: 5000,
    DEFAULT_SHIPPING_FEE_PKR: 200,
    DEFAULT_COD_FEE_PKR: 100,
    DEFAULT_COMMISSION_PERCENTAGE: 10,
    CURRENCY: 'PKR',
};
/**
 * Calculates complete order totals, applying the Free Delivery rule (Subtotal >= 5000 PKR)
 * and the COD Handling Surcharge (+100 PKR).
 */
export function calculateOrderSummary(items, paymentMethod, customShippingFee = MARKETPLACE_CONFIG.DEFAULT_SHIPPING_FEE_PKR, customCodFee = MARKETPLACE_CONFIG.DEFAULT_COD_FEE_PKR) {
    const subtotalPkr = items.reduce((sum, item) => sum + item.unitPricePkr * item.quantity, 0);
    const isFreeDelivery = subtotalPkr >= MARKETPLACE_CONFIG.FREE_DELIVERY_THRESHOLD_PKR ? 1 : 0;
    const shippingPkr = isFreeDelivery ? 0 : customShippingFee;
    const amountNeededForFreeDeliveryPkr = Math.max(0, MARKETPLACE_CONFIG.FREE_DELIVERY_THRESHOLD_PKR - subtotalPkr);
    const isCod = paymentMethod === PaymentMethod.COD;
    const codFeePkr = isCod ? customCodFee : 0;
    const savingsOnlinePaymentPkr = isCod ? 0 : customCodFee;
    const totalPkr = subtotalPkr + shippingPkr + codFeePkr;
    const itemBreakdowns = items.map((item) => {
        const grossAmountPkr = item.unitPricePkr * item.quantity;
        const commissionRatePercentage = item.sellerType === SellerType.FIRST_PARTY
            ? 0
            : item.commissionRatePercentage ?? MARKETPLACE_CONFIG.DEFAULT_COMMISSION_PERCENTAGE;
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
        totalPkr,
        savingsOnlinePaymentPkr,
        itemBreakdowns,
    };
}
