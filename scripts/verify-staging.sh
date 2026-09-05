#!/bin/bash
# ==============================================================================
# Waw (واو) — Staging Environment Verification Script
# ==============================================================================
# Verifies that staging environment is correctly configured and all services
# are running. Run after deploying to staging.
# Usage: bash scripts/verify-staging.sh

set -e

echo "🔍 Waw Staging Environment Verification"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1"
  local cmd="$2"
  local expected="$3"
  
  result=$(eval "$cmd" 2>&1)
  if echo "$result" | grep -q "$expected"; then
    echo -e "${GREEN}✅ PASS${NC} — $name"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC} — $name (expected: $expected, got: $result)"
    ((FAIL++))
  fi
}

check_warn() {
  local name="$1"
  local cmd="$2"
  
  result=$(eval "$cmd" 2>&1)
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} — $name"
    ((PASS++))
  else
    echo -e "${YELLOW}⚠️  WARN${NC} — $name"
    ((WARN++))
  fi
}

# ─── 1. Service Health Checks ────────────────────────────────────────────────
echo "1. Service Health Checks"
echo "------------------------"

check "PostgreSQL is running" \
  "docker compose -f docker-compose.staging.yml exec -T db pg_isready -U waw_staging" \
  "accepting connections"

check "Redis is running" \
  "docker compose -f docker-compose.staging.yml exec -T redis redis-cli -a change_me_staging ping" \
  "PONG"

check "Typesense is running" \
  "curl -sf http://localhost:8108/health" \
  "ok"

echo ""

# ─── 2. Database Schema Verification ─────────────────────────────────────────
echo "2. Database Schema Verification"
echo "--------------------------------"

check "RLS enabled on orders" \
  "docker compose -f docker-compose.staging.yml exec -T db psql -U waw_staging -d waw_staging -c \"SELECT relrowsecurity FROM pg_class WHERE relname='orders'\"" \
  "t"

check "RLS enabled on stores" \
  "docker compose -f docker-compose.staging.yml exec -T db psql -U waw_staging -d waw_staging -c \"SELECT relrowsecurity FROM pg_class WHERE relname='stores'\"" \
  "t"

check "RLS enabled on inventory_ledger" \
  "docker compose -f docker-compose.staging.yml exec -T db psql -U waw_staging -d waw_staging -c \"SELECT relrowsecurity FROM pg_class WHERE relname='inventory_ledger'\"" \
  "t"

check "checkout_transaction RPC exists" \
  "docker compose -f docker-compose.staging.yml exec -T db psql -U waw_staging -d waw_staging -c \"SELECT proname FROM pg_proc WHERE proname='checkout_transaction'\"" \
  "checkout_transaction"

check "create_return_request RPC exists" \
  "docker compose -f docker-compose.staging.yml exec -T db psql -U waw_staging -d waw_staging -c \"SELECT proname FROM pg_proc WHERE proname='create_return_request'\"" \
  "create_return_request"

check "cancel_order RPC exists" \
  "docker compose -f docker-compose.staging.yml exec -T db psql -U waw_staging -d waw_staging -c \"SELECT proname FROM pg_proc WHERE proname='cancel_order'\"" \
  "cancel_order"

echo ""

# ─── 3. Permission Verification ──────────────────────────────────────────────
echo "3. Permission Verification"
echo "---------------------------"

check "Anon cannot execute checkout_transaction" \
  "docker compose -f docker-compose.staging.yml exec -T db psql -U waw_staging -d waw_staging -c \"SELECT has_function_privilege('anon', 'checkout_transaction(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT)', 'EXECUTE')\"" \
  "f"

check "Anon cannot execute create_return_request" \
  "docker compose -f docker-compose.staging.yml exec -T db psql -U waw_staging -d waw_staging -c \"SELECT has_function_privilege('anon', 'create_return_request(UUID, UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, JSONB)', 'EXECUTE')\"" \
  "f"

echo ""

# ─── 4. Environment Variables ────────────────────────────────────────────────
echo "4. Environment Variables"
echo "------------------------"

check_warn "SUPABASE_URL is set" "echo \$SUPABASE_URL | grep -c 'supabase'"
check_warn "REDIS_PASSWORD is set" "echo \$REDIS_PASSWORD | grep -c '.'"
check_warn "SENTRY_DSN is set" "echo \$SENTRY_DSN | grep -c 'sentry'"

echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "========================================"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$WARN warnings${NC}"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}❌ Staging verification FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Staging verification PASSED${NC}"
  exit 0
fi
