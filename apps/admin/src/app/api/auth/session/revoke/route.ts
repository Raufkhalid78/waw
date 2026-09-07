import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function POST() {
  // Revoke session on the API server
  try {
    await fetch(`${API_BASE}/api/auth/session/revoke`, {
      method: "POST",
      credentials: "include",
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
