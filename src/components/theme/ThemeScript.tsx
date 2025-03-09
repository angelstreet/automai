'use client';

import React from 'react';
import Script from 'next/script';

/**
 * This component injects a script that runs immediately before React hydration
 * to set the correct theme class on the document, preventing flash of incorrect theme.
 */
export function ThemeScript() {
  return (
    <Script
      id="theme-script"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            // Try to get the theme from localStorage
            const storedTheme = localStorage.getItem('theme');
            
            // If we have a stored theme, use it
            if (storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'system') {
              // For system preference, check the OS preference
              if (storedTheme === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.classList.toggle('dark', prefersDark);
              } else {
                // Otherwise use the stored theme directly
                document.documentElement.classList.toggle('dark', storedTheme === 'dark');
              }
            } else {
              // If no stored theme, default to system preference
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              document.documentElement.classList.toggle('dark', prefersDark);
              
              // Store the system preference for future use
              localStorage.setItem('theme', 'system');
            }
          })();
        `,
      }}
    />
  );
} 