-- Migration 043: Courier booking retry bookkeeping
-- Shipments whose PostEx booking failed are persisted as BOOKING_PENDING
-- with NO tracking number (a fabricated CN must never reach a buyer).
-- booking_attempts drives the reconciliation retry sweep; after
-- MAX_BOOKING_ATTEMPTS the shipment dead-letters for manual dispatch.

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS booking_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_shipments_booking_pending
  ON shipments (booking_attempts, updated_at)
  WHERE status = 'BOOKING_PENDING';
