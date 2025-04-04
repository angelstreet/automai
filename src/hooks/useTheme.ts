'use client';

import { useTheme as useNextTheme } from 'next-themes';
import { useContext, useEffect } from 'react';

import { ThemeContext } from '@/context/ThemeContext';
import { THEME_CHANGED } from '@/components/theme/ThemeEventListener';

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

  // Synchronize themes with events rather than direct DOM manipulation
  useEffect(() => {
    if (typeof window === 'undefined' || !resolvedTheme) return;

    // Set localStorage (next-themes does this but we're making it explicit)
    try {
      localStorage.setItem('theme', resolvedTheme);
    } catch (e) {
      console.error('Failed to set theme in localStorage:', e);
    }

    // Dispatch theme changed event instead of direct DOM manipulation
    window.dispatchEvent(new CustomEvent(THEME_CHANGED, { detail: { theme: resolvedTheme } }));
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
