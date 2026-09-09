-- Migration 046: Missing runtime objects
-- Objects the API uses that no prior migration defined. Without these:
--   * cart_abandonment upserts fail at runtime (checkout-start tracking)
--   * outbox claim falls back to a non-atomic select (duplicate dispatches)
--   * loyalty point awards fall back to a buggy overwriting upsert

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Cart abandonment tracking
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_abandonment (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  cart_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  checkout_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  recovered BOOLEAN NOT NULL DEFAULT false,
  recovered_at TIMESTAMPTZ,
  order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cart_abandonment ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cart_abandonment FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Outbox claim (FOR UPDATE SKIP LOCKED — no duplicate dispatches)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_outbox_events(p_batch_size INTEGER DEFAULT 50)
RETURNS TABLE (id TEXT, event_type TEXT, payload TEXT)
LANGUAGE sql
AS $$
  WITH claimed AS (
    SELECT o.id
    FROM outbox_events o
    WHERE o.status = 'PENDING'
    ORDER BY o.created_at ASC
    LIMIT GREATEST(p_batch_size, 1)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE outbox_events o
    SET status = 'PROCESSING',
        processed_at = NOW()
  FROM claimed
  WHERE o.id = claimed.id
  RETURNING o.id, o.event_type, o.payload::text AS payload;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Loyalty points (true increment, not overwrite)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_loyalty_points(
  p_user_id TEXT,
  p_points INTEGER
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO loyalty_points (user_id, points_balance, total_earned)
  VALUES (p_user_id, GREATEST(p_points, 0), GREATEST(p_points, 0))
  ON CONFLICT (user_id)
  DO UPDATE SET
    points_balance = loyalty_points.points_balance + GREATEST(p_points, 0),
    total_earned = loyalty_points.total_earned + GREATEST(p_points, 0),
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION claim_outbox_events(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION increment_loyalty_points(TEXT, INTEGER) TO service_role;
