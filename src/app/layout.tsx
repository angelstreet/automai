import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Automai - Awsomation AI tool',
  description: 'Automate your testing workflow with AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
