/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@waw/types'],
  poweredByHeader: false,
  compress: true,
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const connectSrc = isProd
      ? "'self' https://*.supabase.co wss://*.supabase.co https://api.waw.com.pk"
      : "'self' https://*.supabase.co wss://*.supabase.co http://localhost:4000 https://api.waw.com.pk";
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
      {
        source: '/:all*(svg)',
        headers: [
          { key: 'Content-Type', value: 'image/svg+xml' },
        ],
      },
    ];
  },
};

export default nextConfig;
