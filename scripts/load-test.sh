#!/bin/bash
# ==============================================================================
# Waw (واو) — Load Testing Setup & Runner
# ==============================================================================
# Sets up and runs load tests using k6.
# Usage: bash scripts/load-test.sh [scenario]

set -e

SCENARIO="${1:-smoke}"
API_BASE="${API_BASE_URL:-http://localhost:4000}"
echo "🚀 Waw Load Testing"
echo "===================="
echo "API Base: $API_BASE"
echo "Scenario: $SCENARIO"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
  echo "⚠️  k6 is not installed. Installing..."
  
  # Detect OS and install k6
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo apt-get update && sudo apt-get install -y k6
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew install k6
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    echo "For Windows, please install k6 manually:"
    echo "  https://k6.io/docs/getting-started/installation/"
    exit 1
  else
    echo "Unsupported OS. Please install k6 manually."
    exit 1
  fi
fi

# ─── Load Test Scenarios ─────────────────────────────────────────────────────

# Smoke Test (Quick validation)
run_smoke_test() {
  echo "🔥 Running Smoke Test (1 VU, 30s)..."
  
  k6 run --vus 1 --duration 30s \
    -e BASE_URL="$API_BASE" \
    -e SCENARIO="smoke" \
    --out json=load-test-results.json \
    - <<'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  // Health check
  let res = http.get(`${BASE_URL}/health`);
  check(res, { 'health status is 200': (r) => r.status === 200 });
  
  // Products listing
  res = http.get(`${BASE_URL}/api/products?limit=10`);
  check(res, { 'products status is 200': (r) => r.status === 200 });
  
  // Categories
  res = http.get(`${BASE_URL}/api/categories`);
  check(res, { 'categories status is 200': (r) => r.status === 200 });
  
  sleep(1);
}
EOF
}

# Load Test (Normal traffic)
run_load_test() {
  echo "📈 Running Load Test (10 VUs, 5 min)..."
  
  k6 run --vus 10 --duration 5m \
    -e BASE_URL="$API_BASE" \
    -e SCENARIO="load" \
    --out json=load-test-results.json \
    - <<'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '2m', target: 10 },
    { duration: '30s', target: 15 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // Simulate user journey
  let res = http.get(`${BASE_URL}/api/products?limit=20`);
  check(res, { 'products status is 200': (r) => r.status === 200 });
  
  sleep(Math.random() * 2 + 1);
  
  res = http.get(`${BASE_URL}/api/categories`);
  check(res, { 'categories status is 200': (r) => r.status === 200 });
  
  sleep(Math.random() * 2 + 1);
  
  res = http.get(`${BASE_URL}/api/search?q=phone`);
  check(res, { 'search status is 200': (r) => r.status === 200 });
  
  sleep(Math.random() * 3 + 1);
}
EOF
}

# Stress Test (High traffic)
run_stress_test() {
  echo "💪 Running Stress Test (50 VUs, 10 min)..."
  
  k6 run --vus 50 --duration 10m \
    -e BASE_URL="$API_BASE" \
    -e SCENARIO="stress" \
    --out json=load-test-results.json \
    - <<'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '1m', target: 70 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  // Simulate realistic user journey
  let res = http.get(`${BASE_URL}/api/products?limit=20`);
  check(res, { 'products status is 200': (r) => r.status === 200 });
  
  sleep(Math.random() * 3 + 1);
  
  // Product detail
  res = http.get(`${BASE_URL}/api/products/test-product`);
  check(res, { 'product detail status is 200 or 404': (r) => r.status === 200 || r.status === 404 });
  
  sleep(Math.random() * 2 + 1);
  
  // Search
  res = http.get(`${BASE_URL}/api/search?q=phone`);
  check(res, { 'search status is 200': (r) => r.status === 200 });
  
  sleep(Math.random() * 2 + 1);
  
  // Cart operations
  res = http.get(`${BASE_URL}/api/cart?guestToken=test-${Date.now()}`);
  check(res, { 'cart status is 200': (r) => r.status === 200 });
  
  sleep(Math.random() * 3 + 1);
}
EOF
}

# Spike Test (Sudden traffic spike)
run_spike_test() {
  echo "⚡ Running Spike Test (100 VUs, 5 min)..."
  
  k6 run --vus 100 --duration 5m \
    -e BASE_URL="$API_BASE" \
    -e SCENARIO="spike" \
    --out json=load-test-results.json \
    - <<'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '10s', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '10s', target: 5 },
    { duration: '2m', target: 5 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.15'],
  },
};

export default function () {
  let res = http.get(`${BASE_URL}/api/products?limit=10`);
  check(res, { 'products status is 200': (r) => r.status === 200 });
  
  sleep(Math.random() * 2 + 1);
}
EOF
}

# ─── Run Selected Scenario ───────────────────────────────────────────────────

case $SCENARIO in
  smoke)
    run_smoke_test
    ;;
  load)
    run_load_test
    ;;
  stress)
    run_stress_test
    ;;
  spike)
    run_spike_test
    ;;
  all)
    echo "Running all scenarios sequentially..."
    run_smoke_test
    echo ""
    run_load_test
    echo ""
    run_stress_test
    echo ""
    run_spike_test
    ;;
  *)
    echo "Unknown scenario: $SCENARIO"
    echo "Available scenarios: smoke, load, stress, spike, all"
    exit 1
    ;;
esac

echo ""
echo "✅ Load test completed!"
echo "Results saved to: load-test-results.json"
echo ""
echo "To view results in HTML:"
echo "  k6 run --out json=results.json scripts/load-test.js"
echo "  k6-reporter results.json"
