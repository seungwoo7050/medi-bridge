import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@medi-bridge/ui',
    '@medi-bridge/shared',
    '@medi-bridge/parsers',
    '@medi-bridge/db',
  ],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
