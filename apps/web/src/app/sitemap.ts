import { MetadataRoute } from "next";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://waw.com.pk").replace(/\/+$/, "");
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

async function fetchProducts(): Promise<MetadataRoute.Sitemap> {
  try {
    const res = await fetch(`${API_BASE}/api/products?limit=500&status=APPROVED`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.items || data || [];
    return items.map((p: any) => ({
      url: `${BASE_URL}/products/${p.slug || p.id}`,
      lastModified: new Date(p.updated_at || p.created_at || Date.now()),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    return [];
  }
}

async function fetchCategories(): Promise<MetadataRoute.Sitemap> {
  try {
    const res = await fetch(`${API_BASE}/api/categories`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data) ? data : data?.categories || [];
    return items.map((c: any) => ({
      url: `${BASE_URL}/category/${c.slug}`,
      lastModified: new Date(c.updated_at || c.created_at || Date.now()),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    return [];
  }
}

async function fetchStores(): Promise<MetadataRoute.Sitemap> {
  try {
    const res = await fetch(`${API_BASE}/api/stores?status=ACTIVE&limit=200`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.stores || data || [];
    return items.map((s: any) => ({
      url: `${BASE_URL}/store/${s.slug}`,
      lastModified: new Date(s.updated_at || s.created_at || Date.now()),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/stores`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/sell`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/buyer-protection`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/refund-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const [productPages, categoryPages, storePages] = await Promise.all([
    fetchProducts(),
    fetchCategories(),
    fetchStores(),
  ]);

  return [...staticPages, ...productPages, ...categoryPages, ...storePages];
}
