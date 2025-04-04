'use client';
import { Moon, Sun, Laptop } from 'lucide-react';
import { useTheme as useNextThemes } from 'next-themes';
import * as React from 'react';

import { Button } from '@/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { THEME_CHANGED } from '@/components/theme/ThemeEventListener';

export function ThemeToggleStatic() {
  // Use next-themes for theme management
  const nextThemes = useNextThemes();
  const [_mounted, _setMounted] = React.useState(true); // Start as true to prevent flashing

  // Function to set theme using event pattern
  const setTheme = (newTheme: string) => {
    // Set theme in next-themes provider
    if (nextThemes.setTheme) {
      nextThemes.setTheme(newTheme);
    }

    // Dispatch theme changed event instead of direct DOM manipulation
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(THEME_CHANGED, { detail: { theme: newTheme } }));

      // Save theme in localStorage for persistence
      localStorage.setItem('theme', newTheme);
    }
  };

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
        <DropdownMenuItem onClick={() => setTheme('blue')} className="flex items-center gap-2">
          <Mountain className="h-4 w-4" />
          <span>Blue</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className="flex items-center gap-2">
          <Laptop className="h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
