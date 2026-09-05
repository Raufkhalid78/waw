-- ============================================================================
-- P0-PHASE4-T3: Guest Token Nonces
-- Cryptographic nonce registry to prevent guest checkout session replays.
-- ============================================================================

CREATE TABLE IF NOT EXISTS guest_token_nonces (
  nonce TEXT PRIMARY KEY,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: We will modify 019_guest_checkout_rpc.sql separately to insert the nonce.

INSERT INTO schema_migrations (version, applied_at) VALUES ('025_guest_token_nonces', NOW()) ON CONFLICT DO NOTHING;
