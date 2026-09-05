#!/bin/bash
# ==============================================================================
# WAW Migration Integration Test Script
# Verifies that all migrations apply to a fresh DB and tests core RPCs.
# ==============================================================================
set -e

echo "Starting migration integration tests..."

if ! command -v supabase &> /dev/null; then
  echo "Supabase CLI not found. Install it first."
  exit 1
fi

echo "Resetting local Supabase database..."
supabase db reset --linked

echo "Testing checkout_transaction RPC signature..."
psql "$DATABASE_URL" -c "
  DO \$\$ 
  BEGIN
    PERFORM checkout_transaction(
      NULL, 'Test Buyer', '03001234567', '123 Test St', 'Lahore', 'COD',
      '[{\"offer_variant_id\": \"00000000-0000-0000-0000-000000000000\", \"quantity\": 1}]'::jsonb,
      NULL, 'idem-123'
    );
  EXCEPTION 
    WHEN OTHERS THEN
      -- We expect it to fail due to foreign keys or stock, but the RPC signature must exist!
      IF SQLERRM LIKE '%function checkout_transaction(%) does not exist%' THEN
        RAISE EXCEPTION 'RPC missing: %', SQLERRM;
      END IF;
  END \$\$;
"

echo "Testing guest_checkout_transaction RPC signature..."
psql "$DATABASE_URL" -c "
  DO \$\$ 
  BEGIN
    PERFORM guest_checkout_transaction(
      'invalid.token', 'Test Guest', '03001234567', '123 Test St', 'Lahore', 'COD',
      '[{\"offer_variant_id\": \"00000000-0000-0000-0000-000000000000\", \"quantity\": 1}]'::jsonb,
      'idem-guest-123'
    );
  EXCEPTION 
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%function guest_checkout_transaction(%) does not exist%' THEN
        RAISE EXCEPTION 'RPC missing: %', SQLERRM;
      END IF;
  END \$\$;
"

echo "Migration integration test complete. All RPCs present and callable."
