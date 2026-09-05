-- ============================================================================
-- WAW MARKETPLACE: Critical Security & Schema Fixes (Phase 1)
-- ============================================================================
-- Run AFTER migration 015.
-- ============================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. ADD IDEMPOTENCY_KEY TO ORDERS (fixes checkout_transaction_rpc)
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE orders ADD COLUMN idempotency_key TEXT UNIQUE;
    RAISE NOTICE 'Added orders.idempotency_key';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. ENABLE RLS ON TABLES THAT ARE MISSING IT
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. ADD RLS POLICIES TO TABLES WITH RLS ENABLED BUT NO POLICIES
-- ──────────────────────────────────────────────────────────────────────────────

-- category_schemas: admin can manage, anyone can read
CREATE POLICY "Admin can manage category schemas"
  ON category_schemas FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view category schemas"
  ON category_schemas FOR SELECT
  USING (true);

-- serviceable_cities: admin can manage, anyone can read
CREATE POLICY "Admin can manage serviceable cities"
  ON serviceable_cities FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can view serviceable cities"
  ON serviceable_cities FOR SELECT
  USING (true);

-- flash_sales: admin can manage, anyone can read active
CREATE POLICY "Admin can manage flash sales"
  ON flash_sales FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can view active flash sales"
  ON flash_sales FOR SELECT
  USING (is_active = true OR auth.role() = 'service_role');

-- flash_sale_items: admin can manage, anyone can read
CREATE POLICY "Admin can manage flash sale items"
  ON flash_sale_items FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can view flash sale items"
  ON flash_sale_items FOR SELECT
  USING (true);

-- shipments: admin and store owners can manage, buyers can view their shipments
CREATE POLICY "Admin can manage shipments"
  ON shipments FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Store owners can view own shipments"
  ON shipments FOR SELECT
  USING (
    store_order_id IN (
      SELECT so.id FROM store_orders so
      JOIN stores s ON s.id = so.store_id
      WHERE s.owner_id = auth.uid()
    )
  );

-- xpay_webhooks_log: admin can manage, no public access
CREATE POLICY "Admin can manage xpay webhooks"
  ON xpay_webhooks_log FOR ALL
  USING (auth.role() = 'service_role');

-- outbox_events: admin can manage, no public access
CREATE POLICY "Admin can manage outbox events"
  ON outbox_events FOR ALL
  USING (auth.role() = 'service_role');

-- order_items: buyers can view their order items, admin/service can manage
CREATE POLICY "Admin can manage order items"
  ON order_items FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Buyers can view own order items"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE buyer_id = auth.uid()
    )
  );

-- schema_migrations: admin only
CREATE POLICY "Admin can view schema migrations"
  ON schema_migrations FOR SELECT
  USING (auth.role() = 'service_role');

-- ai_usage: users can view own usage, admin can view all
CREATE POLICY "Users can view own AI usage"
  ON ai_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admin can manage AI usage"
  ON ai_usage FOR ALL
  USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. FIX STORES RLS: Add INSERT policy for store creation
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Sellers can create own store'
    AND tablename = 'stores'
  ) THEN
    CREATE POLICY "Sellers can create own store"
      ON stores FOR INSERT
      WITH CHECK (owner_id = auth.uid());
    RAISE NOTICE 'Added stores INSERT policy';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. ATTACH MFA TRIGGER (currently defined but never connected)
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_require_mfa_for_privileged_roles'
  ) THEN
    CREATE TRIGGER trg_require_mfa_for_privileged_roles
      AFTER INSERT OR UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION require_mfa_for_privileged_roles();
    RAISE NOTICE 'Attached MFA trigger to profiles table';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. GRANT ANON ACCESS TO NON-SENSITIVE TABLES
-- ──────────────────────────────────────────────────────────────────────────────

GRANT SELECT ON subscription_plans TO anon;
GRANT SELECT ON serviceable_cities TO anon;
GRANT SELECT ON categories TO anon;

COMMIT;
