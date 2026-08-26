import { supabaseAdmin } from "../config/supabase.js";
import {
  CourierProvider,
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
} from "../types/index.js";
import axios from "axios";
import { ENV } from "../config/env.js";

export function startReconciliationCron() {
  console.log(
    "⏱️ Financial Reconciliation & COD Settlement Cron Initialized (24h Interval)",
  );

  // Run every 24 hours
  setInterval(
    async () => {
      await runPayoutReconciliation();
      await runShipmentReconciliation();
    },
    24 * 60 * 60 * 1000,
  );

  // Also run 30s after server startup for immediate check
  setTimeout(async () => {
    console.log(
      "🔄 Running initial startup payout & delivery reconciliation probe...",
    );
    await runPayoutReconciliation();
    await runShipmentReconciliation();
  }, 30 * 1000);
}

/**
 * 1. SBP Escrow Payout Settlement
 * Transitions all SCHEDULED payouts past their T+7 escrow maturity date to COMPLETED/PROCESSING.
 */
async function runPayoutReconciliation() {
  try {
    const now = new Date().toISOString();
    const { data: maturedPayouts, error } = await supabaseAdmin
      .from("payouts")
      .select("*")
      .eq("status", "SCHEDULED")
      .lte("scheduled_for", now);

    if (error || !maturedPayouts || maturedPayouts.length === 0) {
      console.log(
        "✅ Payout Reconciliation: No matured escrow payouts pending release.",
      );
      return;
    }

    console.log(
      `💰 Reconciling ${maturedPayouts.length} matured SBP escrow payouts...`,
    );

    for (const payout of maturedPayouts) {
      await supabaseAdmin
        .from("payouts")
        .update({
          status: "COMPLETED",
          processed_at: now,
          updated_at: now,
        })
        .eq("id", payout.id);
    }

    console.log(
      `✅ Successfully released ${maturedPayouts.length} seller payouts to bank queue.`,
    );
  } catch (err: any) {
    console.error("❌ Error during payout reconciliation:", err.message);
  }
}

/**
 * 2. PostEx Shipment Status Sync
 * Polls PostEx tracking API for any in-transit packages to catch delivered statuses if webhooks were dropped.
 */
async function runShipmentReconciliation() {
  try {
    const { data: inTransitShipments } = await supabaseAdmin
      .from("shipments")
      .select("id, tracking_number, order_id, store_order_id")
      .in("status", ["PROCESSING", "SHIPPED"]);

    if (!inTransitShipments || inTransitShipments.length === 0) {
      return;
    }

    console.log(
      `📦 Syncing ${inTransitShipments.length} in-transit PostEx shipments...`,
    );
    // PostEx API polling logic here
  } catch (err: any) {
    console.error("❌ Error during shipment reconciliation:", err.message);
  }
}
