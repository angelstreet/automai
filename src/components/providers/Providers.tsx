'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { FontProvider } from '@/context/FontContext';
import { RoleProvider } from '@/context/RoleContext';
import { SearchProvider } from '@/context/SearchContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { UserProvider } from '@/context/UserContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    // Use both theme providers, with next-themes as the outer one
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeProvider>
        <FontProvider>
          <UserProvider>
            <RoleProvider>
              <SidebarProvider>
                <SearchProvider>{children}</SearchProvider>
              </SidebarProvider>
            </RoleProvider>
          </UserProvider>
        </FontProvider>
      </ThemeProvider>
    </NextThemesProvider>
  );
}
