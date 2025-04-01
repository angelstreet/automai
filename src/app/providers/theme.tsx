'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { createContext, useContext, useState } from 'react';

import { TooltipProvider } from '@/components/shadcn/tooltip';
import { FontProvider } from '@/context/FontContext';
import { SearchProvider } from '@/context/SearchContext';

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
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

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
