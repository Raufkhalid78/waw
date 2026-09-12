import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchProductById, fetchProducts } from '@/lib/api';
import ProductDetailClient from './ProductDetailClient';
import { ProductDetail } from '@/types/models';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProductById(id);
  
  if (!product) {
    return {
      title: 'Product Not Found | WAW',
      description: 'The requested product could not be found.',
    };
  }

  const images = product.images?.length ? product.images : [product.imageUrl].filter(Boolean) as string[];

  return {
    title: `${product.title} | WAW`,
    description: product.description?.substring(0, 160) || `Buy ${product.title} at the best price on WAW.`,
    openGraph: {
      title: product.title,
      description: product.description?.substring(0, 160),
      images: images.map(url => ({ url })),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: product.description?.substring(0, 160),
      images: images,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = await fetchProductById(id);
  
  if (!product) {
    notFound();
  }

  const categoryParam = product.categorySlug
    ? { categorySlug: product.categorySlug }
    : product.categoryId
      ? { category: product.categoryId }
      : undefined;

  let relatedProducts: ProductDetail[] = [];
  try {
    const res = categoryParam
      ? await fetchProducts(categoryParam)
      : await fetchProducts({ limit: 20 });
    relatedProducts = (res.items || []).filter(p => p.productId !== product.productId).slice(0, 8);
  } catch (err) {
    try {
      const fallback = await fetchProducts({ limit: 20 });
      relatedProducts = (fallback.items || []).filter(p => p.productId !== product.productId).slice(0, 8);
    } catch {}
  }

  let storeProducts: ProductDetail[] = [];
  if (product.storeId) {
    try {
      const res = await fetchProducts({ storeId: product.storeId, limit: 12 });
      storeProducts = (res.items || []).filter(p => p.productId !== product.productId).slice(0, 12);
    } catch {}
  }

  // Canonical site URL — env-driven (must match lib/seo.ts), never hardcoded
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://waw.com.pk";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "image": product.images?.length ? product.images : [product.imageUrl].filter(Boolean),
    "description": product.description || `Buy ${product.title} at WAW.`,
    "sku": product.productId,
    "offers": {
      "@type": "Offer",
      "url": `${siteUrl}/products/${product.productId}`,
      "priceCurrency": "PKR",
      "price": product.pricePkr,
      "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": product.storeName || "WAW Seller"
      }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient 
        initialProduct={product} 
        initialRelated={relatedProducts} 
        initialStore={storeProducts} 
      />
    </>
  );
}
