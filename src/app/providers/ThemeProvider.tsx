'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';
import { useEffect } from 'react';

/**
 * ThemeProvider wrapper around next-themes ThemeProvider
 * This component handles theme state and persistence
 * To access theme functionality, use the useTheme hook from @/hooks/theme
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  ...props
}: ThemeProviderProps & { defaultTheme?: string }) {
  // Effect to set cookie when theme changes (handled by next-themes already in localStorage)
  useEffect(() => {
    // Add a script to the document to handle cookie syncing
    const script = document.createElement('script');
    script.id = 'theme-cookie-script';
    script.innerHTML = `
      (function() {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class' && mutation.target === document.documentElement) {
              const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
              document.cookie = 'theme=' + theme + '; path=/; max-age=31536000';
            }
          });
        });
        observer.observe(document.documentElement, { attributes: true });
      })();
    `;
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById('theme-cookie-script');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

// No hooks exported from this provider - use @/hooks/theme instead
