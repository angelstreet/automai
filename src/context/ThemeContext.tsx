'use client';

import React, { createContext, useContext } from 'react';

/**
 * Theme options
 */
export type Theme = 'light' | 'dark' | 'system';

// Singleton flag to prevent multiple instances
let THEME_CONTEXT_INITIALIZED = false;

/**
 * Theme context type definition
 * DEPRECATED: This should be moved to hooks/theme/useTheme.ts in the future
 */
export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

/**
 * Theme context with default values
 * DEPRECATED: In the future, only the context definition will remain here
 */
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => null,
});

/**
 * DEPRECATED: This provider should be moved to app/providers/ThemeProvider.tsx
 * This will be kept temporarily for backward compatibility
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  // Check for multiple instances of ThemeProvider
  React.useEffect(() => {
    if (THEME_CONTEXT_INITIALIZED) {
      console.warn(
        '[ThemeContext] Multiple instances detected. This may cause unexpected behavior.',
      );
    } else {
      THEME_CONTEXT_INITIALIZED = true;
    }
    return () => {
      // Only reset if this instance set it to true
      if (THEME_CONTEXT_INITIALIZED) {
        THEME_CONTEXT_INITIALIZED = false;
      }
    };
  }, []);

  const [theme, setTheme] = React.useState<Theme>(defaultTheme);

  React.useEffect(() => {
    const root = document.documentElement;
    // Read the initial theme from the server-rendered classList
    const initialIsDark = root.classList.contains('dark');
    const savedTheme = localStorage.getItem('theme') as Theme;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Determine the effective theme
    let effectiveTheme: Theme;
    if (savedTheme) {
      effectiveTheme = savedTheme;
    } else if (initialIsDark) {
      effectiveTheme = 'dark';
    } else {
      effectiveTheme = defaultTheme;
    }

    // Apply the theme and sync with system preferences if needed
    const isDark = effectiveTheme === 'dark' || (effectiveTheme === 'system' && prefersDark);

    root.classList.toggle('dark', isDark);
    setTheme(effectiveTheme);

    // Save to localStorage and cookie for SSR consistency
    localStorage.setItem('theme', effectiveTheme);
    document.cookie = `theme=${effectiveTheme}; path=/; max-age=31536000`; // 1 year expiry
  }, [defaultTheme]);

  const handleSetTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = newTheme === 'dark' || (newTheme === 'system' && prefersDark);

    root.classList.toggle('dark', isDark);
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000`;
  };

  // Properly memoize the context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(
    () => ({
      theme,
      setTheme: handleSetTheme,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

/**
 * DEPRECATED: This hook should be moved to hooks/theme/useTheme.ts
 * Use import { useTheme } from '@/hooks' in the future
 */
export const useTheme = () => useContext(ThemeContext);
