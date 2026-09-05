/**
 * Advisory Lock Key Registry
 *
 * Centralised registry for all PostgreSQL pg_try_advisory_lock keys used by
 * background workers. Adding keys here prevents collisions between workers.
 *
 * Keys must be unique positive integers. Use a distinct range per service area.
 * Range plan:
 *   10000-19999  Financial / Payout workers
 *   20000-29999  Inventory / Fulfillment workers
 *   30000-39999  Notification / Outbox workers
 *   40000-49999  Reconciliation workers
 *   50000-59999  Reserved for future use
 */
export const ADVISORY_LOCKS = {
  // Payout & Financial
  RECONCILIATION:            10001,

  // Inventory
  INVENTORY_CLEANUP:         20001,

  // Notifications
  OUTBOX_PROCESSOR:          30001,
} as const satisfies Record<string, number>;

export type AdvisoryLockName = keyof typeof ADVISORY_LOCKS;
