'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

import { TooltipProvider } from '@/components/shadcn/tooltip';
import { ThemeProvider } from '@/context';
import { FontProvider } from '@/context/FontContext';
import { SearchProvider } from '@/context/SearchContext';

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
