import { API_BASE_URL } from "@waw/config";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_BASE = (
  API_BASE_URL
).replace(/\/+$/, "");

/**
 * Short-TTL in-memory session cache. Middleware runs on every navigation;
 * without this cache each page view costs a serialized API round-trip and
 * an API outage bricks the whole seller portal. 30s TTL keeps revocation
 * near-immediate while collapsing redundant validation calls.
 * Keyed by the session cookie value — never log or persist the key.
 */
const SESSION_CACHE_TTL_MS = 30_000;
const sessionCache = new Map<string, { result: { valid: boolean; role?: string }; expiresAt: number }>();

async function validateSession(cookieHeader: string): Promise<{ valid: boolean; role?: string }> {
  const cached = sessionCache.get(cookieHeader);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }
  try {
    const res = await fetch(`${API_BASE}/api/auth/session/me`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return { valid: false };
    const data = await res.json();
    const result = { valid: true, role: data.user?.role as string | undefined };
    sessionCache.set(cookieHeader, { result, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
    return result;
  } catch {
    return { valid: false };
  }
}

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("waw_session")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";

  // Build cookie header for API call
  const cookieHeader = request.cookies.toString();

  if (isLoginPage) {
    if (sessionCookie) {
      const { valid, role } = await validateSession(cookieHeader);
      if (valid && role === "SELLER") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    // Clear invalid session cookie
    const response = NextResponse.next();
    if (sessionCookie) {
      response.cookies.delete("waw_session");
    }
    return response;
  }

  // All non-login routes require a valid SELLER session
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { valid, role } = await validateSession(cookieHeader);

  if (!valid || role !== "SELLER") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("waw_session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
