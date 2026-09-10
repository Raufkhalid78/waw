-- Migration 041: Webhook event state machine
-- The xpay_webhooks_log previously served as a pure idempotency guard: any
-- insert conflict meant "already processed". That burned REJECTED events —
-- a wrong-amount callback consumed the transaction_id, so a corrected retry
-- with the same transaction_id was ignored and the order never settled.
--
-- This migration introduces an explicit per-event processing status:
--   received  — event logged, processing in progress
--   applied   — event verified and payment state transition committed
--   rejected  — event failed verification (amount/currency/order mismatch);
--               a corrected retry with the same transaction_id may replace it
--
-- The unique constraint on (transaction_id, attempt) allows multiple attempts
-- while idempotency now keys on APPLIED events only.

-- 1. Add status + rejection metadata
ALTER TABLE xpay_webhooks_log
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS payload_hash TEXT,
  ADD COLUMN IF NOT EXISTS attempt INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Backfill: every pre-existing row was terminal-applied under the old
--    semantics (insert conflict == already processed).
UPDATE xpay_webhooks_log
  SET status = 'applied'
  WHERE status NOT IN ('applied', 'received', 'rejected');

-- 3. Replace the flat unique constraint with one scoped to non-rejected
--    events. Rejected events no longer occupy their transaction_id slot.
ALTER TABLE xpay_webhooks_log
  DROP CONSTRAINT IF EXISTS uq_xpay_webhooks_log_transaction_id;
ALTER TABLE xpay_webhooks_log
  DROP CONSTRAINT IF EXISTS xpay_webhooks_log_transaction_id_key;
ALTER TABLE xpay_webhooks_log
  DROP CONSTRAINT IF EXISTS xpay_webhooks_log_transaction_id_status_key;
ALTER TABLE xpay_webhooks_log
  ADD CONSTRAINT xpay_webhooks_log_transaction_id_status_key
  UNIQUE (transaction_id, status, attempt)
  DEFERRABLE INITIALLY IMMEDIATE;

-- 4. Partial unique index: at most ONE applied/received row per transaction.
--    Two rejected rows with different attempt numbers are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_xpay_webhooks_active_per_tx
  ON xpay_webhooks_log (transaction_id)
  WHERE status IN ('applied', 'received');

-- 5. Index for the reconciliation sweep that re-alerts on rejected events.
CREATE INDEX IF NOT EXISTS idx_xpay_webhooks_rejected
  ON xpay_webhooks_log (status, created_at)
  WHERE status = 'rejected';

-- 6. Payment events ledger for refunds: every refund execution references
--    the provider event that authorized it.
CREATE TABLE IF NOT EXISTS refund_executions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  return_request_id TEXT REFERENCES return_requests(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_refund_id TEXT UNIQUE,
  amount_pkr NUMERIC(12,2) NOT NULL CHECK (amount_pkr > 0),
  currency TEXT NOT NULL DEFAULT 'PKR',
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SUBMITTED','COMPLETED','FAILED','MANUAL_REVIEW')),
  failure_reason TEXT,
  provider_response JSONB,
  idempotency_key TEXT UNIQUE NOT NULL,
  executed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE refund_executions ENABLE ROW LEVEL SECURITY;

-- Service role only — refund execution is performed exclusively by the API
-- worker / admin approval flow, never directly by clients.
REVOKE ALL ON refund_executions FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_refund_executions_order
  ON refund_executions (order_id, status);

CREATE INDEX IF NOT EXISTS idx_refund_executions_pending_review
  ON refund_executions (status, created_at)
  WHERE status IN ('PENDING', 'FAILED', 'MANUAL_REVIEW');
