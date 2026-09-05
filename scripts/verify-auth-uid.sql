-- ============================================================================
-- Waw (واو) — Comprehensive auth.uid() Verification
-- ============================================================================
-- Verifies that all SECURITY DEFINER functions properly enforce caller identity.
-- Run against staging/production database to verify security posture.
-- Usage: psql -f scripts/verify-auth-uid.sql

\echo '🔍 Waw auth.uid() Verification'
\echo '================================'
\echo ''

-- ─── 1. List all SECURITY DEFINER functions ─────────────────────────────────
\echo '1. SECURITY DEFINER Functions Found'
\echo '------------------------------------'

SELECT
  p.proname AS function_name,
  CASE WHEN p.prosecdef THEN 'YES' ELSE 'NO' END AS security_definer,
  CASE WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN 'YES' ELSE 'NO' END AS has_search_path,
  CASE WHEN pg_get_functiondef(p.oid) LIKE '%auth.uid()' THEN 'YES' ELSE 'NO' END AS checks_auth_uid
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

\echo ''

-- ─── 2. Check for functions that modify data but don't check auth.uid() ─────
\echo '2. Functions Missing auth.uid() Check (Potential Issues)'
\echo '-------------------------------------------------------'

SELECT
  p.proname AS function_name,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%auth.uid%' THEN '✅ Has auth check'
    WHEN pg_get_functiondef(p.oid) LIKE '%SECURITY DEFINER%' AND pg_get_functiondef(p.oid) NOT LIKE '%auth.uid%' THEN '⚠️ MISSING auth check'
    ELSE 'ℹ️ Non-SECURITY DEFINER'
  END AS auth_check_status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY
  CASE WHEN pg_get_functiondef(p.oid) LIKE '%SECURITY DEFINER%' AND pg_get_functiondef(p.oid) NOT LIKE '%auth.uid%' THEN 0 ELSE 1 END,
  p.proname;

\echo ''

-- ─── 3. Verify GRANT EXECUTE permissions ────────────────────────────────────
\echo '3. GRANT EXECUTE Permissions on Protected Functions'
\echo '---------------------------------------------------'

SELECT
  routine_name,
  grantee,
  'GRANT' AS privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'checkout_transaction',
    'create_return_request',
    'cancel_order'
  )
ORDER BY routine_name, grantee;

\echo ''

-- ─── 4. Verify RLS is enabled on all sensitive tables ───────────────────────
\echo '4. RLS Status on Sensitive Tables'
\echo '----------------------------------'

SELECT
  c.relname AS table_name,
  CASE WHEN c.relrowsecurity THEN '✅ Enabled' ELSE '❌ DISABLED' END AS rls_status,
  (SELECT count(*) FROM pg_policies pol WHERE pol.tablename = c.relname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'orders', 'order_items', 'store_orders', 'payouts',
    'return_requests', 'return_items', 'addresses', 'carts',
    'cart_items', 'profiles', 'stores', 'seller_offers',
    'offer_variants', 'inventory_ledger', 'payments',
    'support_tickets', 'reviews', 'wishlists'
  )
ORDER BY
  CASE WHEN c.relrowsecurity THEN 0 ELSE 1 END,
  c.relname;

\echo ''

-- ─── 5. Verify anon role permissions ────────────────────────────────────────
\echo '5. Anon Role Permissions'
\echo '------------------------'

SELECT
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE grantee = 'anon'
ORDER BY routine_name;

\echo ''

-- ─── 6. Summary ─────────────────────────────────────────────────────────────
\echo '================================'
\echo 'Verification Complete'
\echo '================================'
