import { SubscriptionService } from "../modules/subscriptions/subscription.service.js";
import { logger } from "../config/logger.js";
import { ADVISORY_LOCKS } from "../config/advisory-locks.js";
import { supabaseAdmin } from "../config/supabase.js";

/**
 * Subscription Expiry Worker
 *
 * Hourly: downgrades stores whose subscription_expires_at has passed:
 *   1. Marks ACTIVE seller_subscriptions as EXPIRED
 *   2. Downgrades the store to the Free plan (subscription_active stays true)
 *
 * Uses a PostgreSQL advisory lock to prevent duplicate execution across replicas.
 */

async function acquireLock(): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("pg_try_advisory_lock", {
    lock_key: ADVISORY_LOCKS.SUBSCRIPTION_EXPIRY,
  });
  if (error) {
    logger.warn("Failed to acquire subscription expiry lock", { error: error.message });
    return false;
  }
  return data === true;
}

async function releaseLock(): Promise<void> {
  try {
    await supabaseAdmin.rpc("pg_advisory_unlock", {
      lock_key: ADVISORY_LOCKS.SUBSCRIPTION_EXPIRY,
    });
  } catch {
    // Lock auto-releases on connection close
  }
}

export async function runSubscriptionExpiry(): Promise<void> {
  const locked = await acquireLock();
  if (!locked) return;

  try {
    const expiredCount = await SubscriptionService.expireSubscriptions();
    if (expiredCount > 0) {
      logger.info(`Subscription Expiry Worker: downgraded ${expiredCount} store(s) to Free`);
    }
  } catch (err: any) {
    logger.error("Subscription expiry failed:", err.message);
  } finally {
    await releaseLock();
  }
}

export function startSubscriptionExpiryCron() {
  logger.info("Subscription Expiry Worker Initialized (hourly, distributed-lock enabled)");

  // Run every hour
  setInterval(async () => {
    await runSubscriptionExpiry();
  }, 60 * 60 * 1000);

  // Also run shortly after startup
  setTimeout(async () => {
    await runSubscriptionExpiry();
  }, 30 * 1000);
}
