'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';
import * as React from 'react';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Create a custom cookie setter function
  const setCookieOnChange = (theme: string) => {
    // Set theme cookie when theme changes
    document.cookie = `theme=${theme}; path=/; max-age=31536000`; // 1 year
  };

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
      {/* Add a hidden script to set cookies when theme changes */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
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
          `,
        }}
      />
    </NextThemesProvider>
  );
}
