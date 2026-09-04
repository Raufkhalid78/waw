import { Metadata } from "next";
import { productMetadata } from "@/lib/seo";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(params.id)}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      return { title: "Product | Waw Pakistan" };
    }
    const p = await res.json();
    return productMetadata({
      title: p.title || "Product",
      description: p.description,
      imageUrl: p.images?.[0] || p.thumbnail,
      pricePkr: Number(p.base_price_pkr ?? p.price_pkr ?? 0),
      slug: p.slug || params.id,
      category: p.category?.name,
      rating: p.rating_average,
      reviewsCount: p.rating_count,
    });
  } catch {
    return { title: "Product | Waw Pakistan" };
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
