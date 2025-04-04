'use client';

import { useTheme as useNextTheme } from 'next-themes';

/**
 * Custom theme hook that wraps next-themes
 * Provides convenient helper methods
 */
export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme();

  return {
    // Core theme props
    theme,
    setTheme,
    resolvedTheme,
    systemTheme,

    // Helper booleans
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isBlue: resolvedTheme === 'blue',
    isSystem: theme === 'system',

    // Simple toggle function
    toggle: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
  };
}
