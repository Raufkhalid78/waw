#!/bin/bash
# ==============================================================================
# Waw (واو) — API Performance Budget Script
# ==============================================================================
# Measures API response times and enforces performance budgets.
# Usage: bash scripts/api-performance-budget.sh [api_url]

set -e

API_BASE="${1:-http://localhost:4000}"
echo "⚡ Waw API Performance Budget"
echo "=============================="
echo "API Base: $API_BASE"
echo ""

PASS=0
FAIL=0
WARN=0
TOTAL_TIME=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_pass() {
  echo -e "${GREEN}✅ PASS${NC} — $1"
  ((PASS++))
}

test_fail() {
  echo -e "${RED}❌ FAIL${NC} — $1"
  ((FAIL++))
}

test_warn() {
  echo -e "${YELLOW}⚠️  WARN${NC} — $1"
  ((WARN++))
}

measure_endpoint() {
  local name="$1"
  local method="${2:-GET}"
  local path="$3"
  local data="$4"
  local budget_ms="$5"
  
  local args=(-s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10)
  
  if [ "$method" = "POST" ] || [ "$method" = "PUT" ] || [ "$method" = "PATCH" ]; then
    args+=(-X "$method" -H "Content-Type: application/json")
    if [ -n "$data" ]; then
      args+=(-d "$data")
    fi
  fi
  
  START_TIME=$(date +%s%N)
  HTTP_CODE=$(curl "${args[@]}" "$API_BASE$path" 2>/dev/null || echo "000")
  END_TIME=$(date +%s%N)
  RESPONSE_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))
  TOTAL_TIME=$((TOTAL_TIME + RESPONSE_TIME_MS))
  
  if [ "$HTTP_CODE" = "000" ]; then
    test_fail "$name — Connection failed"
  elif [ "$RESPONSE_TIME_MS" -lt "$budget_ms" ]; then
    test_pass "$name — ${RESPONSE_TIME_MS}ms (budget: ${budget_ms}ms)"
  elif [ "$RESPONSE_TIME_MS" -lt "$((budget_ms * 2))" ]; then
    test_warn "$name — ${RESPONSE_TIME_MS}ms (budget: ${budget_ms}ms, exceeded but within 2x)"
  else
    test_fail "$name — ${RESPONSE_TIME_MS}ms (budget: ${budget_ms}ms, exceeded by >2x)"
  fi
}

# ─── 1. Health & Readiness Endpoints ─────────────────────────────────────────
echo "1. Health & Readiness Endpoints"
echo "--------------------------------"

measure_endpoint "GET /health" "GET" "/health" "" 100
measure_endpoint "GET /readyz" "GET" "/readyz" "" 500
measure_endpoint "GET /livez" "GET" "/livez" "" 50

echo ""

# ─── 2. Public API Endpoints ─────────────────────────────────────────────────
echo "2. Public API Endpoints"
echo "-----------------------"

measure_endpoint "GET /api/products" "GET" "/api/products?limit=20" "" 500
measure_endpoint "GET /api/products (paginated)" "GET" "/api/products?limit=50&offset=50" "" 750
measure_endpoint "GET /api/categories" "GET" "/api/categories" "" 300
measure_endpoint "GET /api/stores" "GET" "/api/stores" "" 300
measure_endpoint "GET /api/search" "GET" "/api/search?q=phone" "" 500
measure_endpoint "GET /api/config/storefront" "GET" "/api/config/storefront" "" 200

echo ""

# ─── 3. Product Detail Endpoints ─────────────────────────────────────────────
echo "3. Product Detail Endpoints"
echo "---------------------------"

measure_endpoint "GET /api/products/:slug" "GET" "/api/products/test-product" "" 300

echo ""

# ─── 4. Auth Endpoints (Rate Limited) ────────────────────────────────────────
echo "4. Auth Endpoints"
echo "-----------------"

measure_endpoint "POST /api/auth/whatsapp-otp/send" "POST" "/api/auth/whatsapp-otp/send" '{"phone":"+923001234567"}' 1000
measure_endpoint "POST /api/auth/whatsapp-otp/verify" "POST" "/api/auth/whatsapp-otp/verify" '{"phone":"+923001234567","otp":"123456"}' 1000

echo ""

# ─── 5. Checkout Endpoints ───────────────────────────────────────────────────
echo "5. Checkout Endpoints"
echo "---------------------"

measure_endpoint "POST /api/checkout/quote" "POST" "/api/checkout/quote" '{"items":[{"productId":"test","quantity":1}],"shippingCity":"Lahore","paymentMethod":"COD"}' 1000

echo ""

# ─── 6. Cart Endpoints ───────────────────────────────────────────────────────
echo "6. Cart Endpoints"
echo "-----------------"

measure_endpoint "GET /api/cart" "GET" "/api/cart?guestToken=test-token" "" 300
measure_endpoint "POST /api/cart/items" "POST" "/api/cart/items" '{"guestToken":"test-token","productId":"test","quantity":1}' 500

echo ""

# ─── 7. Support Endpoints ────────────────────────────────────────────────────
echo "7. Support Endpoints"
echo "-------------------"

measure_endpoint "GET /api/serviceability/cities" "GET" "/api/serviceability/cities" "" 200
measure_endpoint "GET /api/serviceability/check" "GET" "/api/serviceability/check?city=Lahore" "" 200

echo ""

# ─── 8. AI Endpoints ────────────────────────────────────────────────────────
echo "8. AI Endpoints"
echo "---------------"

measure_endpoint "GET /api/ai/recommendations" "GET" "/api/ai/recommendations/test-product" "" 2000

echo ""

# ─── 9. Concurrent Request Test ──────────────────────────────────────────────
echo "9. Concurrent Request Test"
echo "-------------------------"

CONCURRENT=10
REQUESTS=100

echo "  Sending $REQUESTS requests with $CONCURRENT concurrency..."

START_TIME=$(date +%s%N)
for i in $(seq 1 $REQUESTS); do
  curl -s "$API_BASE/health" > /dev/null 2>&1 &
  if (( i % CONCURRENT == 0 )); then
    wait
  fi
done
wait
END_TIME=$(date +%s%N)
CONCURRENT_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))
AVG_TIME_MS=$((CONCURRENT_TIME_MS / REQUESTS))

if [ "$AVG_TIME_MS" -lt 100 ]; then
  test_pass "Concurrent requests: ${AVG_TIME_MS}ms avg (< 100ms)"
elif [ "$AVG_TIME_MS" -lt 500 ]; then
  test_warn "Concurrent requests: ${AVG_TIME_MS}ms avg (100-500ms)"
else
  test_fail "Concurrent requests: ${AVG_TIME_MS}ms avg (> 500ms)"
fi

echo ""

# ─── 10. Memory & Resource Usage ─────────────────────────────────────────────
echo "10. Memory & Resource Usage"
echo "---------------------------"

# Check if API is running and get memory info
if curl -s "$API_BASE/health" > /dev/null 2>&1; then
  # Get API process memory (if running locally)
  API_PID=$(pgrep -f "node.*api" 2>/dev/null | head -1 || true)
  if [ -n "$API_PID" ]; then
    MEMORY_KB=$(ps -o rss= -p "$API_PID" 2>/dev/null || echo "0")
    MEMORY_MB=$((MEMORY_KB / 1024))
    
    if [ "$MEMORY_MB" -lt 256 ]; then
      test_pass "API memory usage: ${MEMORY_MB}MB (< 256MB)"
    elif [ "$MEMORY_MB" -lt 512 ]; then
      test_warn "API memory usage: ${MEMORY_MB}MB (256-512MB)"
    else
      test_fail "API memory usage: ${MEMORY_MB}MB (> 512MB)"
    fi
  else
    test_warn "Cannot measure API memory (process not found)"
  fi
else
  test_warn "Cannot measure API memory (API not responding)"
fi

echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "========================================"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$WARN warnings${NC}"
echo "Total test time: ${TOTAL_TIME}ms"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}❌ API performance budget FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}✅ API performance budget PASSED${NC}"
  exit 0
fi
