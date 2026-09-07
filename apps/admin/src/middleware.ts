import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

/**
 * Validate session by calling the API's server-authoritative session endpoint.
 * Never parse tokens locally — always trust the API's session verification.
 */
async function validateSession(cookieHeader: string): Promise<{ valid: boolean; role?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/session/me`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return { valid: false };
    const data = await res.json();
    return { valid: true, role: data.user?.role };
  } catch {
    return { valid: false };
  }
}

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("waw_session")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";

  // Build cookie header for API call
  const cookieHeader = request.cookies.toString();

  // Allow login page without token
  if (isLoginPage) {
    if (sessionCookie) {
      const { valid, role } = await validateSession(cookieHeader);
      if (valid && (role === "ADMIN" || role === "SUPER_ADMIN")) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    const response = NextResponse.next();
    if (sessionCookie) {
      response.cookies.delete("waw_session");
    }
    return response;
  }

  // All non-login routes require a valid ADMIN session
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { valid, role } = await validateSession(cookieHeader);

  if (!valid || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
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
