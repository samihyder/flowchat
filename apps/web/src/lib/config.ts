/** Production defaults — used when Vercel env vars are not set at build time. */
const PRODUCTION_API_URL = 'https://flowchat-production-be88.up.railway.app';
const PRODUCTION_WS_URL = 'wss://flowchat-ws-production.up.railway.app';

export function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3001';
  return PRODUCTION_API_URL;
}

export function getWsUrl() {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (process.env.NODE_ENV === 'development') return 'ws://localhost:3002';
  return PRODUCTION_WS_URL;
}
