import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SWRegister } from './sw-register';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b1020',
};

export const metadata: Metadata = {
  title: 'TEAM APK Election Command Centre',
  description: 'TEAM APK campaign operations and readiness dashboard',
  applicationName: 'TEAM APK Election Command Centre',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'TEAM APK',
    statusBarStyle: 'black-translucent',
  },
  icons: [
    { rel: 'icon', url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
    { rel: 'icon', url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
