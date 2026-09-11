import { API_BASE_URL } from "@waw/config";
import { logger } from "@/lib/logger";

import { NextRequest, NextResponse } from "next/server";

const API_BASE = API_BASE_URL.replace(/\/+$/, "");

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(error)}`, origin),
    );
  }

  // CSRF protection: the state we issued before the redirect must match.
  const issuedState = request.cookies.get("waw_oauth_state")?.value;
  const verifier = request.cookies.get("waw_pkce_verifier")?.value;

  const fail = (reason: string) => {
    logger.error("OAuth callback failed", "AuthCallback", reason);
    const res = NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(reason)}`, origin),
    );
    res.cookies.delete("waw_pkce_verifier");
    res.cookies.delete("waw_oauth_state");
    return res;
  };

  if (!code) return fail("sign_in_incomplete");
  if (!issuedState || !state || issuedState !== state) return fail("invalid_state");
  if (!verifier) return fail("missing_verifier");

  try {
    // Exchange code for session via Supabase (PKCE flow)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const tokenRes = await fetch(
        `${supabaseUrl}/auth/v1/token?grant_type=authorization_code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
        },
      );

      if (!tokenRes.ok) {
        return fail("token_exchange_failed");
      }

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

        if (!syncRes.ok) {
          return fail("profile_sync_failed");
        }

        const syncData = await syncRes.json().catch(() => ({}));

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

        if (!sessionRes.ok) {
          return fail("session_failed");
        }

        // Build redirect response and transfer session cookies from API
        const redirectResponse = NextResponse.redirect(new URL("/", origin));

        const setCookies = sessionRes.headers.getSetCookie();
        for (const cookieHeader of setCookies) {
          redirectResponse.headers.append("Set-Cookie", cookieHeader);
        }

        // Single-use: consume the PKCE material.
        redirectResponse.cookies.delete("waw_pkce_verifier");
        redirectResponse.cookies.delete("waw_oauth_state");

        return redirectResponse;
      }
    }
  } catch (err) {
    logger.error("OAuth callback error", "AuthCallback", err);
    return fail("unexpected_error");
  }

  return fail("sign_in_incomplete");
}
