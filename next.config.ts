import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `next build` and `next dev` both own `.next`, so a build run while the dev
  // server is up clobbers its chunks. Set NEXT_DIST_DIR to build somewhere else.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async headers() {
    return [
      {
        // The tour preloads 120 immutable frames; let the browser keep them.
        source: '/assets/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
