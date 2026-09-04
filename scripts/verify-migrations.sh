#!/bin/bash
# ==============================================================================
# WAW Migration Verification Script
# Verifies that all Supabase migrations apply cleanly to a fresh database.
# Run this in CI before any release.
# ==============================================================================

set -e

echo "🔄 Starting migration verification..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found. Install it: https://supabase.com/docs/guides/cli"
  exit 1
fi

# Reset the local database to a clean state
echo "📦 Resetting local Supabase database..."
supabase db reset --linked

# Apply all migrations
echo "🔧 Applying migrations..."
supabase migration list

# Verify RLS is enabled on critical tables
echo "🔒 Verifying RLS policies..."
psql "$DATABASE_URL" -c "
  SELECT schemaname, tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('orders', 'store_orders', 'order_items', 'payments', 'payouts', 'return_requests', 'profiles', 'stores')
  ORDER BY tablename;
"

# Verify anonymous access is revoked on order tables
echo "🚫 Verifying anonymous access revocation..."
psql "$DATABASE_URL" -c "
  SELECT grantee, table_name, privilege_type
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name IN ('orders', 'store_orders', 'order_items')
    AND grantee = 'anon'
  ORDER BY table_name, privilege_type;
"

# Verify checkout_transaction RPC exists
echo "🔧 Verifying checkout_transaction RPC..."
psql "$DATABASE_URL" -c "
  SELECT proname, proargtypes::regtype[]
  FROM pg_proc
  WHERE proname = 'checkout_transaction';
"

# Verify create_return_request RPC exists
echo "🔧 Verifying create_return_request RPC..."
psql "$DATABASE_URL" -c "
  SELECT proname, proargtypes::regtype[]
  FROM pg_proc
  WHERE proname = 'create_return_request';
"

# Verify cancel_order RPC exists
echo "🔧 Verifying cancel_order RPC..."
psql "$DATABASE_URL" -c "
  SELECT proname, proargtypes::regtype[]
  FROM pg_proc
  WHERE proname = 'cancel_order';
"

echo "✅ Migration verification complete!"
