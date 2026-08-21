import { prisma } from '../../config/supabase.js';
import { calculateOrderSummary, OrderItemPricingInput, OrderStatus, PaymentMethod, PaymentStatus, SellerType } from '@waw/types';
import { WhatsAppService } from '../notifications/whatsapp.service.js';
import { CourierService } from '../logistics/courier.service.js';

export interface CreateOrderInput {
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
  }[];
}

export class OrderService {
  /**
   * Places an order, calculates exact pricing (Free Shipping > 5000 PKR, COD fee +100 PKR),
   * splits lines across sellers, and triggers WhatsApp confirmation.
   */
  static async createOrder(input: CreateOrderInput) {
    // 1. Fetch products & variants from DB to prevent client price tampering
    const productIds = input.items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { store: true, variants: true },
    });

    const pricingItems: OrderItemPricingInput[] = input.items.map((item) => {
      const prod = dbProducts.find((p) => p.id === item.productId);
      if (!prod) throw new Error(`Product ${item.productId} not found`);

      let unitPrice = prod.basePricePkr;
      if (item.variantId) {
        const variant = prod.variants.find((v) => v.id === item.variantId);
        if (variant) unitPrice = variant.pricePkr;
      }

      return {
        productId: prod.id,
        variantId: item.variantId,
        sellerId: prod.storeId,
        sellerType: prod.isFirstParty || !prod.storeId ? SellerType.FIRST_PARTY : SellerType.THIRD_PARTY,
        commissionRatePercentage: prod.store?.commissionRatePercentage ?? 10,
        unitPricePkr: unitPrice,
        quantity: item.quantity,
      };
    });

    // 2. Run the deterministic pricing calculation
    const summary = calculateOrderSummary(pricingItems, input.paymentMethod);

    // 3. Generate human-readable order number e.g. WAW-PK-83921
    const orderNumber = `WAW-${Math.floor(100000 + Math.random() * 900000)}`;

    const isCod = input.paymentMethod === PaymentMethod.COD;
    const initialPaymentStatus = isCod ? PaymentStatus.COD_PENDING : PaymentStatus.PENDING;
    const initialOrderStatus = isCod ? OrderStatus.CONFIRMED : OrderStatus.PENDING;

    // 4. Save Order & OrderItems in PostgreSQL
    const order = await prisma.order.create({
      data: {
        orderNumber,
        buyerId: input.buyerId,
        buyerName: input.buyerName,
        buyerPhone: input.buyerPhone,
        shippingAddress: input.shippingAddress,
        shippingCity: input.shippingCity,
        shippingProvince: input.shippingProvince,
        subtotalPkr: summary.subtotalPkr,
        shippingFeePkr: summary.shippingPkr,
        codFeePkr: summary.codFeePkr,
        totalPkr: summary.totalPkr,
        paymentMethod: input.paymentMethod,
        paymentStatus: initialPaymentStatus,
        orderStatus: initialOrderStatus,
        notes: input.notes,
        items: {
          create: summary.itemBreakdowns.map((b) => {
            const prod = dbProducts.find((p) => p.id === b.productId)!;
            const variant = b.variantId ? prod.variants.find((v) => v.id === b.variantId) : undefined;
            const quantity = input.items.find((i) => i.productId === b.productId)?.quantity || 1;

            return {
              productId: b.productId,
              variantId: b.variantId,
              storeId: b.sellerId,
              sellerType: b.sellerType,
              unitPricePkr: Math.round(b.grossAmountPkr / quantity),
              quantity,
              totalPricePkr: b.grossAmountPkr,
              wawCommissionPkr: b.wawCommissionPkr,
              sellerPayoutPkr: b.sellerPayoutPkr,
              status: initialOrderStatus,
            };
          }),
        },
      },
      include: { items: true },
    });

    // 5. If COD, automatically book courier (PostEx/Leopards) & dispatch WhatsApp confirmation
    if (isCod) {
      await CourierService.bookCourierShipment(order.id, input.shippingCity, summary.totalPkr, true);
      await WhatsAppService.sendOrderConfirmed(input.buyerPhone, orderNumber, summary.totalPkr, true);
    }

    return { order, summary };
  }

  /**
   * Fetches order by orderNumber or ID.
   */
  static async getOrder(orderIdOrNumber: string) {
    return prisma.order.findFirst({
      where: {
        OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
      },
      include: {
        items: {
          include: { product: true, store: true },
        },
        shipments: true,
        payments: true,
      },
    });
  }
}
