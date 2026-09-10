-- ============================================================================
-- WAW MARKETPLACE: Referral Program
-- ============================================================================
-- Users share referral codes, both referrer and referred get rewards.
-- ============================================================================

BEGIN;

-- 1. Referral codes (one per user)
-- NOTE: user_id is profiles.id (TEXT) — see 013 note.
CREATE TABLE IF NOT EXISTS referral_codes (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Referral tracking
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  referrer_user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'REWARDED')),
  reward_pkr INTEGER DEFAULT 0,
  referred_user_order_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 3. Referral settings
INSERT INTO marketplace_settings (key, value, description) VALUES
  ('referral_reward_referrer_pkr', '200', 'Reward PKR for the referrer'),
  ('referral_reward_referred_pkr', '100', 'Reward PKR for the referred user'),
  ('referral_min_order_pkr', '500', 'Minimum order amount to trigger referral reward'),
  ('referral_max_rewards', '50', 'Max referral rewards per user')
ON CONFLICT (key) DO NOTHING;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_user_id ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- 5. RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral code"
  ON referral_codes FOR SELECT
  USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  USING (auth.uid()::TEXT = referrer_user_id OR auth.uid()::TEXT = referred_user_id);

CREATE POLICY "Service role can manage referral codes"
  ON referral_codes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage referrals"
  ON referrals FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
