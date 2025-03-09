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
  // Initialize with defaultTheme, but this will be updated in useEffect
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    // Mark component as mounted to avoid hydration mismatch
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      // Get theme from localStorage (set by our ThemeScript)
      const savedTheme = localStorage.getItem('theme') as Theme;
      
      // If we have a saved theme, update our state
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }
  }, []);

  const handleSetTheme = (newTheme: Theme) => {
    // Update state
    setTheme(newTheme);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
      
      // Apply theme to document
      const root = window.document.documentElement;
      const isDark =
        newTheme === 'dark' ||
        (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      // Update class
      root.classList.toggle('dark', isDark);
    }
  };

  // Avoid hydration mismatch by only rendering children after mounting
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext); 