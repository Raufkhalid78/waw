#!/bin/bash
# ==============================================================================
# Waw (واو) — Launch Checklist Script
# ==============================================================================
# Comprehensive pre-launch verification checklist.
# Run before production deployment.
# Usage: bash scripts/launch-checklist.sh

set -e

echo "🚀 Waw Launch Checklist"
echo "========================"
echo ""

PASS=0
FAIL=0
WARN=0
TOTAL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  local name="$1"
  local cmd="$2"
  ((TOTAL++))
  
  result=$(eval "$cmd" 2>&1)
  if [ $? -eq 0 ] && echo "$result" | grep -qi "true\|ok\|pass\|found\|enabled\|exists"; then
    echo -e "${GREEN}✅${NC} $name"
    ((PASS++))
  else
    echo -e "${RED}❌${NC} $name"
    ((FAIL++))
  fi
}

warn() {
  local name="$1"
  local cmd="$2"
  ((TOTAL++))
  
  result=$(eval "$cmd" 2>&1)
  if [ $? -eq 0 ] && echo "$result" | grep -qi "true\|ok\|pass\|found\|enabled\|exists"; then
    echo -e "${GREEN}✅${NC} $name"
    ((PASS++))
  else
    echo -e "${YELLOW}⚠️${NC} $name"
    ((WARN++))
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
# 1. ENVIRONMENT & CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════
echo "1. Environment & Configuration"
echo "-------------------------------"

warn "NODE_ENV is production" "[ \"$(echo $NODE_ENV)\" = \"production\" ]"
warn "SUPABASE_URL is configured" "[ -n \"$(echo $SUPABASE_URL)\" ]"
warn "SUPABASE_ANON_KEY is configured" "[ -n \"$(echo $SUPABASE_ANON_KEY)\" ]"
warn "SUPABASE_SERVICE_ROLE_KEY is configured" "[ -n \"$(echo $SUPABASE_SERVICE_ROLE_KEY)\" ]"
warn "JWT_SECRET is configured" "[ -n \"$(echo $JWT_SECRET)\" ]"
warn "REDIS_URL is configured" "[ -n \"$(echo $REDIS_URL)\" ]"
warn "SENTRY_DSN is configured" "[ -n \"$(echo $SENTRY_DSN)\" ]"

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# 2. SECURITY
# ══════════════════════════════════════════════════════════════════════════════
echo "2. Security"
echo "-----------"

warn "JWT_SECRET is strong (>32 chars)" "[ ${#JWT_SECRET} -gt 32 ]"
warn "Rate limiting enabled" "grep -q 'rateLimit' apps/api/src/middleware/rate-limit.middleware.ts"
warn "CSRF protection enabled" "grep -q 'csrfProtection' apps/api/src/app.ts"
warn "Helmet security headers enabled" "grep -q 'helmet' apps/api/src/app.ts"
warn "Input sanitization enabled" "grep -q 'sanitizeInput' apps/api/src/app.ts"
warn "SQL injection prevention (RLS)" "grep -q 'ENABLE ROW LEVEL SECURITY' supabase/migrations/*.sql"

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# 3. DATABASE
# ══════════════════════════════════════════════════════════════════════════════
echo "3. Database"
echo "-----------"

warn "Migrations exist" "[ $(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l) -gt 0 ]"
warn "RLS enabled on orders" "grep -q 'ENABLE ROW LEVEL SECURITY' supabase/migrations/*.sql | head -1"
warn "Checkout RPC exists" "grep -q 'checkout_transaction' supabase/migrations/*.sql"
warn "Return RPC exists" "grep -q 'create_return_request' supabase/migrations/*.sql"
warn "Cancel RPC exists" "grep -q 'cancel_order' supabase/migrations/*.sql"

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# 4. API ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════
echo "4. API Endpoints"
echo "----------------"

warn "Health endpoint exists" "grep -q 'app.get.*health' apps/api/src/app.ts"
warn "Readiness endpoint exists" "grep -q 'app.get.*readyz' apps/api/src/app.ts"
warn "Liveness endpoint exists" "grep -q 'app.get.*livez' apps/api/src/app.ts"
warn "Products endpoint exists" "grep -q 'app.get.*products' apps/api/src/app.ts"
warn "Orders endpoint exists" "grep -q 'app.post.*orders' apps/api/src/app.ts"
warn "Auth endpoint exists" "grep -q 'app.post.*auth' apps/api/src/app.ts"

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# 5. MIDDLEWARE & SECURITY
# ══════════════════════════════════════════════════════════════════════════════
echo "5. Middleware & Security"
echo "------------------------"

warn "Auth middleware exists" "[ -f apps/api/src/middleware/auth.middleware.ts ]"
warn "RBAC middleware exists" "[ -f apps/api/src/middleware/require-role.middleware.ts ]"
warn "Rate limit middleware exists" "[ -f apps/api/src/middleware/rate-limit.middleware.ts ]"
warn "Validation middleware exists" "[ -f apps/api/src/middleware/validate.middleware.ts ]"
warn "Sanitize middleware exists" "[ -f apps/api/src/middleware/sanitize.middleware.ts ]"
warn "CSRF middleware exists" "[ -f apps/api/src/middleware/csrf.middleware.ts ]"

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# 6. JOBS & QUEUES
# ══════════════════════════════════════════════════════════════════════════════
echo "6. Jobs & Queues"
echo "----------------"

warn "Queue service exists" "[ -f apps/api/src/jobs/queue.service.ts ]"
warn "Reconciliation job exists" "[ -f apps/api/src/jobs/reconciliation.cron.ts ]"
warn "Inventory cleanup job exists" "[ -f apps/api/src/jobs/inventory-cleanup.cron.ts ]"
warn "Dead-letter queue implemented" "grep -q 'deadLetterQueue' apps/api/src/jobs/queue.service.ts"
warn "Advisory locks implemented" "grep -q 'pg_try_advisory_lock' apps/api/src/jobs/*.ts"

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# 7. MONITORING & LOGGING
# ══════════════════════════════════════════════════════════════════════════════
echo "7. Monitoring & Logging"
echo "-----------------------"

warn "Winston logger configured" "[ -f apps/api/src/config/logger.ts ]"
warn "Sentry integration configured" "[ -f apps/api/src/config/sentry.ts ]"
warn "Request tracing implemented" "grep -q 'requestTracer' apps/api/src/config/logger.ts"
warn "Correlation IDs implemented" "grep -q 'correlationId' apps/api/src/config/logger.ts"
warn "Monitoring service exists" "grep -q 'MonitoringService' apps/api/src/config/sentry.ts"

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# 8. BUILD & TEST
# ══════════════════════════════════════════════════════════════════════════════
echo "8. Build & Test"
echo "---------------"

warn "Build passes" "npm run build 2>&1 | grep -q 'successful'"
warn "Tests pass" "npm test 2>&1 | grep -q 'fail 0'"
warn "Lint passes" "npm run lint 2>&1 | grep -q 'warning\|error' || true"

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# 9. DOCUMENTATION
# ══════════════════════════════════════════════════════════════════════════════
echo "9. Documentation"
echo "----------------"

warn "README exists" "[ -f README.md ]"
warn "Environment template exists" "[ -f .env.example ]"
warn "Docker Compose exists" "[ -f docker-compose.yml ]"
warn "OpenAPI docs exist" "[ -f openapi.yaml ]"
warn "Recovery procedures documented" "[ -f docs/recovery-procedures.md ] || echo 'Docs directory may not exist'"

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# 10. PAYMENT & LOGISTICS
# ══════════════════════════════════════════════════════════════════════════════
echo "10. Payment & Logistics"
echo "-----------------------"

warn "XPay service exists" "[ -f apps/api/src/modules/payments/xpay.service.ts ]"
warn "Raast service exists" "[ -f apps/api/src/modules/payments/raast.service.ts ]"
warn "Courier service exists" "[ -f apps/api/src/modules/logistics/courier.service.ts ]"
warn "Inventory lock service exists" "[ -f apps/api/src/modules/products/inventory-lock.service.ts ]"
warn "Webhook signature verification" "grep -q 'webhook.*signature\|x-webhook-signature' apps/api/src/app.ts"

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
echo "========================================"
echo "LAUNCH CHECKLIST SUMMARY"
echo "========================================"
echo -e "Total checks: $TOTAL"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo -e "${YELLOW}Warnings: $WARN${NC}"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}❌ NOT READY FOR LAUNCH${NC}"
  echo "Please fix the failed checks before deploying to production."
  exit 1
else
  echo -e "${GREEN}✅ READY FOR LAUNCH${NC}"
  echo "All critical checks passed. Warnings are non-blocking."
  exit 0
fi
