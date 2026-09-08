import { API_BASE_URL } from "@waw/config";

import { NextRequest, NextResponse } from "next/server";

const API_BASE = API_BASE_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Step 1: Authenticate via API to get JWT
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const loginData = await loginRes.json();

    if (!loginRes.ok) {
      return NextResponse.json(
        { error: loginData.error || "Login failed" },
        { status: loginRes.status }
      );
    }

    if (loginData.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admin only." },
        { status: 403 }
      );
    }

    // Step 2: Create a proper server session using the JWT
    const sessionRes = await fetch(`${API_BASE}/api/auth/session/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: loginData.user.id,
        authToken: loginData.token,
        userRole: loginData.user.role,
        userEmail: loginData.user.email,
      }),
    });

    if (!sessionRes.ok) {
      return NextResponse.json(
        { error: "Session creation failed" },
        { status: 500 }
      );
    }

    // Step 3: Forward session cookies from API to the browser
    const response = NextResponse.json({ user: loginData.user });

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
