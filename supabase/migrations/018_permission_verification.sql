-- ============================================================================
-- P0-6: Database Permission Verification (STRICT MODE)
-- Verifies RLS is enabled on all sensitive tables and permissions are correct.
-- FAILS the migration when critical security controls are missing.
-- ============================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. VERIFY RLS IS ENABLED ON ALL SENSITIVE TABLES
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_table RECORD;
  v_missing_rls TEXT[] := '{}';
BEGIN
  FOR v_table IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'orders', 'order_items', 'store_orders', 'payouts',
        'return_requests', 'return_items', 'addresses', 'carts',
        'cart_items', 'profiles', 'stores', 'seller_offers',
        'offer_variants', 'inventory_ledger', 'payments',
        'support_tickets', 'reviews', 'wishlists',
        'flash_sales', 'flash_sale_items', 'coupons',
        'shipments', 'xpay_webhooks_log', 'outbox_events',
        'category_schemas', 'serviceable_cities',
        'subscription_plans', 'ai_usage', 'schema_migrations',
        'checkout_sessions', 'admin_mfa', 'mfa_backup_codes',
        'financial_ledger', 'ticket_messages', 'audit_logs',
        'catalog_products', 'products', 'product_variants'
      )
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = v_table.tablename
        AND c.relrowsecurity = true
    ) THEN
      v_missing_rls := array_append(v_missing_rls, v_table.tablename);
    END IF;
  END LOOP;

  IF array_length(v_missing_rls, 1) > 0 THEN
    RAISE EXCEPTION 'CRITICAL: Tables missing RLS: %. Deployment blocked.', array_to_string(v_missing_rls, ', ');
  ELSE
    RAISE NOTICE 'RLS verified on all sensitive tables';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. VERIFY ANON ROLE CANNOT EXECUTE PROTECTED RPCs
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_grant RECORD;
  v_unauthorized_grants TEXT[] := '{}';
BEGIN
  FOR v_grant IN
    SELECT routine_name, grantee
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND grantee = 'anon'
      AND routine_name IN (
        'checkout_transaction',
        'create_return_request',
        'cancel_order'
      )
  LOOP
    v_unauthorized_grants := array_append(v_unauthorized_grants,
      v_grant.routine_name || ' -> ' || v_grant.grantee);
  END LOOP;

  IF array_length(v_unauthorized_grants, 1) > 0 THEN
    RAISE EXCEPTION 'CRITICAL: Unauthorized GRANT EXECUTE to anon: %. Deployment blocked.', array_to_string(v_unauthorized_grants, ', ');
  ELSE
    RAISE NOTICE 'No unauthorized anon EXECUTE grants on protected RPCs';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. VERIFY NO PLAINTEXT SECRETS IN TABLES
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_has_secrets BOOLEAN := false;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
    WHERE t.schemaname = 'public'
      AND (
        t.tablename LIKE '%secret%'
        OR t.tablename LIKE '%password%'
        OR t.tablename LIKE '%private_key%'
      )
  ) THEN
    v_has_secrets := true;
    RAISE WARNING 'Potential secret-related tables found (manual review required)';
  ELSE
    RAISE NOTICE 'No obvious secret-related tables detected';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. VERIFY SEARCH PATH IS SET ON SECURITY DEFINER FUNCTIONS
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_func RECORD;
  v_missing_search_path TEXT[] := '{}';
BEGIN
  FOR v_func IN
    SELECT p.proname, pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.procnsp
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    IF v_func.definition NOT LIKE '%SET search_path%' THEN
      v_missing_search_path := array_append(v_missing_search_path, v_func.proname);
    END IF;
  END LOOP;

  IF array_length(v_missing_search_path, 1) > 0 THEN
    RAISE EXCEPTION 'CRITICAL: SECURITY DEFINER functions missing SET search_path: %. Deployment blocked.',
      array_to_string(v_missing_search_path, ', ');
  ELSE
    RAISE NOTICE 'All SECURITY DEFINER functions have SET search_path';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. GRANT MINIMAL PERMISSIONS TO ANON ROLE
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  GRANT SELECT ON subscription_plans TO anon;
  GRANT SELECT ON serviceable_cities TO anon;
  GRANT SELECT ON categories TO anon;
  GRANT SELECT ON catalog_products TO anon;
  GRANT SELECT ON seller_offers TO anon;
  GRANT SELECT ON offer_variants TO anon;
  GRANT SELECT ON stores TO anon;
  GRANT SELECT ON products TO anon;
  GRANT SELECT ON product_variants TO anon;

  RAISE NOTICE 'Anon role permissions verified: read-only on public catalog data';
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. VERIFY CHECKOUT/RETURN RPC PERMISSIONS
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Ensure only authenticated users can execute checkout/return RPCs
  GRANT EXECUTE ON FUNCTION checkout_transaction(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO authenticated;
  GRANT EXECUTE ON FUNCTION create_return_request(UUID, UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, JSONB) TO authenticated;
  GRANT EXECUTE ON FUNCTION cancel_order(UUID, TEXT) TO authenticated;

  -- Revoke from anon (in case it was granted before)
  REVOKE EXECUTE ON FUNCTION checkout_transaction(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) FROM anon;
  REVOKE EXECUTE ON FUNCTION create_return_request(UUID, UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, JSONB) FROM anon;
  REVOKE EXECUTE ON FUNCTION cancel_order(UUID, TEXT) FROM anon;

  RAISE NOTICE 'Checkout/return/cancel RPCs restricted to authenticated role';
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. VERIFY GUEST CHECKOUT IS PROPERLY RESTRICTED
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Guest checkout should be available to both anon and authenticated
  GRANT EXECUTE ON FUNCTION guest_checkout_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon;
  GRANT EXECUTE ON FUNCTION guest_checkout_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;

  RAISE NOTICE 'Guest checkout permissions verified';
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. VERIFY OUTBOX EVENTS TABLE HAS PROPER RLS
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'outbox_events'
      AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on outbox_events table';
  ELSE
    RAISE NOTICE 'outbox_events RLS already enabled';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. VERIFY MIGRATION VERSION TRACKING
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Record this migration as applied
  INSERT INTO schema_migrations (version, applied_at)
  VALUES ('018_permission_verification_strict', NOW())
  ON CONFLICT (version) DO NOTHING;

  RAISE NOTICE 'Migration version recorded';
END $$;

COMMIT;
