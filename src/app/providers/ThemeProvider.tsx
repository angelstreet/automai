'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { createContext, useContext } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

import { TooltipProvider } from '@/components/shadcn/tooltip';
import { FontProvider } from '@/context/FontContext';
import { SearchProvider } from '@/context/SearchContext';

// Define theme context
type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// Create a context for compatibility, but it will just forward to next-themes
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => null,
});

// Simple provider that just forwards to next-themes
export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  return <>{children}</>;
}

// Simple context accessor that forwards to next-themes
export function useTheme() {
  return useNextTheme();
}

interface ThemeProvidersProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProviders({ children, defaultTheme = 'system' }: ThemeProvidersProps) {
  return (
    // Only use next-themes provider
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
    >
      <FontProvider>
        <TooltipProvider>
          <SearchProvider>{children}</SearchProvider>
        </TooltipProvider>
      </FontProvider>
    </NextThemesProvider>
  );
}
