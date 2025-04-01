'use client';

import { useTheme as useNextTheme } from 'next-themes';
import { useContext } from 'react';

import { ThemeContext } from '@/context/ThemeContext';

/**
 * Access the theme context
 * This is a simple hook that just provides access to the context
 */
export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Primary hook for theme functionality
 * This combines the next-themes hook with our own context
 */
export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme();

  // Expose theme methods for components
  return {
    theme,
    setTheme,
    resolvedTheme,
    systemTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system',
    toggle: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
  };
}
