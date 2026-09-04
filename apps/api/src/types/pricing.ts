import { PaymentMethod, SellerType } from "./enums.js";

export const MARKETPLACE_CONFIG = {
  FREE_DELIVERY_THRESHOLD_PKR: 5000,
  DEFAULT_SHIPPING_FEE_PKR: 200,
  DEFAULT_COD_FEE_PKR: 100,
  DEFAULT_COMMISSION_PERCENTAGE: 10,
  CURRENCY: "PKR",
};

export interface OrderItemPricingInput {
  productId: string;
  variantId?: string;
  sellerId?: string | null; // null = First party (Waw)
  sellerType: SellerType;
  commissionRatePercentage?: number; // e.g. 10 for 10%
  unitPricePkr: number;
  quantity: number;
}

export interface OrderCalculationResult {
  subtotalPkr: number;
  shippingPkr: number;
  isFreeDelivery: number; // 1 or 0
  amountNeededForFreeDeliveryPkr: number;
  codFeePkr: number;
  couponDiscountPkr: number;
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
 * and the COD Handling Surcharge (+100 PKR). Supports coupon discounts.
 */
export function calculateOrderSummary(
  items: OrderItemPricingInput[],
  paymentMethod: PaymentMethod,
  customShippingFee = MARKETPLACE_CONFIG.DEFAULT_SHIPPING_FEE_PKR,
  customCodFee = MARKETPLACE_CONFIG.DEFAULT_COD_FEE_PKR,
  couponDiscountPkr = 0,
  freeShipping = false,
): OrderCalculationResult {
  const subtotalPkr = items.reduce(
    (sum, item) => sum + item.unitPricePkr * item.quantity,
    0,
  );

  const isFreeDelivery =
    subtotalPkr >= MARKETPLACE_CONFIG.FREE_DELIVERY_THRESHOLD_PKR || freeShipping
      ? 1
      : 0;
  const shippingPkr = isFreeDelivery ? 0 : customShippingFee;
  const amountNeededForFreeDeliveryPkr = Math.max(
    0,
    MARKETPLACE_CONFIG.FREE_DELIVERY_THRESHOLD_PKR - subtotalPkr,
  );

  const isCod = paymentMethod === PaymentMethod.COD;
  const codFeePkr = isCod ? customCodFee : 0;
  const savingsOnlinePaymentPkr = isCod ? 0 : customCodFee;

  // Coupon discount is subtracted from subtotal (before shipping/cod)
  const effectiveSubtotal = Math.max(0, subtotalPkr - couponDiscountPkr);
  const totalPkr = effectiveSubtotal + shippingPkr + codFeePkr;

  const itemBreakdowns = items.map((item) => {
    const grossAmountPkr = item.unitPricePkr * item.quantity;
    const commissionRatePercentage =
      item.sellerType === SellerType.FIRST_PARTY
        ? 0
        : (item.commissionRatePercentage ??
          MARKETPLACE_CONFIG.DEFAULT_COMMISSION_PERCENTAGE);

    const wawCommissionPkr =
      item.sellerType === SellerType.FIRST_PARTY
        ? 0
        : Math.round((grossAmountPkr * commissionRatePercentage) / 100);

    const sellerPayoutPkr =
      item.sellerType === SellerType.FIRST_PARTY
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
    totalPkr,
    savingsOnlinePaymentPkr,
    itemBreakdowns,
  };
}
