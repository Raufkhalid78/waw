import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Canonicalize the apex domain onto www. OAuth state/PKCE cookies, session
 * cookies and CSRF all depend on a single canonical host; letting visitors
 * bounce between waw.com.pk and www.waw.com.pk strands cookies on the other
 * host (the documented invalid_state failure). Localhost and dev/staging
 * hosts are untouched.
 */
export function middleware(request: NextRequest) {
  const host = request.nextUrl.hostname;

  if (host === "waw.com.pk") {
    const url = new URL(
      `https://www.waw.com.pk${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
