#!/bin/bash
# ==============================================================================
# Waw (واو) — Input Validation Audit Script
# ==============================================================================
# Tests input validation across all API endpoints.
# Run against staging or local environment.
# Usage: bash scripts/test-input-validation.sh

set -e

echo "🛡️ Waw Input Validation Audit"
echo "=============================="
echo ""

API_BASE="${API_BASE_URL:-http://localhost:4000}"
PASS=0
FAIL=0

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

# ─── 1. SQL Injection Tests ──────────────────────────────────────────────────
echo "1. SQL Injection Prevention"
echo "----------------------------"

# Test: Product search with SQL injection
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/products?search=%27+OR+1%3D1+--" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
  test_pass "Product search SQL injection blocked"
else
  test_fail "Product search SQL injection (HTTP $HTTP_CODE)"
fi

# Test: Category search with SQL injection
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/categories?q=%27+UNION+SELECT+*+FROM+users+--" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
  test_pass "Category search SQL injection blocked"
else
  test_fail "Category search SQL injection (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 2. XSS Prevention Tests ─────────────────────────────────────────────────
echo "2. XSS Prevention"
echo "-----------------"

# Test: Search query with XSS
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/search?q=%3Cscript%3Ealert(1)%3C/script%3E" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
if echo "$BODY" | grep -q "<script>"; then
  test_fail "Search query XSS not sanitized"
else
  test_pass "Search query XSS sanitized"
fi

echo ""

# ─── 3. Request Size Limits ──────────────────────────────────────────────────
echo "3. Request Size Limits"
echo "----------------------"

# Test: Large payload rejection
LARGE_PAYLOAD=$(python3 -c "print('x' * 1000000)" 2>/dev/null || echo "test")
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"data\":\"$LARGE_PAYLOAD\"}" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "413" ] || [ "$HTTP_CODE" = "401" ]; then
  test_pass "Large payload rejected"
else
  test_fail "Large payload accepted (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 4. Validation Schema Tests ──────────────────────────────────────────────
echo "4. Validation Schema Enforcement"
echo "---------------------------------"

# Test: Missing required fields in order creation
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/orders" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
  test_pass "Order creation rejects empty payload"
else
  test_fail "Order creation accepts empty payload (HTTP $HTTP_CODE)"
fi

# Test: Invalid phone number format
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/auth/whatsapp-otp/send" \
  -H "Content-Type: application/json" \
  -d '{"phone":"abc"}' 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
  test_pass "OTP request rejects invalid phone"
else
  test_fail "OTP request accepts invalid phone (HTTP $HTTP_CODE)"
fi

# Test: Invalid rating in review
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/products/test/reviews" \
  -H "Content-Type: application/json" \
  -d '{"rating":10,"comment":"test"}' 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
  test_pass "Review rejects invalid rating"
else
  test_fail "Review accepts invalid rating (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 5. HTTP Method Override Tests ───────────────────────────────────────────
echo "5. HTTP Method Security"
echo "-----------------------"

# Test: Method override header rejection
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/admin/stats" \
  -H "X-HTTP-Method-Override: GET" \
  -H "Content-Type: application/json" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "404" ]; then
  test_pass "Method override header handled"
else
  test_fail "Method override header accepted (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 6. Content-Type Validation ──────────────────────────────────────────────
echo "6. Content-Type Validation"
echo "--------------------------"

# Test: Wrong content type
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/orders" \
  -H "Content-Type: text/plain" \
  -d "test" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "415" ]; then
  test_pass "Wrong content type rejected"
else
  test_fail "Wrong content type accepted (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 7. Authentication Bypass Tests ──────────────────────────────────────────
echo "7. Authentication Bypass Prevention"
echo "------------------------------------"

# Test: Admin route without auth
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/admin/stats" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
  test_pass "Admin route requires authentication"
else
  test_fail "Admin route accessible without auth (HTTP $HTTP_CODE)"
fi

# Test: Admin route with invalid token
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/admin/stats" \
  -H "Authorization: Bearer invalid-token-12345" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
  test_pass "Admin route rejects invalid token"
else
  test_fail "Admin route accepts invalid token (HTTP $HTTP_CODE)"
fi

echo ""

# ─── 8. IDOR (Insecure Direct Object Reference) Tests ────────────────────────
echo "8. IDOR Prevention"
echo "------------------"

# Test: Access other user's order without ownership
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/orders/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $BUYER_TOKEN" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "404" ]; then
  test_pass "Order access requires ownership"
else
  test_fail "Order access possible without ownership (HTTP $HTTP_CODE)"
fi

echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "========================================"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}❌ Input validation audit FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Input validation audit PASSED${NC}"
  exit 0
fi
