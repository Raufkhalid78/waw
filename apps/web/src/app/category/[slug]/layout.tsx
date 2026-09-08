import { Metadata } from "next";
import { categoryMetadata } from "@/lib/seo";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE_URL}/api/categories/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      return { title: "Category | Waw Pakistan" };
    }
    const cat = await res.json();
    return categoryMetadata({
      name: cat.name || "Category",
      slug: cat.slug || slug,
      description: cat.description,
    });
  } catch {
    return { title: "Category | Waw Pakistan" };
  }
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
