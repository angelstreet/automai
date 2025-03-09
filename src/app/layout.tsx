'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
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
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const root = document.documentElement;
    // Get the initial theme from the server-rendered classList
    const initialIsDark = root.classList.contains('dark');
    const savedTheme = localStorage.getItem('theme') as Theme;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Determine effective theme
    const effectiveTheme = savedTheme || (initialIsDark ? 'dark' : 'light') || defaultTheme;
    const isDark =
      effectiveTheme === 'dark' ||
      (effectiveTheme === 'system' && prefersDark);

    // Sync the DOM with the effective theme
    root.classList.toggle('dark', isDark);
    setTheme(effectiveTheme);

    // Save to localStorage and cookie for consistency
    if (!savedTheme) {
      localStorage.setItem('theme', effectiveTheme);
      document.cookie = `theme=${effectiveTheme}; path=/; max-age=31536000`; // 1 year
    }
  }, [defaultTheme]);

  const handleSetTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark =
      newTheme === 'dark' ||
      (newTheme === 'system' && prefersDark);

    root.classList.toggle('dark', isDark);
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000`;
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);