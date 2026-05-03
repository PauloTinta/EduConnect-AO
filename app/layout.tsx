import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EduConnect | Plataforma de Aprendizagem',
  description: 'Conectando estudantes e professores em uma comunidade de aprendizagem moderna.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EduConnect',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: 'EduConnect',
    title: 'EduConnect | Plataforma de Aprendizagem',
    description: 'Conectando estudantes e professores.',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-AO" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* black-translucent extends content behind status bar for true full screen */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased text-slate-900 bg-[#F9F9F9] overflow-hidden" suppressHydrationWarning>
        <AuthProvider>
          {/* Full viewport container — no extra padding/margin that breaks mobile */}
          <div style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
        </AuthProvider>
        <div id="portal-root"></div>
      </body>
    </html>
  );
}
