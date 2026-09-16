"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * Surfaces OAuth failures. The /auth/callback route redirects failed
 * Google/Apple sign-ins to /?auth_error=<reason>, but nothing ever read that
 * param — buyers landed on the homepage with zero feedback. This banner
 * reads it, shows a human message, and cleans the URL.
 */
const ERROR_MESSAGES: Record<string, string> = {
  no_code: "Google/Apple sign-in was cancelled or did not complete. Please try again.",
  invalid_state: "Sign-in could not be verified (security check failed). Please try again.",
  no_profile: "Your Google/Apple account did not share an email address. Please sign in with your phone number.",
  exchange_failed: "We could not complete Google/Apple sign-in right now. Please try again or use your phone number.",
  signup_failed: "We could not create your account. Please try again or use your phone number.",
  session_failed: "Sign-in succeeded but we could not start your session. Please try again.",
  email_conflict: "This email is already linked to another sign-in method. Please use that method.",
};

export default function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("auth_error");
    if (!code) return;
    setMessage(ERROR_MESSAGES[code] || "Sign-in failed. Please try again or use your phone number.");
    // Clean the URL so a refresh doesn't repeat the banner.
    router.replace("/", { scroll: false });
  }, [searchParams, router]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="mx-3 sm:mx-6 mt-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 flex items-center justify-between gap-3"
    >
      <span>{message}</span>
      <button
        onClick={() => setMessage(null)}
        className="text-red-500 hover:text-red-700 font-bold shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
