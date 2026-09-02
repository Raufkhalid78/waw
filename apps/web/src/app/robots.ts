import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://waw.com.pk";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account/", "/checkout/", "/wishlist/", "/cart/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
