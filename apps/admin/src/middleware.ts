import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isValidJwt(token: string): boolean {
  if (!token || token.length < 10) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";

  // Allow login page without token
  if (isLoginPage) {
    if (token && isValidJwt(token)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Clear invalid token cookie on login page
    const response = NextResponse.next();
    if (token && !isValidJwt(token)) {
      response.cookies.delete("admin_token");
    }
    return response;
  }

  // Block all other routes without valid token
  if (!token || !isValidJwt(token)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    const response = NextResponse.redirect(loginUrl);
    // Clear invalid token cookie
    if (token) response.cookies.delete("admin_token");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
