import './globals.css';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';

import { ThemeProvider } from '@/components/theme/ThemeProvider'; 
import { SWRProvider, ToastProvider } from '@/app/providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: true,
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme');
  const theme = (themeCookie?.value ?? 'system') as 'light' | 'dark' | 'system';

  return (
    <html lang="en" className={`${inter.className} js-loading`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                document.documentElement.classList.remove('js-loading');
                document.documentElement.classList.add('js-enabled');
                document.addEventListener('DOMContentLoaded', function() {
                  document.documentElement.classList.add('hydrated');
                  setTimeout(function() {
                    if (!document.documentElement.classList.contains('hydrated')) {
                      document.documentElement.classList.add('hydrated');
                    }
                  }, 1000);
                });
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider defaultTheme={theme}>
          <SWRProvider>
            <ToastProvider>{children}</ToastProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
