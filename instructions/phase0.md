# Development Instructions for Initial Phase

## Status Indicators
🔴 Not Started | 🟡 In Progress | 🟢 Completed

## 1. Project Setup 🟢
1. Initialize Next.js in current directory:
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --src --turbo
   ```

2. Update PostCSS configuration: 
   ```javascript
   // postcss.config.js
   module.exports = {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     }
   }
   ```

3. Install required dependencies:
   ```bash
   # Install UI Components
   npm install @radix-ui/react-slot @radix-ui/react-navigation-menu @radix-ui/react-dropdown-menu @radix-ui/react-dialog lucide-react clsx tailwind-merge

   # Install i18n
   npm install next-intl
   
   # Install testing tools
   npm install @puppeteer/browsers
   ```

4. Setup shadcn-ui:
   ```bash
   npx shadcn-ui@latest init
   ```
   Select:
   - TypeScript? → `Yes`
   - Style → `Default`
   - Base color → `Slate`
   - Global CSS file → `src/app/globals.css`
   - CSS variables → `No`
   - tailwind.config location → `tailwind.config.ts`
   - Components alias → `@/components`
   - Utils alias → `@/lib/utils`

5. Install required shadcn components:
   ```bash
   npx shadcn-ui@latest add button card sheet dialog dropdown-menu input
   ```

## 2. Project Structure 🔴
Create the following structure from project root:
```
src/
  app/
    [locale]/
      (auth)/
        login/
          page.tsx
        signup/
          page.tsx
      (marketing)/
        page.tsx
        components/
          hero.tsx
          features.tsx
          footer.tsx
      [tenant]/
        layout.tsx
        dashboard/
          page.tsx
        # Other menu pages...
  components/
    layout/
      main-nav.tsx
      site-header.tsx
      sidebar.tsx
      workspace-header.tsx
      breadcrumb.tsx
      footer.tsx
    ui/
      role-switcher.tsx
      theme-toggle.tsx
      user-nav.tsx
      button.tsx
      logo.tsx
      language-switcher.tsx
```

## 3. Internationalization Setup 🔴
1. Create middleware.ts in src:
```typescript
import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'en'
});
 
export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
```

2. Update next.config.js in project root:
```javascript
const withNextIntl = require('next-intl/plugin')();
 
module.exports = withNextIntl({
  // other next.js config
});
```

## 4. Theme Configuration 🔴
Update tailwind.config.ts in project root:
```javascript
module.exports = {
  darkMode: 'class',
  // rest of config
}
```

## 5. Core Components Implementation 🔴

### Header Component
```typescript
// src/components/layout/site-header.tsx
interface HeaderProps {
  showAuth?: boolean;
}

// Required features:
// - Logo
// - Navigation links
// - Language switcher
// - Theme toggle
// - Auth buttons (conditional)
```

### Footer Component
```typescript
// src/components/layout/footer.tsx
// Required sections:
// - Logo and tagline
// - Quick links
// - Social media links
// - Newsletter signup (optional)
// - Copyright notice
```

### Landing Page Components
```typescript
// src/app/[locale]/(marketing)/components/hero.tsx
// Required features:
// - Compelling headline
// - Subheadline
// - CTA buttons (Get Started, Learn More)
// - Hero image/animation

// src/app/[locale]/(marketing)/components/features.tsx
// Required features:
// - Feature grid/list
// - Icons for each feature
// - Feature descriptions
```

### Theme Toggle
```typescript
// src/components/ui/theme-toggle.tsx
interface ThemeToggleProps {
  className?: string;
}
// Required features:
// - Light/Dark mode toggle
// - System preference detection
// - Persistent preference storage
```

### Language Switcher
```typescript
// src/components/ui/language-switcher.tsx
interface LanguageSwitcherProps {
  className?: string;
}
// Required features:
// - Language selection dropdown
// - Current language display
// - Language icons/flags
```

### Sidebar Component
```typescript
// src/components/layout/sidebar.tsx
interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

const menuItems = [
  { icon: 'Home', label: 'Dashboard', href: '/dashboard' },
  { icon: 'Code', label: 'Scripts', href: '/scripts' },
  // ... other menu items
];
```

### Workspace Header
Create in src/components/layout/workspace-header.tsx:
- Tenant logo
- Theme toggle
- User navigation
- Breadcrumb (collapsible)

### Role Switcher
```typescript
// src/components/ui/role-switcher.tsx
type Role = 'admin' | 'developer' | 'tester' | 'viewer';

interface RoleSwitcherProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
}
```

## 6. Page Implementations 🔴

### Landing Page (src/app/[locale]/(marketing)/page.tsx)
Required sections:
- Hero section with CTA buttons
- Features grid/list
- How it works section
- Testimonials (optional)
- Pricing (optional)
- Footer

### Auth Pages
Login page requirements:
- Email/username input
- Password input
- Remember me checkbox
- Forgot password link
- OAuth providers (optional)
- Sign up link

Signup page requirements:
- Email input
- Password input
- Confirm password
- Terms acceptance checkbox
- OAuth providers (optional)
- Login link

### Workspace Pages
Create in src/app/[locale]/[tenant]/:
- Empty dashboard with placeholder
- Empty menu pages with headers

## 7. Testing Setup 🔴
Create tests/setup.ts:
```javascript
import { Browser, createBrowser } from '@puppeteer/browsers';
// Configuration here
```

## Implementation Order
1. Project setup & structure
2. Core layout components
   - Header with navigation
   - Footer
   - Theme toggle
   - Language switcher
3. Landing page
   - Hero section
   - Features section
   - Footer integration
4. Auth pages
5. Workspace layout
6. Empty menu pages
7. i18n setup
8. Testing setup

## Next Step
🎯 Begin with project setup (Step 1)