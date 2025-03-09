import './globals.css';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import { ThemeScript } from '@/components/theme/ThemeScript';

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
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}