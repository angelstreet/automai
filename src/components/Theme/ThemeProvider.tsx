'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';
import * as React from 'react';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
      onValueChange={(theme) => {
        // Set theme cookie when theme changes
        document.cookie = `theme=${theme}; path=/; max-age=31536000`; // 1 year
      }}
    >
      {children}
    </NextThemesProvider>
  );
}
