-- Migration 044: Push notification device tokens (FCM)
-- One row per device. Tokens are registered by authenticated clients via
-- POST /api/push/tokens and removed on logout / invalidation. Sends use the
-- Firebase HTTP v1 API (service-account JWT) and are feature-flagged:
-- without FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY no push is sent.

CREATE TABLE IF NOT EXISTS device_tokens (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Service role only — clients never query the token table directly; they
-- register/remove their own token through the API, which enforces ownership.
REVOKE ALL ON device_tokens FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_device_tokens_user
  ON device_tokens (user_id);
