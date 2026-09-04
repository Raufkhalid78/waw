import { Metadata } from "next";
import { storeMetadata } from "@/lib/seo";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/stores/${encodeURIComponent(params.slug)}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      return { title: "Store | Waw Pakistan" };
    }
    const store = await res.json();
    return storeMetadata({
      name: store.name || "Store",
      slug: store.slug || params.slug,
      description: store.description,
      logo_url: store.logo_url,
    });
  } catch {
    return { title: "Store | Waw Pakistan" };
  }
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
