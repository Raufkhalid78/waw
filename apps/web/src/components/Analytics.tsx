import Script from "next/script";

/**
 * Google Analytics 4 — enabled ONLY when NEXT_PUBLIC_GA_MEASUREMENT_ID is
 * configured (format G-XXXXXXXXXX). Renders nothing otherwise, so dev and
 * un-configured environments ship zero third-party requests. CSP already
 * allows googletagmanager.com / google-analytics.com (next.config.mjs).
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!gaId || !/^G-[A-Z0-9]{6,}$/.test(gaId)) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
