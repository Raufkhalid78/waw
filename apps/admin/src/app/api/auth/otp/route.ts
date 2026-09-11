import { API_BASE_URL } from "@waw/config";

import { NextRequest, NextResponse } from "next/server";

const API_BASE = API_BASE_URL.replace(/\/+$/, "");

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "FINANCE", "OPS_AGENT", "MODERATOR"];

/**
 * Server-side proxy for admin mobile-OTP login.
 * The API's session cookies are SameSite=Strict — a cross-origin browser call
 * can never land them on this origin, so the exchange MUST happen here and
 * the cookies be forwarded same-origin.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp, mfaCode } = body;

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Phone and OTP are required" },
        { status: 400 }
      );
    }

    // Step 1: verify the OTP with the API
    const verifyRes = await fetch(`${API_BASE}/api/auth/whatsapp-otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp, role: "ADMIN" }),
    });

    const verifyData = await verifyRes.json().catch(() => ({}));

    if (!verifyRes.ok) {
      return NextResponse.json(
        { error: verifyData.error || "OTP verification failed" },
        { status: verifyRes.status }
      );
    }

    if (!ADMIN_ROLES.includes(verifyData.user?.role)) {
      return NextResponse.json(
        { error: "Access denied. Admin only." },
        { status: 403 }
      );
    }

    // Step 2: create the server session (enforces MFA for enrolled admins)
    const sessionRes = await fetch(`${API_BASE}/api/auth/session/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: verifyData.user.id,
        authToken: verifyData.token,
        userRole: verifyData.user.role,
        userPhone: verifyData.user.phone,
        userEmail: verifyData.user.email,
        mfaCode,
      }),
    });

    if (!sessionRes.ok) {
      const sessionErr = await sessionRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: sessionErr.error || "Session creation failed",
          code: sessionErr.code,
        },
        { status: sessionRes.status }
      );
    }

    // Step 3: forward session cookies from API to the browser (same-origin)
    const response = NextResponse.json({ user: verifyData.user });

    const setCookies = sessionRes.headers.getSetCookie();
    for (const cookieHeader of setCookies) {
      response.headers.append("Set-Cookie", cookieHeader);
    }

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
