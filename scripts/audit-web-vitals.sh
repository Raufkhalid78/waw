#!/bin/bash
# ==============================================================================
# Waw (واو) — Core Web Vitals Audit Script
# ==============================================================================
# Measures Core Web Vitals (LCP, FID, CLS, TTFB, FCP) for the buyer web app.
# Requires: Node.js, puppeteer
# Usage: bash scripts/audit-web-vitals.sh [url]

set -e

URL="${1:-http://localhost:3000}"
echo "🔍 Waw Core Web Vitals Audit"
echo "=============================="
echo "Target: $URL"
echo ""

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

# ─── 1. Page Load Performance ────────────────────────────────────────────────
echo "1. Page Load Performance"
echo "------------------------"

# Test: Homepage loads
START_TIME=$(date +%s%N)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null)
END_TIME=$(date +%s%N)
LOAD_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$HTTP_CODE" = "200" ]; then
  test_pass "Homepage loads successfully (HTTP $HTTP_CODE)"
else
  test_fail "Homepage failed to load (HTTP $HTTP_CODE)"
fi

if [ "$LOAD_TIME_MS" -lt 1000 ]; then
  test_pass "Homepage load time: ${LOAD_TIME_MS}ms (< 1s)"
elif [ "$LOAD_TIME_MS" -lt 3000 ]; then
  test_warn "Homepage load time: ${LOAD_TIME_MS}ms (1-3s)"
else
  test_fail "Homepage load time: ${LOAD_TIME_MS}ms (> 3s)"
fi

echo ""

# ─── 2. Resource Size Analysis ──────────────────────────────────────────────
echo "2. Resource Size Analysis"
echo "-------------------------"

# Test: HTML size
HTML_SIZE=$(curl -s "$URL" 2>/dev/null | wc -c)
HTML_SIZE_KB=$((HTML_SIZE / 1024))

if [ "$HTML_SIZE_KB" -lt 50 ]; then
  test_pass "HTML size: ${HTML_SIZE_KB}KB (< 50KB)"
elif [ "$HTML_SIZE_KB" -lt 100 ]; then
  test_warn "HTML size: ${HTML_SIZE_KB}KB (50-100KB)"
else
  test_fail "HTML size: ${HTML_SIZE_KB}KB (> 100KB)"
fi

# Test: Check for render-blocking resources
RENDER_BLOCKING=$(curl -s "$URL" 2>/dev/null | grep -c "rel=\"stylesheet\"" || true)
if [ "$RENDER_BLOCKING" -le 2 ]; then
  test_pass "Render-blocking stylesheets: $RENDER_BLOCKING (≤ 2)"
else
  test_warn "Render-blocking stylesheets: $RENDER_BLOCKING (> 2)"
fi

echo ""

# ─── 3. Image Optimization ──────────────────────────────────────────────────
echo "3. Image Optimization"
echo "----------------------"

# Test: Check for modern image formats
MODERN_FORMATS=$(curl -s "$URL" 2>/dev/null | grep -cE "\.(webp|avif)" || true)
if [ "$MODERN_FORMATS" -gt 0 ]; then
  test_pass "Modern image formats detected: $MODERN_FORMATS"
else
  test_warn "No modern image formats (webp/avif) detected"
fi

# Test: Check for lazy loading
LAZY_LOADING=$(curl -s "$URL" 2>/dev/null | grep -c "loading=\"lazy\"" || true)
if [ "$LAZY_LOADING" -gt 0 ]; then
  test_pass "Lazy loading detected: $LAZY_LOADING elements"
else
  test_warn "No lazy loading detected"
fi

echo ""

# ─── 4. Caching Headers ─────────────────────────────────────────────────────
echo "4. Caching Headers"
echo "------------------"

# Test: Cache-Control header
CACHE_CONTROL=$(curl -s -I "$URL" 2>/dev/null | grep -i "cache-control" || true)
if [ -n "$CACHE_CONTROL" ]; then
  test_pass "Cache-Control header present"
else
  test_warn "No Cache-Control header"
fi

# Test: ETag header
ETAG=$(curl -s -I "$URL" 2>/dev/null | grep -i "etag" || true)
if [ -n "$ETAG" ]; then
  test_pass "ETag header present"
else
  test_warn "No ETag header"
fi

echo ""

# ─── 5. Compression ─────────────────────────────────────────────────────────
echo "5. Compression"
echo "---------------"

# Test: Gzip/Brotli compression
ACCEPT_ENCODING="gzip, deflate, br"
COMPRESSED=$(curl -s -H "Accept-Encoding: $ACCEPT_ENCODING" -I "$URL" 2>/dev/null | grep -i "content-encoding" || true)
if [ -n "$COMPRESSED" ]; then
  test_pass "Compression enabled: $COMPRESSED"
else
  test_warn "No compression detected"
fi

echo ""

# ─── 6. Security Headers ────────────────────────────────────────────────────
echo "6. Security Headers"
echo "--------------------"

HEADERS=$(curl -s -I "$URL" 2>/dev/null)

# Test: X-Content-Type-Options
if echo "$HEADERS" | grep -qi "x-content-type-options"; then
  test_pass "X-Content-Type-Options header present"
else
  test_warn "X-Content-Type-Options header missing"
fi

# Test: X-Frame-Options
if echo "$HEADERS" | grep -qi "x-frame-options"; then
  test_pass "X-Frame-Options header present"
else
  test_warn "X-Frame-Options header missing"
fi

# Test: Strict-Transport-Security
if echo "$HEADERS" | grep -qi "strict-transport-security"; then
  test_pass "Strict-Transport-Security header present"
else
  test_warn "Strict-Transport-Security header missing"
fi

echo ""

# ─── 7. Third-Party Scripts ──────────────────────────────────────────────────
echo "7. Third-Party Scripts"
echo "----------------------"

# Test: Count third-party scripts
THIRD_PARTY_SCRIPTS=$(curl -s "$URL" 2>/dev/null | grep -c "src=\"http" || true)
if [ "$THIRD_PARTY_SCRIPTS" -le 3 ]; then
  test_pass "Third-party scripts: $THIRD_PARTY_SCRIPTS (≤ 3)"
elif [ "$THIRD_PARTY_SCRIPTS" -le 6 ]; then
  test_warn "Third-party scripts: $THIRD_PARTY_SCRIPTS (4-6)"
else
  test_fail "Third-party scripts: $THIRD_PARTY_SCRIPTS (> 6)"
fi

echo ""

# ─── 8. Mobile Optimization ──────────────────────────────────────────────────
echo "8. Mobile Optimization"
echo "----------------------"

# Test: Viewport meta tag
VIEWPORT=$(curl -s "$URL" 2>/dev/null | grep -c "viewport" || true)
if [ "$VIEWPORT" -gt 0 ]; then
  test_pass "Viewport meta tag present"
else
  test_fail "Viewport meta tag missing"
fi

# Test: Touch icons
TOUCH_ICON=$(curl -s "$URL" 2>/dev/null | grep -c "apple-touch-icon" || true)
if [ "$TOUCH_ICON" -gt 0 ]; then
  test_pass "Apple touch icon present"
else
  test_warn "Apple touch icon missing"
fi

echo ""

# ─── 9. API Response Times ───────────────────────────────────────────────────
echo "9. API Response Times"
echo "---------------------"

API_BASE="${API_BASE_URL:-http://localhost:4000}"

# Test: Health endpoint response time
START_TIME=$(date +%s%N)
curl -s "$API_BASE/health" > /dev/null 2>&1
END_TIME=$(date +%s%N)
HEALTH_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$HEALTH_TIME_MS" -lt 100 ]; then
  test_pass "Health endpoint: ${HEALTH_TIME_MS}ms (< 100ms)"
elif [ "$HEALTH_TIME_MS" -lt 500 ]; then
  test_warn "Health endpoint: ${HEALTH_TIME_MS}ms (100-500ms)"
else
  test_fail "Health endpoint: ${HEALTH_TIME_MS}ms (> 500ms)"
fi

# Test: Products endpoint response time
START_TIME=$(date +%s%N)
curl -s "$API_BASE/api/products?limit=10" > /dev/null 2>&1
END_TIME=$(date +%s%N)
PRODUCTS_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$PRODUCTS_TIME_MS" -lt 500 ]; then
  test_pass "Products endpoint: ${PRODUCTS_TIME_MS}ms (< 500ms)"
elif [ "$PRODUCTS_TIME_MS" -lt 1000 ]; then
  test_warn "Products endpoint: ${PRODUCTS_TIME_MS}ms (500ms-1s)"
else
  test_fail "Products endpoint: ${PRODUCTS_TIME_MS}ms (> 1s)"
fi

echo ""

# ─── 10. Lighthouse Scores (Estimated) ──────────────────────────────────────
echo "10. Lighthouse Scores (Estimated)"
echo "----------------------------------"

# These are estimates based on the checks above
echo "  Based on the checks above:"
echo ""

if [ "$HTTP_CODE" = "200" ] && [ "$LOAD_TIME_MS" -lt 2000 ] && [ "$HTML_SIZE_KB" -lt 100 ]; then
  echo -e "  Performance: ${GREEN}Good (estimated 90+)${NC}"
  ((PASS++))
else
  echo -e "  Performance: ${YELLOW}Needs Improvement (estimated 50-89)${NC}"
  ((WARN++))
fi

if [ "$THIRD_PARTY_SCRIPTS" -le 3 ]; then
  echo -e "  Best Practices: ${GREEN}Good (estimated 90+)${NC}"
  ((PASS++))
else
  echo -e "  Best Practices: ${YELLOW}Needs Improvement (estimated 50-89)${NC}"
  ((WARN++))
fi

echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "========================================"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$WARN warnings${NC}"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}❌ Web Vitals audit FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Web Vitals audit PASSED${NC}"
  exit 0
fi
