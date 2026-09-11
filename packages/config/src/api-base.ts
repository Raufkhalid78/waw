/**
 * Central API base URL resolution for Next.js apps (web/admin/seller).
 *
 * Production builds MUST set NEXT_PUBLIC_API_URL. The localhost fallback
 * exists solely for local development: it is allowed only when the build
 * (or runtime) is explicitly a dev environment. Production builds without
 * the env var fail fast at build time with a clear error instead of
 * silently shipping a bundle that calls localhost in the buyer's browser.
 */

function resolveApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    // A localhost URL that survives into a production build means an
    // untracked developer file (.env.local) is overriding the deployment
    // env — the resulting bundle would call localhost in every buyer's
    // browser. Fail the build instead of shipping a dead site.
    if (
      process.env.NODE_ENV === "production" &&
      /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?/i.test(envUrl)
    ) {
      throw new Error(
        "[config] NEXT_PUBLIC_API_URL points at localhost in a production build. " +
          "A local .env.local or .env is overriding the deployment config — " +
          "remove it or set the real https:// API URL.",
      );
    }
    return envUrl.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[config] NEXT_PUBLIC_API_URL is required in production builds. " +
        "Set it to the public API base URL (e.g. https://api.waw.com.pk).",
    );
  }

  return "http://localhost:4000";
}

export const API_BASE_URL: string = resolveApiBaseUrl();

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
