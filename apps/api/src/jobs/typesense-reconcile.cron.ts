import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../config/logger.js";
import { ADVISORY_LOCKS } from "../config/advisory-locks.js";
import { reconcileTypesenseIndex } from "../modules/search/typesense-sync.service.js";

const TYPESENSE_RECONCILE_LOCK_KEY = ADVISORY_LOCKS.TYPESENSE_RECONCILE;

async function acquireReconcileLock(): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("pg_try_advisory_lock", {
    lock_key: TYPESENSE_RECONCILE_LOCK_KEY,
  });
  if (error) {
    logger.warn("Failed to acquire Typesense reconcile lock, skipping", { error: error.message });
    return false;
  }
  return data === true;
}

async function releaseReconcileLock(): Promise<void> {
  try {
    await supabaseAdmin.rpc("pg_advisory_unlock", {
      lock_key: TYPESENSE_RECONCILE_LOCK_KEY,
    });
  } catch {
    // Lock auto-releases on connection close
  }
}

export async function executeTypesenseReconcile() {
  if (!(await acquireReconcileLock())) return;
  try {
    const report = await reconcileTypesenseIndex();
    logger.info("🧹 Typesense reconcile completed", { report });
  } catch (err: any) {
    logger.error("Typesense reconcile failed:", err?.message || err);
  } finally {
    await releaseReconcileLock();
  }
}

export function startTypesenseReconcileCron() {
  logger.info("⏱️ Typesense Reconcile Cron Initialized (Hourly, Distributed-Lock Enabled)");

  // Run immediately on boot (backfill after deploy), then hourly.
  executeTypesenseReconcile();
  setInterval(executeTypesenseReconcile, 60 * 60 * 1000);
}
