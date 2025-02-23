'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { SessionProvider } from 'next-auth/react';
import { SearchProvider } from '@/lib/contexts/SearchContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SearchProvider>
          {children}
        </SearchProvider>
      </ThemeProvider>
    </SessionProvider>
  );
} 