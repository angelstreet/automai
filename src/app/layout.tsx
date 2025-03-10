import './globals.css';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import { ThemeProviders, SWRProvider } from '@/components/providers';
import { cookies } from 'next/headers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    default: 'AutomAI',
    template: '%s | AutomAI',
  },
  description: 'Automate your development workflow with AI',
  icons: {
    icon: '/favicon.ico',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get theme from cookies for server-side rendering
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme');
  const theme = (themeCookie?.value ?? 'system') as 'light' | 'dark' | 'system';
  
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
        {/* next-themes will handle theme flashing with suppressHydrationWarning */}
      </head>
      <body>
        <ThemeProviders defaultTheme={theme}>
          <SWRProvider>
            {children}
          </SWRProvider>
        </ThemeProviders>
      </body>
    </html>
  );
}