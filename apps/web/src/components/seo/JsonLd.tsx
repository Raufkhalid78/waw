interface JsonLdProductProps {
  name: string;
  description?: string;
  image?: string;
  price: number;
  currency?: string;
  url?: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  sku?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  seller?: string;
}

export function JsonLdProduct({
  name,
  description,
  image,
  price,
  currency = "PKR",
  url,
  brand,
  rating,
  reviewCount,
  sku,
  availability = "InStock",
  seller,
}: JsonLdProductProps) {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://waw.com.pk").replace(/\/+$/, "");

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description || `Buy ${name} online at Waw Pakistan`,
    image: image ? [image] : [],
    sku,
    url: url ? `${baseUrl}${url}` : undefined,
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: currency,
      price: price,
      availability: `https://schema.org/${availability}`,
      url: url ? `${baseUrl}${url}` : undefined,
      seller: seller ? { "@type": "Organization", name: seller } : undefined,
      itemCondition: "https://schema.org/NewCondition",
    },
    aggregateRating: rating
      ? {
          "@type": "AggregateRating",
          ratingValue: rating,
          reviewCount: reviewCount || 1,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface JsonLdOrganizationProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
}

export function JsonLdOrganization({
  name = "Waw Pakistan",
  url,
  logo,
  description,
}: JsonLdOrganizationProps) {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://waw.com.pk").replace(/\/+$/, "");

  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: url || baseUrl,
    logo: logo ? `${baseUrl}${logo}` : `${baseUrl}/favicon.svg`,
    description: description || "Pakistan's premium marketplace for verified local products",
    sameAs: [
      "https://www.facebook.com/wawpakistan",
      "https://www.instagram.com/wawpakistan",
      "https://twitter.com/wawpakistan",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+92-300-1234567",
      contactType: "customer service",
      availableLanguage: ["English", "Urdu"],
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "PK",
      addressRegion: "Punjab",
      addressLocality: "Lahore",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface JsonLdBreadcrumbProps {
  items: Array<{ name: string; url: string }>;
}

export function JsonLdBreadcrumb({ items }: JsonLdBreadcrumbProps) {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://waw.com.pk").replace(/\/+$/, "");

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface JsonLdSearchBoxProps {
  target?: string;
}

export function JsonLdSearchBox({ target }: JsonLdSearchBoxProps) {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://waw.com.pk").replace(/\/+$/, "");

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: baseUrl,
   potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface JsonLdWebPageProps {
  name: string;
  description?: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
}

export function JsonLdWebPage({
  name,
  description,
  url,
  datePublished,
  dateModified,
}: JsonLdWebPageProps) {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://waw.com.pk").replace(/\/+$/, "");

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: `${baseUrl}${url}`,
    datePublished: datePublished || new Date().toISOString(),
    dateModified: dateModified || new Date().toISOString(),
    publisher: {
      "@type": "Organization",
      name: "Waw Pakistan",
      url: baseUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
