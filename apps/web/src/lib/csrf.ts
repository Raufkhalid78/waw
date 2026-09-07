import { getApiBaseUrl } from "./api";

/**
 * CSRF protection client (Double Submit Cookie pattern).
 *
 * The API sets a `waw_csrf` cookie on ITS origin — not readable via
 * document.cookie from the web origin. So we fetch the token from
 * GET /api/auth/csrf (which returns it in the JSON body AND sets the
 * cookie) and send it back as the x-csrf-token header on unsafe requests.
 */

let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;

export async function ensureCsrfToken(force = false): Promise<string> {
  if (csrfToken && !force) return csrfToken;
  if (csrfPromise) return csrfPromise;

  csrfPromise = (async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/csrf`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        csrfToken = data.csrfToken || null;
      }
    } catch {
      // Ignore — server will reject with 403 and callers can retry
    } finally {
      csrfPromise = null;
    }
    return csrfToken || "";
  })();

  return csrfPromise;
}

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

/**
 * Drop-in fetch replacement that attaches the CSRF token to
 * state-changing requests and retries once on a stale-token 403.
 */
export async function fetchWithCsrf(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();

  if (SAFE_METHODS.includes(method)) {
    return fetch(url, init);
  }

  const doFetch = (token: string) =>
    fetch(url, {
      ...init,
      credentials: init.credentials || "include",
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        "x-csrf-token": token,
      },
    });

  let token = await ensureCsrfToken();
  let res = await doFetch(token);

  if (res.status === 403) {
    token = await ensureCsrfToken(true);
    if (token) {
      res = await doFetch(token);
    }
  }

  return res;
}
