import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@medi-bridge/ui', '@medi-bridge/shared'],
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/intro',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
