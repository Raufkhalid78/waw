-- ============================================================================
-- WAW MARKETPLACE: Loyalty & Rewards Program
-- ============================================================================
-- Points earned on purchases, redeemed at checkout for discounts.
-- ============================================================================

BEGIN;

-- 1. Loyalty points balance per user
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_redeemed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Loyalty transaction ledger
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('EARN', 'REDEEM', 'EXPIRE', 'ADJUSTMENT')),
  points INTEGER NOT NULL,
  order_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Loyalty settings in marketplace_settings
INSERT INTO marketplace_settings (key, value, description) VALUES
  ('loyalty_points_per_pkr', '10', 'Points earned per PKR 100 spent'),
  ('loyalty_redemption_rate', '0.5', 'PKR value per 1 point when redeeming'),
  ('loyalty_min_redeem', '100', 'Minimum points to redeem'),
  ('loyalty_max_redemption_pct', '30', 'Max order % payable with points')
ON CONFLICT (key) DO NOTHING;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id ON loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON loyalty_transactions(type);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(created_at DESC);

-- 5. RLS
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty points"
  ON loyalty_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own loyalty transactions"
  ON loyalty_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage loyalty points"
  ON loyalty_points FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage loyalty transactions"
  ON loyalty_transactions FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
