import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The whole site prerenders, so it ships as plain files. Cache headers move
  // to public/_headers: `headers()` is dropped in export mode.
  output: 'export',
  // `next build` and `next dev` both own `.next`, so a build run while the dev
  // server is up clobbers its chunks. Set NEXT_DIST_DIR to build somewhere else.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
