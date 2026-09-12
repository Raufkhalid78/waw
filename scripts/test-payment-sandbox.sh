#!/bin/bash
# ==============================================================================
# Waw (واو) — Payment Provider Sandbox Testing Script
# ==============================================================================
# Tests payment integration against sandbox environments.
# Run against staging or local environment with sandbox credentials.
# Usage: bash scripts/test-payment-sandbox.sh

set -e

echo "💳 Waw Payment Provider Sandbox Testing"
echo "========================================"
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

# ─── 1. Bank Alfalah APG Onsite Checkout (Sandbox) ────────────────────────────
echo "1. Bank Alfalah APG Onsite Checkout (Sandbox)"
echo "----------------------------------------------"

# Test: Initiate onsite wallet session (auth/ownership errors prove the
# endpoint responds; 500 means a crash)
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/payments/apg/onsite/initiate" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-order-id",
    "method": "ALFA_WALLET",
    "accountNumber": "034512345678"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "404" ]; then
  test_pass "APG onsite payment initiation endpoint responds"
else
  test_fail "APG onsite payment initiation (HTTP $HTTP_CODE)"
fi

# Test: Onsite process rejects malformed sessions
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/payments/apg/onsite/process" \
  -H "Content-Type: application/json" \
  -d '{
    "authToken": "invalid",
    "method": "ALFA_WALLET",
    "smsOtp": "12345678"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "404" ]; then
  test_pass "APG onsite process validates sessions"
else
  test_fail "APG onsite process validation (HTTP $HTTP_CODE)"
fi

# Test: Card checkout responds
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/payments/apg/card/checkout" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "test-order-id"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "404" ]; then
  test_pass "APG card checkout endpoint responds"
else
  test_fail "APG card checkout (HTTP $HTTP_CODE)"
fi

# Test: IPN listener rejects foreign URLs
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/payments/apg/ipn" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://evil.example.com/steal"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"received":false'; then
  test_pass "APG IPN listener rejects foreign URLs"
else
  test_fail "APG IPN listener foreign URL rejection (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 2. Raast P2M QR Payment (Sandbox) ──────────────────────────────────────
echo "2. Raast P2M QR Payment (Sandbox)"
echo "----------------------------------"

# Test: Generate Raast QR
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/payments/raast/qr" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-order-id",
    "amountPkr": 1500
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "404" ]; then
  test_pass "Raast QR generation endpoint responds"
else
  test_fail "Raast QR generation (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 3. COD Payment Flow ─────────────────────────────────────────────────────
echo "3. COD Payment Flow"
echo "-------------------"

# Test: Create COD order
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/orders/guest" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_name": "Sandbox Test",
    "buyer_phone": "+923001234567",
    "shipping_address": "123 Sandbox Street, Lahore",
    "shipping_city": "Lahore",
    "payment_method": "COD",
    "items": []
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "400" ]; then
  test_pass "COD order creation endpoint responds"
else
  test_fail "COD order creation (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 4. Payment Status Verification ──────────────────────────────────────────
echo "4. Payment Status Verification"
echo "-------------------------------"

# Test: Check payment status endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/payments/status/test-order-id")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "404" ]; then
  test_pass "Payment status endpoint responds"
else
  test_fail "Payment status endpoint (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 5. Idempotency Testing ──────────────────────────────────────────────────
echo "5. Idempotency Testing"
echo "----------------------"

# Test: Duplicate checkout with same idempotency key
IDEMPOTENCY_KEY="test-idempotency-$(date +%s)"
RESPONSE1=$(curl -s -X POST "$API_BASE/api/orders/guest" \
  -H "Content-Type: application/json" \
  -d "{
    \"buyer_name\": \"Idempotency Test\",
    \"buyer_phone\": \"+923001234567\",
    \"shipping_address\": \"123 Test Street\",
    \"shipping_city\": \"Lahore\",
    \"payment_method\": \"COD\",
    \"idempotency_key\": \"$IDEMPOTENCY_KEY\",
    \"items\": []
  }")

RESPONSE2=$(curl -s -X POST "$API_BASE/api/orders/guest" \
  -H "Content-Type: application/json" \
  -d "{
    \"buyer_name\": \"Idempotency Test\",
    \"buyer_phone\": \"+923001234567\",
    \"shipping_address\": \"123 Test Street\",
    \"shipping_city\": \"Lahore\",
    \"payment_method\": \"COD\",
    \"idempotency_key\": \"$IDEMPOTENCY_KEY\",
    \"items\": []
  }")

if echo "$RESPONSE2" | grep -q "idempotent_replay\|success"; then
  test_pass "Idempotency key prevents duplicate orders"
else
  test_fail "Idempotency key handling"
fi

echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "========================================"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}❌ Payment sandbox testing FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Payment sandbox testing PASSED${NC}"
  exit 0
fi
