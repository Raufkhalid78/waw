const isBrowser = typeof window !== "undefined";

export function getCookie(name: string): string | null {
  if (!isBrowser) return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, days = 7): void {
  if (!isBrowser) return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function removeCookie(name: string): void {
  if (!isBrowser) return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function getToken(tokenKey: string): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem(tokenKey) || getCookie(tokenKey);
}

export function setToken(tokenKey: string, token: string): void {
  if (!isBrowser) return;
  localStorage.setItem(tokenKey, token);
  setCookie(tokenKey, token);
}

export function removeToken(tokenKey: string): void {
  if (!isBrowser) return;
  localStorage.removeItem(tokenKey);
  removeCookie(tokenKey);
}

export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}
