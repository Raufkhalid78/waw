const isBrowser = typeof window !== "undefined";

export function getCookie(name: string): string | null {
  if (!isBrowser) return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Session cookies (waw_session) are HttpOnly and set by the API — they can
 * never be written from JS. This helper only exists for non-sensitive,
 * JS-readable cookies (e.g. UI preferences) and intentionally does NOT
 * support auth tokens: bearer tokens in localStorage/JS-readable cookies
 * are XSS-stealable, which is why this package's previous getToken/
 * setToken (localStorage + SameSite=Lax cookie) API was removed. All apps
 * authenticate via HttpOnly session cookies or Authorization headers held
 * in memory / platform-secure storage (Flutter secure_storage).
 */
export function setCookie(name: string, value: string, days = 7): void {
  if (!isBrowser) return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function removeCookie(name: string): void {
  if (!isBrowser) return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
