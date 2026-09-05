import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "";

async function verifyJwt(token: string): Promise<{ valid: boolean; payload?: any }> {
  if (!token || token.length < 10) return { valid: false };
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false };
  try {
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) return { valid: false };

    // Check that the token was issued by us
    if (payload.iss && payload.iss !== "waw-marketplace") return { valid: false };

    // Check role is ADMIN
    if (payload.role !== "ADMIN") return { valid: false };

    // Verify HMAC-SHA256 signature
    if (JWT_SECRET && header.alg === "HS256") {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(JWT_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      const signatureValid = await crypto.subtle.verify(
        "HMAC",
        key,
        Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0)),
        encoder.encode(`${parts[0]}.${parts[1]}`)
      );
      if (!signatureValid) return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("waw_admin_token")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";

  // Allow login page without token
  if (isLoginPage) {
    if (token && (await verifyJwt(token)).valid) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const response = NextResponse.next();
    if (token && !(await verifyJwt(token)).valid) {
      response.cookies.delete("waw_admin_token");
    }
    return response;
  }

  // Block all other routes without valid token
  const { valid } = await verifyJwt(token || "");
  if (!token || !valid) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    const response = NextResponse.redirect(loginUrl);
    if (token) response.cookies.delete("waw_admin_token");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
