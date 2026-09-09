import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@vrate/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.anilist.co',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
