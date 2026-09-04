import { supabaseAdmin } from "../config/supabase.js";
import {
  CourierProvider,
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
} from "../types/index.js";
import axios from "axios";
import { ENV, FEATURES } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AuditService } from "../modules/audit/audit.service.js";

export interface ReconciliationReport {
  payoutsSettled: number;
  payoutsHeld: number;
  shipmentsSynced: number;
  timestamp: string;
}

export function startReconciliationCron() {
  logger.info(
    "⏱️ Financial Reconciliation & COD Settlement Cron Initialized (24h Interval)",
  );

  // Run every 24 hours
  setInterval(
    async () => {
      await executeReconciliationJob();
    },
    24 * 60 * 60 * 1000,
  );

  // Also run 30s after server startup for immediate check
  setTimeout(async () => {
    logger.info(
      "🔄 Running initial startup payout & delivery reconciliation probe...",
    );
    await executeReconciliationJob();
  }, 30 * 1000);
}

/**
 * Executes a complete financial and shipment reconciliation cycle.
 * Can be triggered automatically by cron or on-demand by administrators.
 */
export async function executeReconciliationJob(): Promise<ReconciliationReport> {
  const payoutResult = await runPayoutReconciliation();
  const shipmentResult = await runShipmentReconciliation();

  return {
    payoutsSettled: payoutResult.settled,
    payoutsHeld: payoutResult.held,
    shipmentsSynced: shipmentResult.synced,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 1. Verified Merchant Milestone Payout Settlement
 * Transitions all SCHEDULED payouts past their T+7 return window maturity date to COMPLETED,
 * while strictly safeguarding funds if the order is under active dispute.
 */
async function runPayoutReconciliation(): Promise<{ settled: number; held: number }> {
  let settled = 0;
  let held = 0;

  try {
    const now = new Date().toISOString();
    const { data: maturedPayouts, error } = await supabaseAdmin
      .from("payouts")
      .select("*, store_order:store_orders(id, order_id, store_id)")
      .eq("status", "SCHEDULED")
      .lte("scheduled_for", now);

    if (error || !maturedPayouts || maturedPayouts.length === 0) {
      logger.info(
        "✅ Payout Reconciliation: No matured vendor payouts pending release.",
      );
      return { settled: 0, held: 0 };
    }

    logger.info(
      `💰 Reconciling ${maturedPayouts.length} matured merchant settlement payouts...`,
    );

    for (const payout of maturedPayouts) {
      const orderId = payout.order_id || payout.store_order?.order_id;
      let hasActiveDispute = false;

      // 1. Check for active dispute or return on the order
      if (orderId) {
        const [{ data: returns }, { data: tickets }] = await Promise.all([
          supabaseAdmin
            .from("return_requests")
            .select("id, status")
            .eq("order_id", orderId)
            .in("status", ["PENDING_REVIEW", "REVERSE_PICKUP_BOOKED", "RECEIVED"]),
          supabaseAdmin
            .from("support_tickets")
            .select("id, status")
            .eq("order_id", orderId)
            .in("status", ["OPEN", "UNDER_REVIEW"]),
        ]);

        if ((returns && returns.length > 0) || (tickets && tickets.length > 0)) {
          hasActiveDispute = true;
        }
      }

      if (hasActiveDispute) {
        // Freeze payout in escrow
        await supabaseAdmin
          .from("payouts")
          .update({
            status: PayoutStatus.HELD,
            updated_at: now,
          })
          .eq("id", payout.id);

        await AuditService.logAction({
          actorId: "RECONCILIATION_CRON",
          actorRole: "SYSTEM",
          action: "ESCROW_HOLD_PRESERVED",
          targetResourceType: "payout",
          targetResourceId: payout.id,
          reason: `Payout held because Order ${orderId} is under active dispute/return review`,
        });

        held++;
      } else {
        // Disburse matured payout
        await supabaseAdmin
          .from("payouts")
          .update({
            status: PayoutStatus.COMPLETED,
            processed_at: now,
            updated_at: now,
          })
          .eq("id", payout.id);

        await AuditService.logAction({
          actorId: "RECONCILIATION_CRON",
          actorRole: "SYSTEM",
          action: "PAYOUT_SETTLED_AUTOMATICALLY",
          targetResourceType: "payout",
          targetResourceId: payout.id,
          reason: `T+7 settlement matured for PKR ${payout.amount_pkr || 0}`,
        });

        settled++;
      }
    }

    logger.info(
      `✅ Payout Settlement Cycle Complete: ${settled} settled, ${held} held under dispute guard.`,
    );
  } catch (err: any) {
    logger.error("❌ Error during payout reconciliation:", err.message);
  }

  return { settled, held };
}

/**
 * 2. PostEx Shipment Status Sync
 * Polls PostEx tracking API for any in-transit packages to catch delivered statuses if webhooks were dropped.
 */
async function runShipmentReconciliation(): Promise<{ synced: number }> {
  let synced = 0;

  try {
    const { data: inTransitShipments } = await supabaseAdmin
      .from("shipments")
      .select("id, tracking_number, order_id, store_order_id, courier, is_cod, cod_amount_pkr")
      .in("status", ["PROCESSING", "SHIPPED"]);

    if (!inTransitShipments || inTransitShipments.length === 0) {
      return { synced: 0 };
    }

    logger.info(
      `📦 Syncing ${inTransitShipments.length} in-transit courier shipments...`,
    );

    const now = new Date().toISOString();
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const shipment of inTransitShipments) {
      // If live PostEx API is configured, query tracking
      if (
        FEATURES.COURIER_ENABLED &&
        shipment.courier === CourierProvider.POSTEX
      ) {
        try {
          const res = await axios.get(
            `${ENV.POSTEX_API_BASE || "https://api.postex.pk/services/integration/api"}/order/v1/track-order`,
            {
              params: { trackingNo: shipment.tracking_number },
              headers: { token: ENV.POSTEX_API_TOKEN },
              timeout: 5000,
            },
          );

          const statusString = res.data?.distStatus || res.data?.orderStatus || "";
          if (statusString.toLowerCase().includes("delivered")) {
            await handleDeliveredMilestone(shipment, now, sevenDaysLater);
            synced++;
          }
        } catch (err) {
          logger.warn("Failed to sync shipment milestone", { shipmentId: shipment.id, error: (err as Error).message });
        }
      }
    }
  } catch (err: any) {
    logger.error("❌ Error during shipment reconciliation:", err.message);
  }

  return { synced };
}

/**
 * Handles confirmed parcel delivery milestone: updates order, marks COD paid, and schedules T+7 payout.
 */
async function handleDeliveredMilestone(shipment: any, now: string, sevenDaysLater: string) {
  // 1. Update shipment
  await supabaseAdmin
    .from("shipments")
    .update({
      status: OrderStatus.DELIVERED,
      delivered_at: now,
      updated_at: now,
    })
    .eq("id", shipment.id);

  // 2. Update store order
  if (shipment.store_order_id) {
    await supabaseAdmin
      .from("store_orders")
      .update({
        status: OrderStatus.DELIVERED,
        updated_at: now,
      })
      .eq("id", shipment.store_order_id);
  }

  // 3. Update parent order
  if (shipment.order_id) {
    const updatePayload: any = {
      global_status: OrderStatus.DELIVERED,
      delivered_at: now,
      updated_at: now,
    };
    if (shipment.is_cod) {
      updatePayload.payment_status = PaymentStatus.PAID;
    }

    await supabaseAdmin
      .from("orders")
      .update(updatePayload)
      .eq("id", shipment.order_id);
  }

  // 4. Schedule T+7 Payout
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
          status: PayoutStatus.SCHEDULED,
          scheduled_for: sevenDaysLater,
          created_at: now,
        },
        { onConflict: "store_order_id" },
      );
    }
  }

  // 5. Emit live WebSocket milestone
  try {
    const { io } = await import("../server.js");
    io.to(`order:${shipment.order_id}`).emit("order_status_updated", {
      orderId: shipment.order_id,
      status: "DELIVERED",
      deliveredAt: now,
    });
  } catch (err) {
    logger.warn("Failed to emit delivery milestone event", { orderId: shipment.order_id, error: (err as Error).message });
  }
}
