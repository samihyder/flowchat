import type { MetadataRoute } from 'next';
import { withBasePath } from '@/lib/base-path';

/**
 * PWA manifest — served at /manifest.webmanifest. start_url carries
 * `source=pwa` so the client can tell it was launched from the installed
 * app (see use-pwa-mode.ts) and restrict navigation to Chat + Contacts.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FlowChat',
    short_name: 'FlowChat',
    description: 'Chat with your customers and manage contacts on the go.',
    start_url: withBasePath('/dashboard?source=pwa'),
    scope: withBasePath('/'),
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#06B6D4',
    icons: [
      {
        src: withBasePath('/icon-192'),
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: withBasePath('/icon-512'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: withBasePath('/icon-512'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
