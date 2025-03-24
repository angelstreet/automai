'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';

type Theme = 'light' | 'dark' | 'system';

// Singleton flag to prevent multiple instances
let THEME_CONTEXT_INITIALIZED = false;

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => null,
});

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  // Check for multiple instances of ThemeProvider
  useEffect(() => {
    if (THEME_CONTEXT_INITIALIZED) {
      console.warn('[ThemeContext] Multiple instances detected. This may cause unexpected behavior.');
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

  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
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
  const contextValue = useMemo(() => ({
    theme,
    setTheme: handleSetTheme
  }), [theme, handleSetTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
