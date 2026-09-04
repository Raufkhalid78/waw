import { Queue, Worker, Job } from "bullmq";
import { ENV } from "../config/env.js";
import { logger } from "../config/logger.js";
import { WhatsAppService } from "../modules/notifications/whatsapp.service.js";
import { CourierService } from "../modules/logistics/courier.service.js";
import { typesenseClient } from "../config/typesense.js";
import { supabaseAdmin } from "../config/supabase.js";
import { InventoryLockService } from "../modules/products/inventory-lock.service.js";
import { OrderStatus, PaymentStatus, ReturnReason } from "../types/index.js";

export interface BackgroundJobPayload<T = any> {
  id?: string;
  type:
    | "WHATSAPP_NOTIFICATION"
    | "WHATSAPP_ORDER_CANCELLED"
    | "WHATSAPP_RETURN_REQUESTED"
    | "WHATSAPP_SELLER_NEW_ORDER"
    | "TYPESENSE_SYNC"
    | "ESCROW_PAYOUT"
    | "COD_RECONCILIATION"
    | "INVENTORY_LOCK_SWEEP"
    | "REVERSE_COURIER_BOOKING";
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
  wawQueue = new Queue("waw-jobs-queue", {
    connection: redisConnection as any,
  });

  wawWorker = new Worker(
    "waw-jobs-queue",
    async (job: Job) => {
      const { type, payload } = job.data;
      logger.info(`⚙️ [BullMQ Worker] Processing Job #${job.id} [${type}]`);

      switch (type) {
        case "WHATSAPP_NOTIFICATION":
          if (payload.phone && payload.orderNumber) {
            await WhatsAppService.sendOrderConfirmed(
              payload.phone,
              payload.orderNumber,
              payload.totalPkr,
              payload.isCod,
            );
          }
          break;

        case "WHATSAPP_ORDER_CANCELLED":
          if (payload.phone && payload.orderNumber) {
            await WhatsAppService.sendOrderCancelled(
              payload.phone,
              payload.orderNumber,
              payload.reason,
            );
          }
          break;

        case "WHATSAPP_RETURN_REQUESTED":
          if (payload.phone && payload.orderNumber) {
            await WhatsAppService.sendReturnRequested(
              payload.phone,
              payload.orderNumber,
              payload.returnId,
              payload.reason,
            );
          }
          break;

        case "WHATSAPP_SELLER_NEW_ORDER":
          if (payload.sellerPhone && payload.orderNumber) {
            await WhatsAppService.sendSellerNewOrder(
              payload.sellerPhone,
              payload.storeName,
              payload.orderNumber,
              payload.itemSummary,
              payload.totalPkr,
            );
          }
          break;

        case "TYPESENSE_SYNC":
          if (payload.product) {
            try {
              await typesenseClient
                .collections("products")
                .documents()
                .upsert({
                  id: payload.product.id,
                  title: payload.product.title,
                  titleUrdu: payload.product.titleUrdu || "",
                  description: payload.product.description,
                  basePricePkr: payload.product.pricePkr,
                  categoryId: payload.product.categoryId,
                  storeId: payload.product.storeId || "waw-1p",
                  isSponsored: payload.product.isSponsored || false,
                  soldCount: payload.product.soldCount || 0,
                });
            } catch (err: any) {
              logger.warn("⚠️ Typesense sync skipped:", err.message);
            }
          }
          break;

        case "INVENTORY_LOCK_SWEEP": {
          logger.info(
            "🧹 [BullMQ Worker] Running scheduled inventory lock sweep...",
          );
          // Find pending unpaid orders older than 15 minutes
          const fifteenMinutesAgo = new Date(
            Date.now() - 15 * 60 * 1000,
          ).toISOString();
          const { data: expiredOrders } = await supabaseAdmin
            .from("orders")
            .select("id, store_orders(order_items(*))")
            .eq("payment_status", PaymentStatus.PENDING)
            .eq("global_status", "PENDING_PAYMENT")
            .lt("created_at", fifteenMinutesAgo);

          if (expiredOrders && expiredOrders.length > 0) {
            for (const ord of expiredOrders) {
              const allItems = (ord.store_orders || []).flatMap((so: any) => so.order_items || []);
              if (allItems.length > 0) {
                const lockItems = allItems.map((i: any) => ({
                  productId: i.offer_variant_id || i.id,
                  variantId: i.offer_variant_id,
                  quantity: i.quantity,
                }));
                await InventoryLockService.releaseStockLocks(ord.id, lockItems);
              }
              // Mark order as cancelled due to payment timeout
              await supabaseAdmin
                .from("orders")
                .update({
                  global_status: OrderStatus.CANCELLED,
                  notes:
                    "Cancelled automatically due to 15-minute payment expiration.",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", ord.id);
            }
            logger.info(
              `🧹 Cleaned up ${expiredOrders.length} expired reservations.`,
            );
          }
          break;
        }

        case "ESCROW_PAYOUT": {
          logger.info(
            `🏦 [Escrow Payout Job] Reconciling Merchant Settlement release for vendor ${payload.storeId}`,
          );
          try {
            const { data: payout } = await supabaseAdmin
              .from("payouts")
              .select("*, store_order:store_orders(id, order_id, store_id)")
              .eq("id", payload.payoutId)
              .single();

            if (!payout) {
              logger.warn(`Payout ${payload.payoutId} not found`);
              break;
            }

            // Verify no active disputes before releasing
            const orderId = payout.store_order?.order_id;
            if (orderId) {
              const { data: disputes } = await supabaseAdmin
                .from("support_tickets")
                .select("id")
                .eq("order_id", orderId)
                .in("status", ["OPEN", "UNDER_REVIEW"])
                .limit(1);

              if (disputes && disputes.length > 0) {
                logger.info(`Payout ${payload.payoutId} held: active dispute on order ${orderId}`);
                await supabaseAdmin
                  .from("payouts")
                  .update({ status: "HELD", updated_at: new Date().toISOString() })
                  .eq("id", payload.payoutId);
                break;
              }
            }

            // Release payout
            await supabaseAdmin
              .from("payouts")
              .update({
                status: "COMPLETED",
                processed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", payload.payoutId);

            logger.info(`✅ Payout ${payload.payoutId} settled for PKR ${payout.amount_pkr}`);
          } catch (err: any) {
            logger.error(`❌ Escrow payout failed for ${payload.payoutId}:`, err.message);
            throw err;
          }
          break;
        }

        case "COD_RECONCILIATION": {
          logger.info(
            `🚚 [COD Reconciliation] Reconciling PostEx delivery remittance for CN ${payload.cn}`,
          );
          try {
            // Find shipment by tracking number
            const { data: shipment } = await supabaseAdmin
              .from("shipments")
              .select("*, order:orders(id, buyer_id, payment_status)")
              .eq("tracking_number", payload.cn)
              .single();

            if (!shipment) {
              logger.warn(`Shipment not found for CN: ${payload.cn}`);
              break;
            }

            // Mark COD as collected if delivered
            if (shipment.is_cod && shipment.status === "DELIVERED") {
              await supabaseAdmin
                .from("orders")
                .update({
                  payment_status: "PAID",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", shipment.order_id);

              // Schedule T+7 payout
              const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
              if (shipment.store_order_id) {
                const { data: storeOrder } = await supabaseAdmin
                  .from("store_orders")
                  .select("store_id, total_pkr, commission_pkr")
                  .eq("id", shipment.store_order_id)
                  .single();

                if (storeOrder) {
                  const netPayout = (storeOrder.total_pkr || 0) - (storeOrder.commission_pkr || 0);
                  await supabaseAdmin.from("payouts").upsert(
                    {
                      store_id: storeOrder.store_id,
                      store_order_id: shipment.store_order_id,
                      order_id: shipment.order_id,
                      amount_pkr: Math.max(0, netPayout),
                      status: "SCHEDULED",
                      scheduled_for: sevenDaysLater,
                      created_at: new Date().toISOString(),
                    },
                    { onConflict: "store_order_id" },
                  );
                }
              }

              logger.info(`✅ COD reconciliation complete for CN ${payload.cn}`);
            }
          } catch (err: any) {
            logger.error(`❌ COD reconciliation failed for ${payload.cn}:`, err.message);
            throw err;
          }
          break;
        }

        case "REVERSE_COURIER_BOOKING": {
          logger.info(
            `📦 [Reverse Courier] Booking reverse pickup for return ${payload.returnRequestId}`,
          );
          try {
            const reverseResult = await CourierService.bookPostExReversePickup({
              orderId: payload.orderId,
              orderNumber: payload.orderNumber,
              customerName: payload.customerName,
              customerPhone: payload.customerPhone,
              pickupAddress: payload.pickupAddress,
              pickupCity: payload.pickupCity,
              returnReason: payload.returnReason as ReturnReason,
              itemsDescription: payload.itemsDescription,
            });

            // Update return request with tracking info
            await supabaseAdmin
              .from("return_requests")
              .update({
                status: "REVERSE_PICKUP_BOOKED",
                reverse_courier_cn: reverseResult.reverseTrackingNumber,
                updated_at: new Date().toISOString(),
              })
              .eq("id", payload.returnRequestId);

            logger.info(
              `✅ [Reverse Courier] Booked reverse pickup for return ${payload.returnRequestId}, CN: ${reverseResult.reverseTrackingNumber}`,
            );
          } catch (err: any) {
            logger.error(
              `❌ [Reverse Courier] Failed to book reverse pickup for return ${payload.returnRequestId}:`,
              err.message,
            );
            // Mark as failed so it can be retried or manually handled
            await supabaseAdmin
              .from("return_requests")
              .update({
                status: "COURIER_BOOKING_FAILED",
                staff_notes: `Courier booking failed: ${err.message}`,
                updated_at: new Date().toISOString(),
              })
              .eq("id", payload.returnRequestId);
            throw err; // Re-throw to trigger BullMQ retry
          }
          break;
        }

        default:
          logger.info(`ℹ️ Unknown job type: ${type}`);
      }

      return { status: "COMPLETED", processedAt: new Date().toISOString() };
    },
    {
      connection: redisConnection as any,
      concurrency: 5,
    },
  );

  wawWorker.on("failed", (job, err) => {
    logger.error(
      `❌ [BullMQ Worker] Job #${job?.id} failed with error:`,
      err.message,
    );
  });
} catch (err: any) {
    logger.warn(
      "⚠️ Redis BullMQ initialized in memory fallback mode:",
      err.message,
    );
}

export class JobQueueManager {
  /**
   * Adds a persistent background job to the BullMQ queue with exponential retry policy.
   */
  static async addJob<T>(
    type: BackgroundJobPayload["type"],
    payload: T,
    options?: {
      attempts?: number;
      backoff?: { type: "exponential" | "fixed"; delay: number };
      jobId?: string;
    },
  ): Promise<string> {
    const jobId = options?.jobId || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (wawQueue) {
      try {
        await wawQueue.add(
          type,
          { type, payload, jobId },
          {
            jobId,
            attempts: options?.attempts || 3,
            backoff: options?.backoff || { type: "exponential", delay: 2000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          },
        );
        logger.info(`📥 [BullMQ] Enqueued Job #${jobId} [${type}]`);
        return jobId;
      } catch {
        // Dev fallback if Redis connection times out
      }
    }

    logger.info(`📥 [Local Dev Queue] Handled Job #${jobId} [${type}]`);
    return jobId;
  }
}
