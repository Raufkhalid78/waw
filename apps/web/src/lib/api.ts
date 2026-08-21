import { CATALOG_PRODUCTS, ProductDetail } from '@/data/mockProducts';
import { STORES_CATALOG, StoreDetail } from '@/data/mockStores';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchProducts(params?: {
  q?: string;
  category?: string;
  city?: string;
  sellerType?: string;
}): Promise<ProductDetail[]> {
  try {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE_URL}/products?${query}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error('API request failed');
    return await res.json();
  } catch (error) {
    // Fallback to local catalog for offline/development resilience
    return CATALOG_PRODUCTS;
  }
}

export async function fetchProductById(productId: string): Promise<ProductDetail | undefined> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error('Product not found');
    return await res.json();
  } catch (error) {
    return CATALOG_PRODUCTS.find((p) => p.productId === productId) || CATALOG_PRODUCTS[0];
  }
}

export async function fetchStoreBySlug(slug: string): Promise<StoreDetail | undefined> {
  try {
    const res = await fetch(`${API_BASE_URL}/stores/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error('Store not found');
    return await res.json();
  } catch (error) {
    return STORES_CATALOG[slug] || STORES_CATALOG['lahore-tech-hub'];
  }
}
