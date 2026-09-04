-- ============================================================================
-- P0-6: Durable checkout idempotency sessions
-- Replaces Redis-only quote consumption with a database-backed session
-- that survives restarts and provides atomic idempotency.
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_token TEXT NOT NULL,
  buyer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  buyer_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'committed', 'failed')),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  idempotency_key TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one committed session per quote token
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_sessions_quote_committed
  ON checkout_sessions (quote_token)
  WHERE status = 'committed';

-- Only one session per idempotency key
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_sessions_idempotency
  ON checkout_sessions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_expires
  ON checkout_sessions (expires_at)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Only service_role can access (API uses supabaseAdmin)
CREATE POLICY "service_role_full_access" ON checkout_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_checkout_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_checkout_sessions_updated_at
  BEFORE UPDATE ON checkout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_checkout_sessions_updated_at();
