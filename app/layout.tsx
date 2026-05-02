import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'EduConnect | Plataforma de Aprendizagem',
  description: 'Conectando estudantes e professores em uma comunidade de aprendizagem moderna.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-AO" className={`${inter.variable}`}>
      <body className="font-sans antialiased text-slate-900 bg-[#F9F9F9]" suppressHydrationWarning>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
