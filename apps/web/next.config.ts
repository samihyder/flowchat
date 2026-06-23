import type { NextConfig } from 'next';

const PRODUCTION_API_URL = 'https://flowchat-production-be88.up.railway.app';
const PRODUCTION_WS_URL = 'wss://flowchat-ws-production.up.railway.app';

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '') || undefined;
const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? PRODUCTION_API_URL;

const nextConfig: NextConfig = {
  typedRoutes: true,
  ...(basePath ? { basePath } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath ?? '',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? PRODUCTION_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL ?? PRODUCTION_WS_URL,
  },
  async rewrites() {
    // Only proxy auth to Railway — Vercel route handlers own /api/workspace, /api/accounts/...
    return [
      {
        source: '/api/auth/:path*',
        destination: `${apiOrigin}/auth/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
