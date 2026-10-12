import type { NextConfig } from 'next';

const isProduction = process.env.NODE_ENV === 'production';
const apiOrigin = process.env.API_ORIGIN;

if (isProduction && !apiOrigin) {
  throw new Error(
    '[HireTrail Build Error] Missing required environment variable API_ORIGIN in production for API rewrites.',
  );
}

const resolvedApiOrigin = apiOrigin || 'http://localhost:4000';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@hiretrail/shared'],
  // The default proxy timeout is 30 s; AI calls can take longer than that when a model is slow
  experimental: { proxyTimeout: 60_000 },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${resolvedApiOrigin}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
