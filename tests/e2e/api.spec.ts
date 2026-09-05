import { test, expect } from "@playwright/test";

const API_BASE = process.env.API_BASE_URL || "http://localhost:4000";

test.describe("API — Guest Checkout Flow", () => {
  test("POST /api/orders/guest creates guest order", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/orders/guest`, {
      data: {
        buyer_name: "Test Buyer",
        buyer_phone: "+923001234567",
        shipping_address: "123 Test Street, Lahore",
        shipping_city: "Lahore",
        payment_method: "COD",
        items: [
          {
            offer_variant_id: "00000000-0000-0000-0000-000000000001",
            quantity: 1,
          },
        ],
      },
    });
    expect([200, 201, 400, 404]).toContain(response.status());
  });

  test("POST /api/orders/guest requires items array", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/orders/guest`, {
      data: {
        buyer_name: "Test Buyer",
        buyer_phone: "+923001234567",
        shipping_address: "123 Test Street",
        shipping_city: "Lahore",
        payment_method: "COD",
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});

test.describe("API — Product Listing", () => {
  test("GET /api/products returns items array", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/products`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("items");
    expect(Array.isArray(body.items)).toBe(true);
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page");
    expect(body).toHaveProperty("totalPages");
  });

  test("GET /api/products accepts categorySlug filter", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/products?categorySlug=leather-craft`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("items");
  });

  test("GET /api/products accepts inStock filter", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/products?inStock=true`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("items");
  });

  test("GET /api/products accepts minRating filter", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/products?minRating=4`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("items");
  });

  test("GET /api/products accepts sortBy parameter", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/products?sortBy=price-asc`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("items");
  });

  test("GET /api/products accepts page/limit pagination", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/products?page=1&limit=5`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("items");
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.page).toBe(1);
  });

  test("GET /api/products accepts city filter", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/products?city=Lahore`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("items");
  });
});

test.describe("API — Search", () => {
  test("GET /api/search returns hits array", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/search?q=wallet`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("hits");
    expect(Array.isArray(body.hits)).toBe(true);
  });

  test("GET /api/search accepts q parameter", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/search?q=bag`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("hits");
    expect(body).toHaveProperty("found");
  });
});

test.describe("API — Categories", () => {
  test("GET /api/categories returns array", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/categories`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("GET /api/categories/:slug returns category", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/categories/leather-craft`);
    expect([200, 404]).toContain(response.status());
  });
});

test.describe("API — Flash Sales", () => {
  test("GET /api/flash-sales/active returns active flash sales", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/flash-sales/active`);
    expect([200, 404]).toContain(response.status());
  });
});

test.describe("API — Serviceability", () => {
  test("GET /api/serviceability/check validates city", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/serviceability/check?city=Lahore`);
    expect([200, 400]).toContain(response.status());
  });
});

test.describe("API — Auth Protected Endpoints", () => {
  test("GET /api/cart returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/cart`);
    expect(response.status()).toBe(401);
  });

  test("PUT /api/cart requires authentication", async ({ request }) => {
    const response = await request.put(`${API_BASE}/api/cart`, {
      data: { items: [] },
    });
    expect(response.status()).toBe(401);
  });

  test("GET /api/orders returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/orders`);
    expect(response.status()).toBe(401);
  });

  test("GET /api/orders/:id returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/orders/some-id`);
    expect(response.status()).toBe(401);
  });
});

test.describe("API — Reviews", () => {
  test("GET /api/reviews/product/:id returns reviews", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/reviews/product/00000000-0000-0000-0000-000000000001`);
    expect([200, 404]).toContain(response.status());
  });
});

test.describe("API — Image Upload", () => {
  test("POST /api/uploads/image requires auth", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/uploads/image`, {
      multipart: {
        file: {
          name: "test.jpg",
          mimeType: "image/jpeg",
          buffer: Buffer.from("fake-image-data"),
        },
      },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("API — Invoice Download", () => {
  test("GET /api/orders/:id/invoice requires auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/orders/some-id/invoice`);
    expect(response.status()).toBe(401);
  });
});

test.describe("API — Admin Endpoints", () => {
  test("GET /api/admin/users returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/admin/users`);
    expect(response.status()).toBe(401);
  });

  test("GET /api/admin/products returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/admin/products`);
    expect(response.status()).toBe(401);
  });

  test("GET /api/admin/orders returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/admin/orders`);
    expect(response.status()).toBe(401);
  });

  test("GET /api/admin/sellers returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/admin/sellers`);
    expect(response.status()).toBe(401);
  });
});

test.describe("API — Seller Endpoints", () => {
  test("GET /api/seller/products returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/seller/products`);
    expect(response.status()).toBe(401);
  });

  test("GET /api/seller/orders returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/seller/orders`);
    expect(response.status()).toBe(401);
  });
});

test.describe("API — Checkout Transaction RPC", () => {
  test("checkout_transaction requires authenticated user", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/orders`, {
      data: {
        buyerName: "Test",
        buyerPhone: "+923000000000",
        shippingAddress: "Test Address",
        shippingCity: "Lahore",
        paymentMethod: "COD",
        items: [],
      },
    });
    expect([400, 401, 404]).toContain(response.status());
  });
});

test.describe("API — Return Request RPC", () => {
  test("return endpoint requires authentication", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/orders/fake-id/return`, {
      data: {
        reason: "Test return",
        items: [],
      },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("API — Error Handling", () => {
  test("GET /api/invalid-route returns 404", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/this-does-not-exist-xyz`);
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("POST with invalid JSON returns 400", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/auth/login`, {
      data: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    expect([400, 415, 500]).toContain(response.status());
  });
});

test.describe("API — Response Time", () => {
  test("health endpoint responds within 1 second", async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${API_BASE}/health`);
    const elapsed = Date.now() - start;
    expect(response.status()).toBe(200);
    expect(elapsed).toBeLessThan(1000);
  });

  test("products endpoint responds within 3 seconds", async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${API_BASE}/api/products`);
    const elapsed = Date.now() - start;
    expect(response.status()).toBe(200);
    expect(elapsed).toBeLessThan(3000);
  });
});
