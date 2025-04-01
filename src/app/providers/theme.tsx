'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { createContext, useContext } from 'react';

import { TooltipProvider } from '@/components/shadcn/tooltip';
import { FontProvider } from '@/context/FontContext';
import { SearchProvider } from '@/context/SearchContext';
import { useThemeLogic } from '@/hooks/theme';

// Define theme context
type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => null,
});

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  initialTheme,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  initialTheme?: ThemeContextType;
}) {
  // Use the theme logic hook instead of managing state directly
  const themeLogic = useThemeLogic(defaultTheme);
  
  // Use the provider as a pure data container
  return (
    <ThemeContext.Provider value={initialTheme || themeLogic}>
      {children}
    </ThemeContext.Provider>
  );
}

// Simple context accessor
export function useTheme() {
  return useContext(ThemeContext);
}

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
