'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { FontProvider } from '@/context/FontContext';
import { RoleProvider } from '@/context/RoleContext';
import { SearchProvider } from '@/context/SearchContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
// UserProvider is no longer needed with server-side auth

type Theme = 'light' | 'dark' | 'system';

interface ThemeProvidersProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProviders({ children, defaultTheme = 'system' }: ThemeProvidersProps) {
  return (
    // Use both theme providers, with next-themes as the outer one
    <NextThemesProvider 
      attribute="class" 
      defaultTheme={defaultTheme} 
      enableSystem 
      disableTransitionOnChange
    >
      <ThemeProvider defaultTheme={defaultTheme}>
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