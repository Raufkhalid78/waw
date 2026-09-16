import { API_BASE_URL } from "@waw/config";

import { NextRequest, NextResponse } from "next/server";

const API_BASE = API_BASE_URL;

export async function POST(request: NextRequest) {
  // Revoke session on the API server — forward the caller's cookies so the
  // API can resolve and delete the session being logged out.
  try {
    const cookie = request.headers.get("cookie");
    await fetch(`${API_BASE}/api/auth/session/revoke`, {
      method: "POST",
      headers: cookie ? { cookie } : {},
    });
  } catch {}

  const response = NextResponse.json({ success: true });

  // Clear the session cookie
  response.cookies.set("waw_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("waw_refresh", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/session",
    maxAge: 0,
  });

  return response;
}
