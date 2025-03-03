'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/context/ThemeContext';
import { UserProvider } from '@/context/UserContext';
import { RoleProvider } from '@/context/RoleContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { FontProvider } from '@/context/FontContext';
import { SearchProvider } from '@/context/SearchContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <FontProvider>
          <UserProvider>
            <RoleProvider>
              <SidebarProvider>
                <SearchProvider>
                  {children}
                </SearchProvider>
              </SidebarProvider>
            </RoleProvider>
          </UserProvider>
        </FontProvider>
      </ThemeProvider>
    </SessionProvider>
  );
} 