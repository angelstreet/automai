# Theme System Documentation

This document explains how our theme system works and how to add new custom themes to the application.

## Architecture Overview

Our theme system uses a combination of:

1. **CSS Variables** - Defined in `globals.css` with themed color palettes
2. **Next-Themes** - For theme state management via React context
3. **Event-Based Communication** - For DOM updates without direct manipulation
4. **Class-Based Theming** - Using HTML classes to apply different themes

## How to Add a New Theme

Adding a new theme requires updates to four key components:

### 1. Add Theme Class in globals.css

First, define your theme colors in `globals.css` by adding a new class:

```css
@layer base {
  /* Existing root and dark themes... */

  .mytheme {
    --background: 45 70% 95%; /* HSL format: hue saturation% lightness% */
    --foreground: 45 80% 10%;

    --card: 45 70% 95%;
    --card-foreground: 45 80% 10%;

    --popover: 45 70% 95%;
    --popover-foreground: 45 80% 10%;

    --primary: 45 90% 40%;
    --primary-foreground: 45 10% 98%;

    --secondary: 45 30% 88%;
    --secondary-foreground: 45 80% 15%;

    --muted: 45 30% 88%;
    --muted-foreground: 45 40% 35%;

    --accent: 45 70% 50%;
    --accent-foreground: 45 10% 98%;

    --destructive: 0 65% 60%;
    --destructive-foreground: 45 10% 98%;

    --border: 45 40% 85%;
    --input: 45 40% 85%;
    --ring: 45 80% 40%;

    --radius: 0.5rem;

    /* Chart colors, sidebar variables, etc. */
    /* ... */

    /* Sidebar theme variables */
    --sidebar: 45 65% 90%;
    --sidebar-foreground: var(--foreground);
    --sidebar-muted-foreground: var(--muted-foreground);
    --sidebar-accent: var(--accent);
    --sidebar-accent-foreground: var(--accent-foreground);
    --sidebar-border: var(--border);
    --sidebar-separator: var(--border);
    --sidebar-ring: var(--ring);
  }
}
```

### 2. Update ThemeEventListener.tsx

Modify the `ThemeEventListener.tsx` to handle your new theme:

```typescript
export default function ThemeEventListener() {
  useEffect(() => {
    const handleThemeChanged = (event: CustomEvent<{ theme: string }>) => {
      const { theme } = event.detail;

      // Apply theme class to document
      const root = document.documentElement;

      // Remove all theme classes first - ADD YOUR THEME HERE
      root.classList.remove('dark', 'blue', 'mytheme');

      // Apply the appropriate theme class - ADD YOUR THEME HERE
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'blue') {
        root.classList.add('blue');
      } else if (theme === 'mytheme') {
        root.classList.add('mytheme');
      }
      // 'light' theme is the default (no class needed)

      // Set cookie for SSR consistency
      document.cookie = `theme=${theme}; path=/; max-age=31536000`; // 1 year
    };

    // Add event listener with type assertion
    window.addEventListener(THEME_CHANGED, handleThemeChanged as EventListener);

    return () => {
      window.removeEventListener(THEME_CHANGED, handleThemeChanged as EventListener);
    };
  }, []);

  // This component renders nothing
  return null;
}
```

### 3. Update ThemeToggleStatic.tsx

Add your theme to the toggle component:

```typescript
export function ThemeToggleStatic() {
  // ...existing code...

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 blue:scale-0 blue:-rotate-90 mytheme:scale-0 mytheme:-rotate-90" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 blue:scale-0 mytheme:scale-0" />
          <PaintBrush className="absolute h-4 w-4 rotate-90 scale-0 transition-all blue:rotate-0 blue:scale-100 mytheme:scale-0" />
          {/* Add an icon for your theme */}
          <YourIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all mytheme:rotate-0 mytheme:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Existing menu items... */}

        {/* Add your theme */}
        <DropdownMenuItem onClick={() => setTheme('mytheme')} className="flex items-center gap-2">
          <YourIcon className="h-4 w-4" />
          <span>My Theme</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setTheme('system')} className="flex items-center gap-2">
          <Laptop className="h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 4. Update ThemeProvider.tsx

Add your theme to the list of available themes:

```typescript
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={['light', 'dark', 'blue', 'mytheme', 'system']}
      {...props}
    >
      {/* Include the theme event listener component */}
      <ThemeEventListener />

      {children}
    </NextThemesProvider>
  );
}
```

## Design Guidelines for Creating New Themes

When designing a new theme, follow these guidelines:

1. **Maintain Contrast Ratios** - Ensure text has sufficient contrast against backgrounds (WCAG 2.1 AA requires 4.5:1 for normal text)

2. **Consistent Color Relationships** - Keep relationships between colors consistent (e.g., if primary is darker than secondary in light theme, maintain that pattern)

3. **Test Across Components** - Verify your theme works well with all UI components, especially:

   - Buttons and interactive elements
   - Forms and inputs
   - Modals and dialogs
   - Tables and data displays

4. **Harmony in Color Selection** - Choose a cohesive palette. Use tools like Adobe Color or Coolors to generate harmonious color schemes

5. **Icon Selection** - Choose an appropriate icon that visually represents your theme

## Color Variable Naming Convention

Our CSS variables follow this naming pattern:

- `--background`: Main background color
- `--foreground`: Main text color
- `--card`: Card/surface background color
- `--card-foreground`: Text color on cards
- `--primary`: Primary action color (buttons, active states)
- `--secondary`: Secondary UI elements
- `--muted`: Subdued UI elements
- `--accent`: Accent/highlight color
- `--destructive`: Error/warning color
- `--border`: Border color
- `--input`: Input field borders
- `--ring`: Focus ring color

## Example: Creating a "Forest" Theme

Here's a complete example of adding a "Forest" theme:

```css
/* In globals.css */
.forest {
  --background: 120 15% 95%; /* Light green-tinted background */
  --foreground: 120 30% 15%; /* Dark green text */

  --card: 120 15% 97%;
  --card-foreground: 120 30% 15%;

  --primary: 150 60% 30%; /* Deep green for primary elements */
  --primary-foreground: 120 10% 98%;

  --secondary: 140 20% 85%; /* Soft green for secondary elements */
  --secondary-foreground: 150 60% 25%;

  /* ...and so on for all variables */
}
```

Then update the components as described above to include the "forest" theme.

## Tailwind Integration

Our theme system automatically works with Tailwind's `dark:` variant. For custom themes, you can extend Tailwind's config to add variants for your theme:

```js
// tailwind.config.js
module.exports = {
  content: [
    /* ... */
  ],
  darkMode: 'class',
  theme: {
    extend: {
      /* ... */
    },
  },
  plugins: [
    // Add a plugin for your custom theme variants
    function ({ addVariant }) {
      addVariant('mytheme', '.mytheme &');
    },
  ],
};
```

This allows using Tailwind classes like `mytheme:bg-green-500` in your components.
