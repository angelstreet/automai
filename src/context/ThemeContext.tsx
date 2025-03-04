'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, _setTheme] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Once mounted on client, get the theme from localStorage
  useEffect(() => {
    setMounted(true);
    const savedTheme =
      typeof window !== 'undefined' ? (localStorage.getItem(storageKey) as Theme) : null;
    if (savedTheme) {
      _setTheme(savedTheme);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (theme: Theme) => {
      root.classList.remove('light', 'dark'); // Remove existing theme classes
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      const effectiveTheme = theme === 'system' ? systemTheme : theme;
      root.classList.add(effectiveTheme); // Add the new theme class
      
      // Update theme-color meta tag
      const themeColor = effectiveTheme === 'dark' ? '#020817' : '#ffffff';
      const metaThemeColor = document.querySelector("meta[name='theme-color']");
      if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor);
    };

    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    applyTheme(theme);

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  const setTheme = (theme: Theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, theme);
      // Set theme cookie when theme changes
      document.cookie = `theme=${theme}; path=/; max-age=31536000`; // 1 year
    }
    _setTheme(theme);
  };

  const value = {
    theme,
    setTheme,
  };

  // Prevent flash of incorrect theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
