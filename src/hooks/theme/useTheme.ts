'use client';

import { useTheme as useNextTheme } from 'next-themes';

// Define theme type
type Theme = 'light' | 'dark' | 'system';

export function useTheme(defaultTheme: Theme = 'system') {
  // We'll just forward the Next.js theme - no need for duplicate state
  const { theme: nextTheme, setTheme: setNextTheme } = useNextTheme();

  // Safely typed theme value
  const theme = (nextTheme || defaultTheme) as Theme;

  return {
    theme,
    setTheme: setNextTheme,
  };
}
