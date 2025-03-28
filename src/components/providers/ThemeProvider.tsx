'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { FontProvider } from '@/context/FontContext';
// Role context is now part of UserContext - no need to import
import { SearchProvider } from '@/context/SearchContext';
import { ThemeProvider } from '@/context';
// SidebarProvider is now used only in the root layout
import { TooltipProvider } from '@/components/shadcn/tooltip';
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
          <TooltipProvider>
            <SearchProvider>{children}</SearchProvider>
          </TooltipProvider>
        </FontProvider>
      </ThemeProvider>
    </NextThemesProvider>
  );
}
