import { API_BASE_URL } from "@waw/config";
import { logger } from "@/lib/logger";

import { NextRequest, NextResponse } from "next/server";

const API_BASE = (
  API_BASE_URL
).replace(/\/+$/, "");

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(error)}`, origin),
    );
  }

  if (code) {
    try {
      // Exchange code for session via Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=authorization_code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ code }),
        });

        const tokenData = await tokenRes.json();

        if (tokenData.access_token) {
          // Sync user profile via our API
          const syncRes = await fetch(`${API_BASE}/api/auth/oauth/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tokenData.access_token}`,
            },
            body: JSON.stringify({
              id: tokenData.user?.id,
              email: tokenData.user?.email,
            }),
          });

          const syncData = await syncRes.json();

          // SECURITY: Create server-side session and transfer cookies — never put tokens in URLs
          const sessionRes = await fetch(`${API_BASE}/api/auth/session/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: syncData.user?.id || tokenData.user?.id,
              authToken: tokenData.access_token,
              userPhone: syncData.user?.phone || tokenData.user?.phone || "",
              userEmail: syncData.user?.email || tokenData.user?.email || "",
            }),
          });

          // Build redirect response and transfer session cookies from API
          const redirectResponse = NextResponse.redirect(new URL("/", origin));

          const setCookies = sessionRes.headers.getSetCookie();
          for (const cookieHeader of setCookies) {
            redirectResponse.headers.append("Set-Cookie", cookieHeader);
          }

          return redirectResponse;
        }
      }
    } catch (err) {
      logger.error("OAuth callback error", "AuthCallback", err);
    }
  }

  // Fallback redirect
  return NextResponse.redirect(new URL("/", origin));
}
