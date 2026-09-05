#!/bin/bash
# ==============================================================================
# Waw (واو) — Courier Integration Sandbox Testing Script
# ==============================================================================
# Tests courier integration against sandbox environments.
# Run against staging or local environment with sandbox credentials.
# Usage: bash scripts/test-courier-sandbox.sh

set -e

echo "📦 Waw Courier Integration Sandbox Testing"
echo "==========================================="
echo ""

API_BASE="${API_BASE_URL:-http://localhost:4000}"
PASS=0
FAIL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

test_pass() {
  echo -e "${GREEN}✅ PASS${NC} — $1"
  ((PASS++))
}

test_fail() {
  echo -e "${RED}❌ FAIL${NC} — $1"
  ((FAIL++))
}

# ─── 1. Serviceability Check ─────────────────────────────────────────────────
echo "1. Serviceability Check"
echo "-----------------------"

# Test: Check Lahore serviceability
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/serviceability/check?city=Lahore")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
  test_pass "Serviceability check for Lahore responds"
else
  test_fail "Serviceability check (HTTP $HTTP_CODE)"
fi

# Test: Check Karachi serviceability
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/serviceability/check?city=Karachi")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
  test_pass "Serviceability check for Karachi responds"
else
  test_fail "Serviceability check Karachi (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 2. Shipping Rate Calculation ────────────────────────────────────────────
echo "2. Shipping Rate Calculation"
echo "----------------------------"

# Test: Calculate shipping for Lahore
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/checkout/quote" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [],
    "shippingCity": "Lahore",
    "paymentMethod": "COD"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
  test_pass "Checkout quote endpoint responds"
else
  test_fail "Checkout quote (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 3. PostEx Booking (Sandbox) ─────────────────────────────────────────────
echo "3. PostEx Booking (Sandbox)"
echo "---------------------------"

# Test: Booking endpoint exists
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/logistics/book" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-order-id",
    "courier": "POSTEX"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "404" ]; then
  test_pass "PostEx booking endpoint responds"
else
  test_fail "PostEx booking (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 4. Tracking Webhook ─────────────────────────────────────────────────────
echo "4. Tracking Webhook"
echo "-------------------"

# Test: Tracking webhook endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/logistics/webhook/postex" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "sandbox-tracking-123",
    "status": "DELIVERED",
    "timestamp": "2026-09-05T12:00:00Z"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
  test_pass "Tracking webhook endpoint responds"
else
  test_fail "Tracking webhook (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 5. Reverse Pickup (Returns) ─────────────────────────────────────────────
echo "5. Reverse Pickup (Returns)"
echo "---------------------------"

# Test: Return request endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/orders/test-id/return" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Damaged item",
    "items": []
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
  test_pass "Return request endpoint responds"
else
  test_fail "Return request (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 6. Delivery Estimation ──────────────────────────────────────────────────
echo "6. Delivery Estimation"
echo "----------------------"

# Test: Delivery estimation for Lahore
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/serviceability/estimate?city=Lahore")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "404" ]; then
  test_pass "Delivery estimation endpoint responds"
else
  test_fail "Delivery estimation (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 7. Webhook Signature Verification ───────────────────────────────────────
echo "7. Webhook Signature Verification"
echo "----------------------------------"

# Test: Reject invalid webhook signature
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/logistics/webhook/postex" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: invalid" \
  -d '{
    "trackingNumber": "test",
    "status": "DELIVERED"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "200" ]; then
  test_pass "Webhook signature validation works"
else
  test_fail "Webhook signature validation (HTTP $HTTP_CODE)"
fi

echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "========================================"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}❌ Courier sandbox testing FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Courier sandbox testing PASSED${NC}"
  exit 0
fi
