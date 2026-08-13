import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { RegisterServiceWorker } from '@/components/pwa/register-sw';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'FlowChat — Every conversation in flow',
  description: 'Modern omnichannel customer communication platform',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FlowChat',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#06B6D4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
