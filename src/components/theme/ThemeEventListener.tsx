'use client';

import { useEffect } from 'react';

// Define theme event constants
export const THEME_CHANGED = 'THEME_CHANGED';

export default function ThemeEventListener() {
  useEffect(() => {
    const handleThemeChanged = (event: CustomEvent<{ theme: string }>) => {
      const { theme } = event.detail;

      // Apply theme class to document
      const root = document.documentElement;

      // Remove all theme classes first
      root.classList.remove('dark', 'blue');

      // Apply the appropriate theme class
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'blue') {
        root.classList.add('blue');
      }
      // 'light' theme is the default (no class needed)

      // Set cookie for SSR consistency
      document.cookie = `theme=${theme}; path=/; max-age=31536000`; // 1 year
    };

    // Add event listener with type assertion
    window.addEventListener(THEME_CHANGED, handleThemeChanged as EventListener);

    return () => {
      window.removeEventListener(THEME_CHANGED, handleThemeChanged as EventListener);
    };
  }, []);

  // This component renders nothing
  return null;
}
