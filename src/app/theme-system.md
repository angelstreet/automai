# Theme System

This document explains our minimal theme system implementation.

## Overview

Our theme system uses:

- **next-themes** for client-side theme management
- **CSS variables** for styling
- **Cookies** for SSR consistency

## How It Works

1. **Server Render**:

   - Read theme cookie
   - Apply theme class to HTML
   - Render content with correct theme

2. **Client Hydration**:

   - next-themes initializes from HTML class
   - Theme toggle controls are activated

3. **Theme Changes**:
   - User selects a theme
   - next-themes updates HTML classes
   - MutationObserver updates cookie for next render

## Required Files

### 1. ThemeProvider (src/app/providers/ThemeProvider.tsx)

```tsx
'use client';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect } from 'react';

export function ThemeProvider({ children, defaultTheme = 'system', ...props }) {
  // Simple script to sync theme class to cookie
  useEffect(() => {
    const script = document.createElement('script');
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
    return () => script.remove();
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
```

### 2. useTheme Hook (src/hooks/useTheme.ts)

```tsx
'use client';
import { useTheme as useNextTheme } from 'next-themes';

export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme();

  return {
    // Core theme props
    theme,
    setTheme,
    resolvedTheme,
    systemTheme,

    // Helper booleans
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isBlue: resolvedTheme === 'blue',
    isSystem: theme === 'system',

    // Simple toggle function
    toggle: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
  };
}
```

### 3. Theme Toggle (src/components/theme/ThemeToggleStatic.tsx)

```tsx
'use client';
import { Sun, Moon, Cloud } from 'lucide-react';
import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';

export function ThemeToggleStatic() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          {resolvedTheme === 'light' ? (
            <Sun className="h-5 w-5" />
          ) : resolvedTheme === 'dark' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Cloud className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('blue')}>
          <Cloud className="mr-2 h-4 w-4" />
          <span>Blue</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <span className="mr-2">🖥️</span>
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 4. Root Layout Integration

```tsx
// src/app/layout.tsx
import { cookies } from 'next/headers';
import { ThemeProvider } from '@/app/providers';

export default function RootLayout({ children }) {
  // Get theme from cookie for SSR
  const theme = cookies().get('theme')?.value;

  return (
    <html lang="en" className={theme || ''}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

### 5. CSS Variables (src/app/globals.css)

```css
:root {
  /* Light theme variables */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* other variables... */
}

.dark {
  /* Dark theme variables */
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* other variables... */
}

.blue {
  /* Blue theme variables */
  --background: 217 33% 17%;
  --foreground: 210 40% 98%;
  /* other variables... */
}
```

## Adding a New Theme

1. Add CSS variables in `globals.css`:

   ```css
   .my-theme {
     --background: /* value */;
     --foreground: /* value */;
     /* other variables... */
   }
   ```

2. Update theme detection in ThemeProvider:

   ```js
   const isMyTheme = document.documentElement.classList.contains('my-theme');
   // ...
   if (isMyTheme) theme = 'my-theme';
   ```

3. Add theme to the provider's themes array:

   ```js
   themes={['light', 'dark', 'blue', 'my-theme', 'system']}
   ```

4. Add toggle option in ThemeToggleStatic

   ```jsx
   <DropdownMenuItem onClick={() => setTheme('my-theme')}>
     <Palette className="mr-2 h-4 w-4" />
     <span>My Theme</span>
   </DropdownMenuItem>
   ```

5. Add helper in useTheme:
   ```js
   isMyTheme: resolvedTheme === 'my-theme',
   ```

## Best Practices

1. Use `useTheme()` for all theme operations - never manipulate classes directly
2. Style components using CSS variables (e.g., `bg-background text-foreground`)
3. For theme-specific styles, use the class modifier (e.g., `.dark .my-component`)
4. Test all themes when adding new UI components
