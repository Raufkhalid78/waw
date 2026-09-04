import { NextRequest, NextResponse } from "next/server";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
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

          // Redirect with token
          const redirectUrl = new URL("/", origin);
          redirectUrl.searchParams.set("auth_token", syncData.token || tokenData.access_token);
          redirectUrl.searchParams.set("auth_user", JSON.stringify(syncData.user || tokenData.user));
          return NextResponse.redirect(redirectUrl);
        }
      }
    } catch (err) {
      console.error("OAuth callback error:", err);
    }
  }

  // Fallback redirect
  return NextResponse.redirect(new URL("/", origin));
}
