-- ============================================================================
-- WAW MARKETPLACE: Seller Subscription Tiers
-- ============================================================================
-- Free / Pro / Enterprise plans with feature gating.
-- ============================================================================

BEGIN;

-- 1. Subscription plans config
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price_pkr INTEGER NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  max_products INTEGER NOT NULL DEFAULT 10,
  max_images_per_product INTEGER NOT NULL DEFAULT 3,
  ai_descriptions BOOLEAN DEFAULT FALSE,
  advanced_analytics BOOLEAN DEFAULT FALSE,
  priority_support BOOLEAN DEFAULT FALSE,
  api_access BOOLEAN DEFAULT FALSE,
  featured_store BOOLEAN DEFAULT FALSE,
  commission_reduction NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Subscription history
-- NOTE: store_id is stores.id (TEXT) — canonical 001 schema uses TEXT ids.
-- plan_id is subscription_plans.id (TEXT) to match.
CREATE TABLE IF NOT EXISTS seller_subscriptions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2b. Subscription columns on stores used by subscription.service.ts and
-- the AI/description gating (subscription_plan / subscription_active) —
-- these were referenced by the API but never created by any migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE stores ADD COLUMN subscription_plan TEXT DEFAULT 'free';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'subscription_active'
  ) THEN
    ALTER TABLE stores ADD COLUMN subscription_active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE stores ADD COLUMN subscription_expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. Seed subscription plans
INSERT INTO subscription_plans (name, display_name, price_pkr, max_products, max_images_per_product, ai_descriptions, advanced_analytics, priority_support, api_access, featured_store, commission_reduction) VALUES
  ('free', 'Free', 0, 10, 3, FALSE, FALSE, FALSE, FALSE, FALSE, 0),
  ('pro', 'Pro', 4999, 100, 10, TRUE, TRUE, TRUE, FALSE, FALSE, 5),
  ('enterprise', 'Enterprise', 14999, 99999, 20, TRUE, TRUE, TRUE, TRUE, TRUE, 15)
ON CONFLICT (name) DO NOTHING;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_seller_subscriptions_store_id ON seller_subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_seller_subscriptions_status ON seller_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);

-- 6. RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Users can view own subscriptions"
  ON seller_subscriptions FOR SELECT
  USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()::TEXT)
  );

CREATE POLICY "Service role can manage subscriptions"
  ON seller_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
