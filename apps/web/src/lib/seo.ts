import { Metadata } from "next";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://waw.com.pk"
).replace(/\/+$/, "");

export function productMetadata(product: {
  title: string;
  description?: string;
  imageUrl?: string;
  pricePkr: number;
  slug: string;
  category?: string;
  rating?: number;
  reviewsCount?: number;
}): Metadata {
  const title = `${product.title} | Buy Online in Pakistan | Waw`;
  const description =
    product.description?.slice(0, 155) ||
    `Buy ${product.title} online at Waw Pakistan. Best prices with fast nationwide delivery. PKR ${product.pricePkr.toLocaleString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/products/${product.slug}`,
      siteName: "Waw Pakistan",
      images: product.imageUrl
        ? [{ url: product.imageUrl, width: 800, height: 800, alt: product.title }]
        : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.imageUrl ? [product.imageUrl] : [],
    },
    alternates: {
      canonical: `${SITE_URL}/products/${product.slug}`,
    },
  };
}

export function categoryMetadata(category: {
  name: string;
  slug: string;
  description?: string;
}): Metadata {
  const title = `${category.name} | Shop Online in Pakistan | Waw`;
  const description =
    category.description?.slice(0, 155) ||
    `Browse ${category.name} products on Waw Pakistan. Verified sellers with fast nationwide delivery.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/category/${category.slug}`,
      siteName: "Waw Pakistan",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/category/${category.slug}`,
    },
  };
}

export function storeMetadata(store: {
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
}): Metadata {
  const title = `${store.name} | Verified Seller on Waw Pakistan`;
  const description =
    store.description?.slice(0, 155) ||
    `Shop from ${store.name} on Waw Pakistan. Verified seller with genuine products.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/store/${store.slug}`,
      siteName: "Waw Pakistan",
      images: store.logo_url ? [{ url: store.logo_url, width: 200, height: 200, alt: store.name }] : [],
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/store/${store.slug}`,
    },
  };
}
