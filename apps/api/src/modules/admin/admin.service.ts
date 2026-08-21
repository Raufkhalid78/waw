import { prisma } from '../../config/supabase.js';
import { PayoutStatus, StoreStatus } from '@waw/types';

export class AdminService {
  /**
   * Calculates overall platform metrics and financials.
   */
  static async getPlatformStats() {
    const [totalOrders, totalSellers, totalProducts, orders] = await Promise.all([
      prisma.order.count(),
      prisma.store.count(),
      prisma.product.count(),
      prisma.order.findMany({
        select: {
          totalPkr: true,
          subtotalPkr: true,
          codFeePkr: true,
          paymentStatus: true,
          orderStatus: true,
          createdAt: true,
        },
      }),
    ]);

    const gmvPkr = orders.reduce((sum, o) => sum + o.totalPkr, 0);
    const codFeesCollectedPkr = orders.reduce((sum, o) => sum + o.codFeePkr, 0);

    const orderItems = await prisma.orderItem.findMany({
      select: { wawCommissionPkr: true, sellerPayoutPkr: true },
    });

    const totalCommissionsPkr = orderItems.reduce((sum, i) => sum + i.wawCommissionPkr, 0);

    return {
      gmvPkr,
      totalOrders,
      totalSellers,
      totalProducts,
      totalCommissionsPkr,
      codFeesCollectedPkr,
      netPlatformRevenuePkr: totalCommissionsPkr + codFeesCollectedPkr,
    };
  }

  /**
   * Lists sellers with pending KYC verification.
   */
  static async listSellers(status?: StoreStatus) {
    return prisma.store.findMany({
      where: status ? { status } : undefined,
      include: {
        owner: { select: { fullName: true, phone: true, email: true } },
        _count: { select: { products: true, orderItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Approves or rejects seller KYC and sets custom commission rate.
   */
  static async updateSellerStatus(storeId: string, status: StoreStatus, commissionRatePercentage?: number) {
    return prisma.store.update({
      where: { id: storeId },
      data: {
        status,
        commissionRatePercentage: commissionRatePercentage !== undefined ? commissionRatePercentage : undefined,
      },
    });
  }

  /**
   * Lists all payouts with status and bank details.
   */
  static async listPayouts() {
    return prisma.payout.findMany({
      include: {
        store: { select: { name: true, bankName: true, bankAccountNumber: true, bankAccountTitle: true } },
      },
      orderBy: { scheduledFor: 'desc' },
    });
  }

  /**
   * Approves and marks a payout as settled.
   */
  static async settlePayout(payoutId: string, bankReference: string) {
    return prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.PAID,
        bankReference,
        settledAt: new Date(),
      },
    });
  }
}
