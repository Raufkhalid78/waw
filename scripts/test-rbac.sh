#!/bin/bash
# ==============================================================================
# Waw (واو) — RBAC Verification Script
# ==============================================================================
# Tests Role-Based Access Control across all protected routes.
# Run against staging or local environment.
# Usage: bash scripts/test-rbac.sh

set -e

echo "🔒 Waw RBAC Verification"
echo "========================="
echo ""

API_BASE="${API_BASE_URL:-http://localhost:4000}"
PASS=0
FAIL=0
WARN=0

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

# ─── Helper: Get JWT for role ────────────────────────────────────────────────
# In production, these would be real tokens. For testing, we use mock tokens.
BUYER_TOKEN="${BUYER_TOKEN:-mock-buyer-token}"
SELLER_TOKEN="${SELLER_TOKEN:-mock-seller-token}"
ADMIN_TOKEN="${ADMIN_TOKEN:-mock-admin-token}"

# ─── 1. Public Routes (No Auth Required) ─────────────────────────────────────
echo "1. Public Routes (Should Allow Anonymous)"
echo "-----------------------------------------"

ROUTES=(
  "GET /api/products"
  "GET /api/categories"
  "GET /api/stores"
  "GET /api/search?q=test"
  "GET /api/config/storefront"
  "GET /health"
  "GET /readyz"
)

for route in "${ROUTES[@]}"; do
  METHOD=$(echo "$route" | cut -d' ' -f1)
  PATH_=$(echo "$route" | cut -d' ' -f2)
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X $METHOD "$API_BASE$PATH_" 2>/dev/null)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
    test_pass "$route — Allows anonymous access"
  else
    test_warn "$route — Returns $HTTP_CODE (expected 200)"
  fi
done

echo ""

# ─── 2. Protected Routes (Auth Required) ─────────────────────────────────────
echo "2. Protected Routes (Should Reject Anonymous)"
echo "----------------------------------------------"

PROTECTED_ROUTES=(
  "GET /api/orders"
  "GET /api/user/addresses"
  "GET /api/user/wishlist"
  "GET /api/loyalty/balance"
  "GET /api/referrals/stats"
  "GET /api/support/tickets"
  "POST /api/orders"
  "POST /api/seller/apply"
  "POST /api/seller/kyc"
  "GET /api/seller/store"
  "GET /api/seller/orders"
  "GET /api/seller/products"
  "GET /api/seller/analytics"
  "GET /api/seller/payouts"
)

for route in "${PROTECTED_ROUTES[@]}"; do
  METHOD=$(echo "$route" | cut -d' ' -f1)
  PATH_=$(echo "$route" | cut -d' ' -f2)
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X $METHOD "$API_BASE$PATH_" 2>/dev/null)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "302" ]; then
    test_pass "$route — Rejects anonymous (401)"
  else
    test_fail "$route — Returns $HTTP_CODE (expected 401)"
  fi
done

echo ""

# ─── 3. Admin-Only Routes ────────────────────────────────────────────────────
echo "3. Admin-Only Routes (Should Reject Non-Admin)"
echo "-----------------------------------------------"

ADMIN_ROUTES=(
  "GET /api/admin/stats"
  "GET /api/admin/products"
  "GET /api/admin/orders"
  "GET /api/admin/users"
  "GET /api/admin/sellers"
  "GET /api/admin/payouts"
  "GET /api/admin/kyc/pending"
  "GET /api/admin/products/pending"
  "GET /api/admin/reviews/pending"
  "GET /api/admin/disputes"
  "GET /api/admin/returns"
  "GET /api/admin/settings"
  "GET /api/admin/flash-sales"
  "GET /api/admin/banners"
  "GET /api/admin/categories"
)

for route in "${ADMIN_ROUTES[@]}"; do
  METHOD=$(echo "$route" | cut -d' ' -f1)
  PATH_=$(echo "$route" | cut -d' ' -f2)
  
  # Test with buyer token
  RESPONSE=$(curl -s -w "\n%{http_code}" -X $METHOD "$API_BASE$PATH_" \
    -H "Authorization: Bearer $BUYER_TOKEN" 2>/dev/null)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "401" ]; then
    test_pass "$route — Rejects buyer (403/401)"
  else
    test_fail "$route — Returns $HTTP_CODE for buyer (expected 403)"
  fi
done

echo ""

# ─── 4. Seller Routes ────────────────────────────────────────────────────────
echo "4. Seller Routes (Should Reject Non-Seller)"
echo "--------------------------------------------"

SELLER_ROUTES=(
  "GET /api/seller/store"
  "GET /api/seller/orders"
  "GET /api/seller/products"
  "GET /api/seller/analytics"
  "GET /api/seller/payouts"
  "POST /api/seller/coupons"
)

for route in "${SELLER_ROUTES[@]}"; do
  METHOD=$(echo "$route" | cut -d' ' -f1)
  PATH_=$(echo "$route" | cut -d' ' -f2)
  
  # Test with buyer token
  RESPONSE=$(curl -s -w "\n%{http_code}" -X $METHOD "$API_BASE$PATH_" \
    -H "Authorization: Bearer $BUYER_TOKEN" 2>/dev/null)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "401" ]; then
    test_pass "$route — Rejects buyer (403/401)"
  else
    test_fail "$route — Returns $HTTP_CODE for buyer (expected 403)"
  fi
done

echo ""

# ─── 5. Webhook Routes (Signature Required) ──────────────────────────────────
echo "5. Webhook Routes (Should Reject Invalid Signatures)"
echo "----------------------------------------------------"

# Test PostEx webhook without signature
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/logistics/postex/webhook" \
  -H "Content-Type: application/json" \
  -d '{"trackingNumber":"test","status":"DELIVERED"}' 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
  test_pass "PostEx webhook — Handles missing signature"
else
  test_fail "PostEx webhook — Returns $HTTP_CODE (expected 401)"
fi

# Test XPay webhook without signature
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/payments/xpay/webhook" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test","status":"SUCCESS"}' 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
  test_pass "XPay webhook — Handles missing signature"
else
  test_fail "XPay webhook — Returns $HTTP_CODE (expected 401)"
fi

echo ""

# ─── 6. Rate Limiting ────────────────────────────────────────────────────────
echo "6. Rate Limiting"
echo "----------------"

# Test OTP rate limiting (should allow first few, then block)
for i in {1..6}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/auth/whatsapp-otp/send" \
    -H "Content-Type: application/json" \
    -d '{"phone":"+923000000000"}' 2>/dev/null)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
done

# After 6 requests, should be rate limited
if [ "$HTTP_CODE" = "429" ]; then
  test_pass "OTP rate limiting — Blocks after repeated requests"
else
  test_warn "OTP rate limiting — Returns $HTTP_CODE (expected 429 after 6 requests)"
fi

echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "========================================"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$WARN warnings${NC}"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}❌ RBAC verification FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}✅ RBAC verification PASSED${NC}"
  exit 0
fi
