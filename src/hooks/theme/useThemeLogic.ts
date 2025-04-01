'use client';

import { useState, useEffect } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

// Define theme type
type Theme = 'light' | 'dark' | 'system';

export function useThemeLogic(defaultTheme: Theme = 'system') {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const { setTheme: setNextTheme, theme: nextTheme } = useNextTheme();

  // Sync our state with next-themes
  useEffect(() => {
    if (nextTheme && (nextTheme === 'light' || nextTheme === 'dark' || nextTheme === 'system')) {
      setTheme(nextTheme as Theme);
    }
  }, [nextTheme]);

  // Update both our state and next-themes when theme changes
  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setNextTheme(newTheme);
  };

  return {
    theme,
    setTheme: updateTheme
  };
}