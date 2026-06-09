import type { NextConfig } from 'next';

const PRODUCTION_API_URL = 'https://flowchat-production-be88.up.railway.app';
const PRODUCTION_WS_URL = 'wss://flowchat-ws-production.up.railway.app';

const nextConfig: NextConfig = {
  typedRoutes: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? PRODUCTION_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL ?? PRODUCTION_WS_URL,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
