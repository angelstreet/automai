'use client';

import { useTheme as useNextTheme } from 'next-themes';
import { useContext, useEffect } from 'react';

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
 * This combines the next-themes hook with persistence
 */
export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme();

  // Synchronize themes with cookies and localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !resolvedTheme) return;

    // Set cookie when theme changes
    const newTheme = resolvedTheme;
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000`; // 1 year

    // Set localStorage (next-themes does this but we're making it explicit)
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {
      console.error('Failed to set theme in localStorage:', e);
    }

    // Apply theme class to document (next-themes does this but we're being thorough)
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }, [resolvedTheme]);

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
