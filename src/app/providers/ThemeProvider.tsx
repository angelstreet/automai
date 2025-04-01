'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';

/**
 * ThemeProvider wrapper around next-themes ThemeProvider
 * This component only handles theme state, no business logic included
 * To access theme functionality, use the useTheme hook from @/hooks/theme
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

// No hooks exported from this provider - use @/hooks/theme instead
