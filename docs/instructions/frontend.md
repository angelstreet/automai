# Automai Frontend Implementation Guide

## Status Indicators
🔴 Not Started | 🟡 In Progress | 🟢 Completed

## 1. Project Setup 🟢
1. Initialize Next.js project ✅
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --src --turbo
   ```

2. Install core dependencies ✅
   ```bash
   # UI Components
   npm install @radix-ui/react-slot @radix-ui/react-navigation-menu @radix-ui/react-dropdown-menu @radix-ui/react-dialog lucide-react clsx tailwind-merge

   # Internationalization
   npm install next-intl

   # Testing
   npm install @puppeteer/browsers
   ```

3. Setup shadcn-ui ✅
   ```bash
   npx shadcn-ui@latest init
   ```
   Configuration:
   - TypeScript: Yes
   - Style: Default
   - Base color: Slate
   - Global CSS: src/app/globals.css
   - CSS variables: No
   - tailwind.config location: tailwind.config.ts
   - Components alias: @/components
   - Utils alias: @/lib/utils

4. Install required shadcn components ✅
   ```bash
   npx shadcn-ui@latest add button card sheet dialog dropdown-menu input select tooltip collapsible
   ```

## 2. Project Structure 🟢

### Directory Structure
```
src/
├── app/
│   └── [locale]/
│       ├── (auth)/
│       │   ├── login/
│       │   └── signup/
│       ├── (marketing)/
│       │   └── components/
│       └── [tenant]/
│           ├── layout.tsx
│           └── dashboard/
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── site-header.tsx
│   │   └── workspace-header.tsx
│   └── ui/
│       ├── role-switcher.tsx
│       └── theme-toggle.tsx
├── i18n/
├── lib/
└── types/
```

## 3. Core Components Implementation 🟢

### Sidebar Implementation ✅
- Collapsible sidebar with toggle
- Role-based menu visibility
- Click-based submenu expansion
- Tooltips for collapsed state
- Active state tracking
- Multi-level navigation

```typescript
type Role = 'admin' | 'developer' | 'tester' | 'viewer';

interface MenuItem {
  icon: any;
  label: string;
  href?: string;
  roles: Role[];
  submenu?: SubMenuItem[];
}

interface SubMenuItem {
  icon: any;
  label: string;
  href: string;
}
```

### Menu Structure ✅
```typescript
const menuItems = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/dashboard',
    roles: ['admin', 'developer', 'tester', 'viewer'],
  },
  {
    icon: Code2,
    label: 'Development',
    roles: ['admin', 'developer'],
    submenu: [
      { icon: FileCode, label: 'Project', href: '/development/project' },
      { icon: TestTube, label: 'Use Case', href: '/development/use-case' },
      { icon: Flag, label: 'Campaign', href: '/development/campaign' },
    ]
  },
  // ... other menu items
];
```

### Role Switcher ✅
- Role selection dropdown
- Role-based menu filtering
- Event-based role updates
- Persistent role state

### Workspace Layout ✅
- Responsive layout structure
- Sidebar integration
- Header with tenant name
- Role switcher integration
- Theme toggle support

## 4. Internationalization Setup 🟢

1. Middleware Configuration ✅
```typescript
// src/middleware.ts
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'en'
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
```

2. Next.js Configuration ✅
```javascript
// next.config.js
const withNextIntl = require('next-intl/plugin')();

module.exports = withNextIntl({
  // other next.js config
});
```

## 5. Theme Implementation 🟢

1. Theme Configuration ✅
```typescript
// tailwind.config.ts
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      // custom theme extensions
    }
  }
}
```

2. Theme Components ✅
- Theme toggle button
- Dark mode support
- System theme detection
- Persistent theme preference

## 6. Authentication Pages 🟢

### Login Page ✅
- Email/password inputs
- Remember me option
- Error handling
- Responsive design
- i18n support

### Signup Page ✅
- Registration form
- Password confirmation
- Terms acceptance
- Validation
- i18n support

## 7. Testing Setup 🟢

1. Jest Configuration ✅
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  }
};
```

2. E2E Testing ✅
- Puppeteer setup
- Basic test examples
- Page load tests
- Navigation tests

## Current Status

### Completed Features 🟢
- Project structure and setup
- Core UI components
- Sidebar implementation
- Role-based access
- i18n support
- Theme switching
- Authentication pages
- Testing framework

### Next Steps 🎯
1. Implement remaining workspace pages
2. Add more comprehensive tests
3. Enhance error handling
4. Improve accessibility
5. Add loading states
6. Implement real authentication
7. Add more i18n translations

## Development Guidelines

1. Component Structure
   - Use TypeScript for all components
   - Implement proper prop types
   - Add JSDoc comments for complex functions

2. Styling
   - Use Tailwind CSS classes
   - Follow shadcn/ui patterns
   - Maintain dark mode support

3. State Management
   - Use React hooks for local state
   - Implement context where needed
   - Keep state close to where it's used

4. Testing
   - Write unit tests for utilities
   - Add component tests
   - Implement E2E tests for critical paths

5. Code Organization
   - Group related components
   - Use barrel exports
   - Maintain clear file structure 