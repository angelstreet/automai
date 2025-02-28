'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from '@/components/Theme/ThemeProvider';
import { SessionProvider } from 'next-auth/react';
import { SearchProvider } from '@/context/SearchContext';
import { RoleProvider } from '@/context/RoleContext';
import { UserProvider } from '@/context/UserContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <UserProvider>
          <SearchProvider>
            <RoleProvider>{children}</RoleProvider>
          </SearchProvider>
        </UserProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
