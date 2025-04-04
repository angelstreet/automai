'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';
import * as React from 'react';

import ThemeEventListener from './ThemeEventListener';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {/* Include the theme event listener component */}
      <ThemeEventListener />

      {children}
    </NextThemesProvider>
  );
}
