import { API_BASE_URL } from "@waw/config";

import { NextRequest, NextResponse } from "next/server";

const API_BASE = API_BASE_URL.replace(/\/+$/, "");

/**
 * Server-side proxy for seller OTP login.
 * The API's session cookies are SameSite=Strict — a cross-origin browser call
 * can never land them on this origin, so the exchange MUST happen here and
 * the cookies be forwarded same-origin.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp, storeName, city, email, password } = body;

    let verifiedUser: any;
    let verifiedToken: string;

    if (email && password) {
      // Email+password path
      const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json().catch(() => ({}));

      if (!loginRes.ok) {
        return NextResponse.json(
          { error: loginData.error || "Login failed" },
          { status: loginRes.status }
        );
      }

      if (loginData.user?.role !== "SELLER") {
        return NextResponse.json(
          { error: "Access denied. Seller accounts only." },
          { status: 403 }
        );
      }

      verifiedUser = loginData.user;
      verifiedToken = loginData.token;
    } else {
      // WhatsApp OTP path (creates the SELLER profile/store on first login)
      if (!phone || !otp) {
        return NextResponse.json(
          { error: "Phone and OTP are required" },
          { status: 400 }
        );
      }

      const verifyRes = await fetch(`${API_BASE}/api/auth/whatsapp-otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, role: "SELLER", storeName, city }),
      });

      const verifyData = await verifyRes.json().catch(() => ({}));

      if (!verifyRes.ok) {
        return NextResponse.json(
          { error: verifyData.error || "OTP verification failed" },
          { status: verifyRes.status }
        );
      }

      verifiedUser = verifyData.user;
      verifiedToken = verifyData.token;
    }

    // Create the server session
    const sessionRes = await fetch(`${API_BASE}/api/auth/session/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: verifiedUser.id,
        authToken: verifiedToken,
        userRole: verifiedUser.role,
        userPhone: verifiedUser.phone,
        userEmail: verifiedUser.email,
        storeId: verifiedUser.store_id,
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

    // Forward session cookies from API to the browser (same-origin)
    const response = NextResponse.json({ user: verifiedUser });

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
