/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@waw/types'],
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
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
