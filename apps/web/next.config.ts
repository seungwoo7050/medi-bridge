import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@medi-bridge/ui', '@medi-bridge/shared'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
