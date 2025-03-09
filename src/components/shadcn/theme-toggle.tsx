'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Moon, Sun, Laptop } from 'lucide-react';
import { useTheme as useNextThemes } from 'next-themes';
import { useTheme as useCustomTheme } from '@/context/ThemeContext';

import { Button } from '@/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';

export function ThemeToggle() {
  // Use both theme hooks for compatibility
  const nextThemes = useNextThemes();
  const customTheme = useCustomTheme();
  const [mounted, setMounted] = useState(false);

  // Determine which theme API to use (prefer next-themes)
  const theme = nextThemes.theme || customTheme.theme;

  // Synchronize themes on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get theme from localStorage
      const savedTheme = localStorage.getItem('theme');
      
      // If there's a saved theme, make sure both providers are using it
      if (savedTheme && savedTheme !== theme) {
        // Update next-themes if available
        if (nextThemes.setTheme) {
          nextThemes.setTheme(savedTheme);
        }
        
        // Update custom theme provider if available
        if (customTheme.setTheme) {
          customTheme.setTheme(savedTheme as any);
        }
      }
    }
  }, [mounted, nextThemes, customTheme, theme]);

  // Function to set theme in both providers for maximum compatibility
  const setTheme = (newTheme: string) => {
    // Set theme in next-themes provider
    if (nextThemes.setTheme) {
      nextThemes.setTheme(newTheme);
    }

    // Also set theme in custom provider if available
    if (customTheme.setTheme) {
      customTheme.setTheme(newTheme as any);
    }

    // Optionally, manually set the theme class on html element as a fallback
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      const isDark =
        newTheme === 'dark' ||
        (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Save theme in localStorage for persistence
      localStorage.setItem('theme', newTheme);
    }
  };

  // Wait for client-side hydration to prevent SSR issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')} className="flex items-center gap-2">
          <Sun className="h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className="flex items-center gap-2">
          <Moon className="h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className="flex items-center gap-2">
          <Laptop className="h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
