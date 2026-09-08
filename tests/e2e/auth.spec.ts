import { test, expect } from "@playwright/test";

/**
 * Authentication bootstrap E2E — proves the first-session contract:
 * OTP request → OTP verify → session/create with authToken → httpOnly
 * session cookie issued. Runs against a locally seeded staging API.
 *
 * Requires ALLOW_TEST_OTP=true on the API (non-production) and a seeded
 * buyer profile for +923000000001.
 */

const API_BASE = process.env.E2E_API_BASE || "http://localhost:4000";
const TEST_PHONE = process.env.E2E_TEST_PHONE || "+923000000001";
const TEST_OTP = process.env.E2E_TEST_OTP || "123456";

test.describe("Auth — first session bootstrap", () => {
  test("OTP login issues a real server session cookie", async ({ request }) => {
    // 1. Send OTP
    const sendRes = await request.post(`${API_BASE}/api/auth/whatsapp-otp/send`, {
      data: { phone: TEST_PHONE },
    });
    expect(sendRes.ok()).toBeTruthy();
    const sendBody = await sendRes.json();
    expect(sendBody.success).toBe(true);

    // 2. Verify OTP — must return BOTH user and a token
    const verifyRes = await request.post(`${API_BASE}/api/auth/whatsapp-otp/verify`, {
      data: { phone: TEST_PHONE, otp: TEST_OTP },
    });
    expect(verifyRes.ok()).toBeTruthy();
    const verifyBody = await verifyRes.json();
    expect(verifyBody.user?.id).toBeTruthy();
    expect(typeof verifyBody.token).toBe("string");
    expect((verifyBody.token as string).length).toBeGreaterThan(20);

    // 3. Create session with the verified token — must succeed and set cookies
    const sessionRes = await request.post(`${API_BASE}/api/auth/session/create`, {
      data: {
        userId: verifyBody.user.id,
        authToken: verifyBody.token,
        userRole: verifyBody.user.role || "BUYER",
        userPhone: verifyBody.user.phone,
      },
    });
    expect(sessionRes.ok()).toBeTruthy();

    const setCookies = sessionRes.headers()["set-cookie"] || "";
    expect(setCookies).toContain("waw_session");
    expect(setCookies).toContain("HttpOnly");

    const sessionBody = await sessionRes.json();
    expect(sessionBody.success).toBe(true);
    expect(sessionBody.user?.id).toBe(verifyBody.user.id);
  });

  test("session/create without authToken is rejected (401)", async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/auth/session/create`, {
      data: { userId: "user_someone", userRole: "BUYER" },
    });
    expect(res.status()).toBe(401);
  });

  test("session/create with a tampered authToken is rejected (401)", async ({ request }) => {
    // A syntactically-JWT-shaped token signed with the wrong secret
    const forgedToken =
      "eyJhbGciOiJIUzI1NiJ9." +
      "eyJzdWIiOiJ1c2VyX2ZvcmdlciIsInBob25lIjoiKzkyMzAwMDAwMDAwMSIsInJvbGUiOiJCWVlFUiJ9." +
      "AAAA-forged-signature";
    const res = await request.post(`${API_BASE}/api/auth/session/create`, {
      data: {
        userId: "user_forged",
        authToken: forgedToken,
        userRole: "BUYER",
      },
    });
    expect(res.status()).toBe(401);
  });
});
