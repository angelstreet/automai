'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { SessionProvider } from 'next-auth/react';
import { SearchProvider } from '@/lib/contexts/SearchContext';
import { RoleProvider } from '@/context/role-context';

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
          <RoleProvider>
            {children}
          </RoleProvider>
        </SearchProvider>
      </ThemeProvider>
    </SessionProvider>
  );
} 