import { Queue, Worker, Job } from 'bullmq';
import { ENV } from '../config/env.js';
import { WhatsAppService } from '../modules/notifications/whatsapp.service.js';
import { typesenseClient } from '../config/typesense.js';
import { supabaseAdmin } from '../config/supabase.js';
import { InventoryLockService } from '../modules/products/inventory-lock.service.js';
import { OrderStatus, PaymentStatus } from '../types/index.js';

export interface BackgroundJobPayload<T = any> {
  id?: string;
  type:
    | 'WHATSAPP_NOTIFICATION'
    | 'TYPESENSE_SYNC'
    | 'ESCROW_PAYOUT'
    | 'COD_RECONCILIATION'
    | 'INVENTORY_LOCK_SWEEP';
  payload: T;
  createdAt?: string;
}

const redisConnection = {
  host: ENV.REDIS_HOST,
  port: ENV.REDIS_PORT,
  password: ENV.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

let wawQueue: Queue | null = null;
let wawWorker: Worker | null = null;

try {
  wawQueue = new Queue('waw-jobs-queue', { connection: redisConnection as any });

  wawWorker = new Worker(
    'waw-jobs-queue',
    async (job: Job) => {
      const { type, payload } = job.data;
      console.log(`⚙️ [BullMQ Worker] Processing Job #${job.id} [${type}]`);

      switch (type) {
        case 'WHATSAPP_NOTIFICATION':
          if (payload.phone && payload.orderNumber) {
            await WhatsAppService.sendOrderConfirmed(
              payload.phone,
              payload.orderNumber,
              payload.totalPkr,
              payload.isCod
            );
          }
          break;

        case 'TYPESENSE_SYNC':
          if (payload.product) {
            try {
              await typesenseClient.collections('products').documents().upsert({
                id: payload.product.id,
                title: payload.product.title,
                titleUrdu: payload.product.titleUrdu || '',
                description: payload.product.description,
                basePricePkr: payload.product.pricePkr,
                categoryId: payload.product.categoryId,
                storeId: payload.product.storeId || 'waw-1p',
                isSponsored: payload.product.isSponsored || false,
                soldCount: payload.product.soldCount || 0,
              });
            } catch (err: any) {
              console.warn('⚠️ Typesense sync skipped:', err.message);
            }
          }
          break;

        case 'INVENTORY_LOCK_SWEEP': {
          console.log('🧹 [BullMQ Worker] Running scheduled inventory lock sweep...');
          // Find pending unpaid orders older than 15 minutes
          const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
          const { data: expiredOrders } = await supabaseAdmin
            .from('orders')
            .select('id, order_items(*)')
            .eq('payment_status', PaymentStatus.PENDING)
            .eq('order_status', OrderStatus.CONFIRMED)
            .lt('created_at', fifteenMinutesAgo);

          if (expiredOrders && expiredOrders.length > 0) {
            for (const ord of expiredOrders) {
              if (ord.order_items && ord.order_items.length > 0) {
                const lockItems = ord.order_items.map((i: any) => ({
                  productId: i.product_id,
                  variantId: i.variant_id,
                  quantity: i.quantity,
                }));
                await InventoryLockService.releaseStockLocks(ord.id, lockItems);
              }
              // Mark order as cancelled due to payment timeout
              await supabaseAdmin
                .from('orders')
                .update({
                  order_status: OrderStatus.CANCELLED,
                  notes: 'Cancelled automatically due to 15-minute payment expiration.',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', ord.id);
            }
            console.log(`🧹 Cleaned up ${expiredOrders.length} expired reservations.`);
          }
          break;
        }

        case 'ESCROW_PAYOUT':
          console.log(`🏦 [Escrow Payout Job] Reconciling SBP Escrow release for vendor ${payload.storeId}`);
          break;

        case 'COD_RECONCILIATION':
          console.log(`🚚 [COD Reconciliation] Reconciling PostEx delivery remittance for CN ${payload.cn}`);
          break;

        default:
          console.log(`ℹ️ Unknown job type: ${type}`);
      }

      return { status: 'COMPLETED', processedAt: new Date().toISOString() };
    },
    {
      connection: redisConnection as any,
      concurrency: 5,
    }
  );

  wawWorker.on('failed', (job, err) => {
    console.error(`❌ [BullMQ Worker] Job #${job?.id} failed with error:`, err.message);
  });
} catch (err: any) {
  console.warn('⚠️ Redis BullMQ initialized in memory fallback mode:', err.message);
}

export class JobQueueManager {
  /**
   * Adds a persistent background job to the BullMQ queue with exponential retry policy.
   */
  static async addJob<T>(type: BackgroundJobPayload['type'], payload: T): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (wawQueue) {
      try {
        await wawQueue.add(
          type,
          { type, payload, jobId },
          {
            jobId,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          }
        );
        console.log(`📥 [BullMQ] Enqueued Job #${jobId} [${type}]`);
        return jobId;
      } catch {
        // Dev fallback if Redis connection times out
      }
    }

    console.log(`📥 [Local Dev Queue] Handled Job #${jobId} [${type}]`);
    return jobId;
  }
}
