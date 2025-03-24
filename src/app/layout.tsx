import './globals.css';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import { ThemeProviders, SWRProvider } from '@/components/providers';
import { cookies } from 'next/headers';
import { AppProvider } from '@/context';

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Get theme from cookies for server-side rendering
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme');
  const theme = (themeCookie?.value ?? 'system') as 'light' | 'dark' | 'system';

  return (
    <html lang="en" className={`${inter.className} js-loading`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
        {/* next-themes will handle theme flashing with suppressHydrationWarning */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Remove js-loading class once JS is available
                document.documentElement.classList.remove('js-loading');
                // Add js-enabled class to show we have JS
                document.documentElement.classList.add('js-enabled');
                
                // Store hydration status in a class
                document.addEventListener('DOMContentLoaded', function() {
                  // Mark as hydrated immediately after DOM is ready
                  document.documentElement.classList.add('hydrated');
                  
                  // Fallback to ensure sidebar is always visible
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
        <ThemeProviders defaultTheme={theme}>
          <SWRProvider>
            <AppProvider>{children}</AppProvider>
          </SWRProvider>
        </ThemeProviders>
      </body>
    </html>
  );
}
