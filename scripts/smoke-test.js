const https = require('https');
const http = require('http');

const API_BASE = process.env.API_URL || 'http://localhost:4000';

function fetchApi(path) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data ? JSON.parse(data) : null
        });
      });
    }).on('error', err => reject(err));
  });
}

async function runSmokeTests() {
  console.log(`🚀 Running WAW Smoke Tests against ${API_BASE}\n`);
  let passed = true;

  try {
    // 1. Check Categories Tree
    process.stdout.write('1. Checking GET /api/categories... ');
    const cats = await fetchApi('/api/categories');
    if (cats.status === 200 && Array.isArray(cats.data) && cats.data.length > 0) {
      console.log('✅ PASSED');
    } else {
      console.log(`❌ FAILED (Status: ${cats.status}, Length: ${cats.data?.length || 0})`);
      passed = false;
    }

    // 2. Check Specific Category (e.g. fashion)
    process.stdout.write('2. Checking GET /api/categories/fashion... ');
    const fashion = await fetchApi('/api/categories/fashion');
    if (fashion.status === 200 && fashion.data && fashion.data.slug === 'fashion') {
      console.log('✅ PASSED');
    } else {
      console.log(`❌ FAILED (Status: ${fashion.status})`);
      passed = false;
    }

    // 3. Check Products (Category filter)
    process.stdout.write('3. Checking GET /api/products?categorySlug=fashion... ');
    const prods = await fetchApi('/api/products?categorySlug=fashion');
    if (prods.status === 200 && prods.data && Array.isArray(prods.data.items)) {
      console.log('✅ PASSED');
    } else {
      console.log(`❌ FAILED (Status: ${prods.status})`);
      passed = false;
    }
    
    // 4. Check Config
    process.stdout.write('4. Checking GET /api/config/storefront... ');
    const config = await fetchApi('/api/config/storefront');
    if (config.status === 200 && config.data && config.data.cities) {
      console.log('✅ PASSED');
    } else {
      console.log(`❌ FAILED (Status: ${config.status})`);
      passed = false;
    }

  } catch (err) {
    console.error('\n💥 SMOKE TEST CRASHED:', err.message);
    passed = false;
  }

  console.log('\n=======================================');
  if (passed) {
    console.log('🎉 ALL SMOKE TESTS PASSED! Safe to release.');
    process.exit(0);
  } else {
    console.error('🚨 SMOKE TESTS FAILED! Deployment should be blocked.');
    console.error('Ensure the production database is seeded with categories.');
    process.exit(1);
  }
}

runSmokeTests();
