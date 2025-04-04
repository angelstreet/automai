import './globals.css';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';

import { ToastProvider } from '@/app/providers';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: true,
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Get theme from cookie for SSR
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme');
  const theme = themeCookie?.value;

  return (
    <html lang="en" className={`${inter.className} ${theme || ''}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1e293b" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="min-h-screen bg-background">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
