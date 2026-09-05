const RECENTLY_VIEWED_KEY = "waw_recently_viewed";
const MAX_ITEMS = 20;

export interface RecentlyViewedProduct {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string;
  price: number;
  comparePrice?: number;
  viewedAt: number;
}

export function getRecentlyViewed(): RecentlyViewedProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToRecentlyViewed(product: Omit<RecentlyViewedProduct, "viewedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentlyViewed();
    const filtered = existing.filter((p) => p.id !== product.id);
    const updated = [{ ...product, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch {}
}
