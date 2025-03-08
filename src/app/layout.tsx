import './globals.css';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';

// Load Inter font with subset optimization
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta name="theme-color" content="#ffffff" />
        {/* This script runs before the page is rendered to prevent theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Get stored theme from localStorage or cookie
                  const storedTheme = localStorage.getItem('theme') || 
                                     (document.cookie.match(/theme=([^;]+)/) || [])[1] || 'system';
                  
                  // Check if user prefers dark mode
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  
                  // Set theme based on stored value or system preference
                  if (storedTheme === 'dark' || (storedTheme === 'system' && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  console.error('Theme initialization error:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
