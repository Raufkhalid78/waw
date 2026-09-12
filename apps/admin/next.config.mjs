/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@waw/types'],
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    // Production builds must never target localhost — fail loudly here too
    // (config/src/api-base.ts has the runtime equivalent).
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
    if (isProd) {
      if (!apiUrl) {
        throw new Error(
          "[admin] NEXT_PUBLIC_API_URL is required in production builds.",
        );
      }
      if (/\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?/i.test(apiUrl)) {
        throw new Error(
          "[admin] NEXT_PUBLIC_API_URL points at localhost in a production build. " +
            "A local .env.local is overriding the deployment config — remove it.",
        );
      }
    }
    const apiOrigin = apiUrl || "https://api.waw.com.pk";
    // Strip the scheme for CSP source form (api.example.com)
    const apiHost = apiOrigin.replace(/^https?:\/\//, "");
    const connectSrc =
      isProd
        ? `'self' https://*.supabase.co wss://*.supabase.co https://${apiHost}`
        : `'self' https://*.supabase.co wss://*.supabase.co http://localhost:4000 https://${apiHost}`;
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
              "img-src 'self' data: blob: https:",
              `connect-src ${connectSrc}`,
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
