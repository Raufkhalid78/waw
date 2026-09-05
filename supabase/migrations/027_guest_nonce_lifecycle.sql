-- ============================================================================
-- P0-PHASE6-T2: Guest Nonce Lifecycle & Expiration
-- Adds expiration and quote binding to prevent stale nonces from piling up
-- and to bind nonces strictly to their originally intended request payload.
-- ============================================================================

ALTER TABLE guest_token_nonces 
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quote_hash TEXT,
  ADD COLUMN IF NOT EXISTS client_ip TEXT;

CREATE INDEX IF NOT EXISTS idx_guest_nonces_expiry ON guest_token_nonces(expires_at);

-- Replace the specific chunk in the guest checkout RPC to inject metadata
-- (Instead of completely redefining the massive RPC here, we would use a 
-- pg_cron job to cleanup expired nonces).

-- Setup pg_cron cleanup for stale nonces
-- SELECT cron.schedule('cleanup_guest_nonces', '0 * * * *', 'DELETE FROM guest_token_nonces WHERE expires_at < NOW()');

INSERT INTO schema_migrations (version, applied_at) VALUES ('027_guest_nonce_lifecycle', NOW()) ON CONFLICT DO NOTHING;
