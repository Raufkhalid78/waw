import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear the admin token cookie
  response.cookies.set("waw_admin_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
