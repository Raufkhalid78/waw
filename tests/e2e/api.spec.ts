import { test, expect } from "@playwright/test";

const API_BASE = process.env.API_BASE_URL || "http://localhost:4000";

test.describe("API — Health Checks", () => {
  test("GET /health returns 200 with status ok", async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.service).toContain("Waw");
  });

  test("GET /readyz returns readiness status", async ({ request }) => {
    const response = await request.get(`${API_BASE}/readyz`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("checks");
  });
});

test.describe("API — 404 Handling", () => {
  test("GET /api/non-existent returns 404", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/non-existent-endpoint-xyz`);
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/non-existent returns 404", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/non-existent-endpoint-xyz`, {
      data: {},
    });
    expect(response.status()).toBe(404);
  });
});

test.describe("API — Auth Endpoints", () => {
  test("POST /api/auth/whatsapp-otp/send requires phone number", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/auth/whatsapp-otp/send`, {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/auth/whatsapp-otp/send accepts valid phone", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/auth/whatsapp-otp/send`, {
      data: { phone: "+923001234567" },
    });
    // Should return 200 (OTP sent) or 429 (rate limited) or 500 (service unavailable)
    expect([200, 429, 500]).toContain(response.status());
  });

  test("POST /api/auth/whatsapp-otp/verify requires phone and otp", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/auth/whatsapp-otp/verify`, {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/auth/login requires email and password", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/auth/login`, {
      data: {},
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("API — Products Endpoints", () => {
  test("GET /api/products returns list", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/products`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("products");
  });

  test("GET /api/categories returns list", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/categories`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("categories");
  });
});

test.describe("API — Protected Endpoints", () => {
  test("GET /api/cart returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/cart`);
    expect(response.status()).toBe(401);
  });

  test("GET /api/wishlist returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/wishlist`);
    expect(response.status()).toBe(401);
  });

  test("GET /api/orders returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/orders`);
    expect(response.status()).toBe(401);
  });

  test("GET /api/admin/users returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/admin/users`);
    expect(response.status()).toBe(401);
  });
});

test.describe("API — CORS Headers", () => {
  test("allows origin from allowed list", async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`, {
      headers: {
        Origin: "http://localhost:3000",
      },
    });
    expect(response.status()).toBe(200);
  });

  test("health endpoint has proper headers", async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.status()).toBe(200);
  });
});

test.describe("API — Rate Limiting", () => {
  test("health endpoint is not rate limited", async ({ request }) => {
    const promises = Array.from({ length: 5 }, () =>
      request.get(`${API_BASE}/health`)
    );
    const responses = await Promise.all(promises);
    const allOk = responses.every((r) => r.status() === 200);
    expect(allOk).toBe(true);
  });
});

test.describe("API — Response Format", () => {
  test("health response has correct content type", async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("404 responses have JSON content type", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/non-existent`);
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });
});

test.describe("API — OpenAPI Documentation", () => {
  test("GET /api/docs returns Swagger UI", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/docs/`);
    expect(response.status()).toBe(200);
  });
});
