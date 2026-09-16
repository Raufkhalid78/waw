import { API_BASE_URL } from "@waw/config";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = API_BASE_URL.replace(/\/+$/, "");

/**
 * GET /api/auth/session/me  (same-origin proxy)
 *
 * Forwards the browser's HttpOnly session cookie to the API and returns
 * the current user. Called by AdminSession.tsx and ClientAuthGuard.tsx
 * so those components never need a cross-origin fetch.
 *
 * Also handles silent session refresh: if the API returns 401 and the
 * browser carries a waw_refresh cookie, the proxy transparently calls
 * /api/auth/session/refresh, forwards the new cookies, then retries /me.
 */
export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  // ── Primary attempt ────────────────────────────────────────────────────────
  const meRes = await fetch(`${API_BASE}/api/auth/session/me`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });

  if (meRes.ok) {
    const data = await meRes.json();
    return NextResponse.json(data);
  }

  // ── Silent refresh on 401 (access token expired) ───────────────────────────
  if (meRes.status === 401 && cookieHeader.includes("waw_refresh")) {
    const refreshRes = await fetch(`${API_BASE}/api/auth/session/refresh`, {
      method: "POST",
      headers: { Cookie: cookieHeader, "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (refreshRes.ok) {
      // Retry /me with the new access token (the API returns it in the body
      // for server-to-server calls; we pass it as a Bearer header).
      const refreshData = await refreshRes.json();
      const newAccessToken: string | undefined = refreshData.accessToken;

      const retryHeaders: Record<string, string> = { Cookie: cookieHeader };
      if (newAccessToken) retryHeaders["Authorization"] = `Bearer ${newAccessToken}`;

      const retryRes = await fetch(`${API_BASE}/api/auth/session/me`, {
        headers: retryHeaders,
        cache: "no-store",
      });

      if (retryRes.ok) {
        const userData = await retryRes.json();
        const response = NextResponse.json(userData);

        // Forward the refreshed cookies to the browser so future requests
        // carry the new waw_session + waw_refresh cookies.
        const newCookies = refreshRes.headers.getSetCookie();
        for (const cookie of newCookies) {
          response.headers.append("Set-Cookie", cookie);
        }

        return response;
      }
    }
  }

  // ── Unauthenticated — clear stale cookies ─────────────────────────────────
  const errData = await meRes.json().catch(() => ({ error: "Not authenticated" }));
  const response = NextResponse.json(errData, { status: meRes.status });
  response.cookies.delete("waw_session");
  return response;
}
