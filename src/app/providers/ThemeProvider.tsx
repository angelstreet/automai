'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';
import { useEffect } from 'react';

/**
 * Simple ThemeProvider wrapper for next-themes
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  ...props
}: ThemeProviderProps & { defaultTheme?: string }) {
  // Add cookie syncing for SSR
  useEffect(() => {
    const script = document.createElement('script');
    script.id = 'theme-script';
    script.innerHTML = `
      new MutationObserver(mutations => {
        for (const m of mutations) {
          if (m.attributeName === 'class') {
            // Detect theme from classes
            const isDark = document.documentElement.classList.contains('dark');
            const isBlue = document.documentElement.classList.contains('blue');
            
            // Set appropriate theme
            let theme = 'light';
            if (isDark) theme = 'dark';
            if (isBlue) theme = 'blue';
            
            // Update cookie for SSR
            document.cookie = 'theme=' + theme + '; path=/; max-age=31536000';
          }
        }
      }).observe(document.documentElement, {attributes: true});
    `;
    document.head.appendChild(script);

    // Clean up
    return () => {
      document.getElementById('theme-script')?.remove();
    };
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      themes={['light', 'dark', 'blue', 'system']}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

// No hooks exported from this provider - use @/hooks/theme instead
