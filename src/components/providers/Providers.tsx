'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { FontProvider } from '@/context/FontContext';
import { RoleProvider } from '@/context/RoleContext';
import { SearchProvider } from '@/context/SearchContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
// UserProvider is no longer needed with server-side auth

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    // Use both theme providers, with next-themes as the outer one
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeProvider>
        <FontProvider>
          <RoleProvider>
            <SidebarProvider>
              <SearchProvider>{children}</SearchProvider>
            </SidebarProvider>
          </RoleProvider>
        </FontProvider>
      </ThemeProvider>
    </NextThemesProvider>
  );
}
