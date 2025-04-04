# Theme System Architecture

This document explains how our theme system works, including how to add or modify themes.

## Overview

Our theme system is built on top of [next-themes](https://github.com/pacocoursey/next-themes) with additional customizations:

1. **Server-side cookie persistence** for consistent SSR rendering
2. **Custom theme hook** providing simplified theme utilities
3. **Theme toggle component** for user interaction

## Architecture Workflow

1. **Server Component Initialization**:

   - `ThemeProviderWithCookies` reads the theme cookie server-side
   - Passes initial theme to client-side ThemeProvider for hydration

2. **Client Component Handling**:

   - `ThemeProvider` manages theme state via next-themes
   - `useTheme` hook provides utilities and persistence
   - `ThemeToggleStatic` offers UI for theme selection

3. **Cookie Persistence Flow**:
   - When theme changes in the client, server actions are called
   - Server actions securely set cookies for server-side rendering
   - On refresh/reload, cookies are read to maintain consistency

## Components

### 1. ThemeProvider

Located in `src/app/providers/ThemeProvider.tsx`, this wraps the application to provide theme context:

- Manages theme state via next-themes
- Handles cookie synchronization for server-side rendering

### 2. useTheme Hook

Located in `src/hooks/useTheme.ts`, this custom hook:

- Wraps `next-themes` functionality with additional utilities
- Handles server-side cookie persistence through server actions
- Provides convenient helper methods (`isDark`, `isLight`, etc.)

### 3. Theme Toggle

Located in `src/components/theme/ThemeToggleStatic.tsx`, this provides the UI for users to change themes.

### 4. Server Action

Located in `src/app/actions/themeAction.ts`, this handles cookie operations:

- Provides a server action for secure cookie management
- Ensures cookies work properly across environments

## CSS Structure

Themes are defined in `src/app/globals.css` using CSS variables:

```css
:root {
  /* Light theme variables (default) */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... more variables ... */
}

.dark {
  /* Dark theme variables */
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... more variables ... */
}

.blue {
  /* Blue theme variables */
  --background: 217 33% 17%;
  --foreground: 210 40% 98%;
  /* ... more variables ... */
}
```

## Adding a New Theme

1. Define your theme in `globals.css` with a new class name:

```css
.my-theme-name {
  --background: /* your value */;
  --foreground: /* your value */;
  /* Define all required theme variables */
}
```

2. Update `src/app/providers/ThemeProvider.tsx` to include your theme:

```tsx
<NextThemesProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  themes={['light', 'dark', 'blue', 'my-theme-name']}
  {...props}
>
  {children}
</NextThemesProvider>
```

3. Update the `ThemeToggleStatic.tsx` to include your new theme option:

```tsx
<DropdownMenuItem onClick={() => setTheme('my-theme-name')}>
  {/* Icon for your theme */}
  <span>My Theme Name</span>
</DropdownMenuItem>
```

4. Update the `useTheme.ts` hook to add any needed helpers:

```tsx
isMyTheme: resolvedTheme === 'my-theme-name',
```

## Best Practices

1. Always use the `useTheme` hook rather than direct DOM manipulation
2. Let next-themes handle the class swapping and initial loading
3. For implementing theme-aware components, use CSS variables
4. For server components that need theme awareness, read from cookies
