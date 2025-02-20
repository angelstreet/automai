# UI Technical Specification

## Header Component
- Height: 48px (compact)
- Background: Subtle background color or transparent
- Components (left to right):
  * Tenant logo (max height 32px)
  * Global search bar (expandable)
  * Right section:
    - Theme toggle (light/dark)
    - User profile dropdown (avatar + name)
      * Logout option
      * Profile settings

### Breadcrumb Navigation
- Height: 32px
- Position: Below header
- Behavior: Auto-collapse after 3 seconds
- Show on mouse hover near top area
- Shows current menu path based on sidebar navigation

## Workspace Layout
### Grid Structure
```
+----------------+------------------+
|     Header     |  Theme/Profile  |
+----------------+------------------+
|   Breadcrumb (collapsible)       |
+----------------+------------------+
|                |                 |
|    Sidebar     |   Main Content  |
|                |                 |
|                |                 |
+----------------+------------------+
```

### Sidebar States
1. Expanded (240px)
   - Shows icons + labels
   - Full menu text visible
2. Collapsed (64px)
   - Only icons visible
   - Tooltips on hover
3. Hidden (0px)
   - Full screen content
   - Toggle button visible

### Transitions
- Sidebar expand/collapse: 200ms ease-in-out
- Breadcrumb collapse: 300ms fade-out
- Menu hover: 150ms fade
- No complex animations initially

## Development Tools
### Role Switcher
- Position: Fixed bottom right
- Type: Combobox dropdown
- Persists selection in localStorage
- Roles:
  * Admin
  * Developer
  * Tester
  * Viewer
- Visible only in development mode

## Navigation Logic
- Default route: /dashboard after login
- Landing page for non-authenticated
- Direct menu page access allowed if authenticated
- No complex route protection initially

## Component States
### Loading States
- Page transitions: Simple loading spinner
- Data fetching: Skeleton loaders
- Button actions: Disabled state + spinner

### Error States
- Form validation: Inline errors
- Page errors: Full page error component
- API errors: Toast notifications

## Initial Theme Setup
```css
/* Base theme tokens */
:root {
  /* Colors */
  --background: #ffffff;
  --foreground: #000000;
  --primary: #3b82f6;
  --muted: #f3f4f6;
  
  /* Spacing */
  --header-height: 48px;
  --breadcrumb-height: 32px;
  --sidebar-expanded: 240px;
  --sidebar-collapsed: 64px;
  
  /* Transitions */
  --transition-quick: 150ms ease;
  --transition-normal: 200ms ease-in-out;
  --transition-slow: 300ms ease;
}

/* Dark mode overrides */
[data-theme="dark"] {
  --background: #1a1b1e;
  --foreground: #ffffff;
  /* etc */
}
```

## Nextjs Structure
app/
  (auth)/
    login/
    signup/
    verify/
  (marketing)/
    page.tsx (landing)
    pricing/
    features/
  [tenant]/
    layout.tsx (workspace layout with sidebar)
    dashboard/
    scripts/
    deployments/
    devices/
    reports/
    team/
    settings/

## Development Priority
1. Layout structure (Header, Sidebar, Content grid)
2. Sidebar functionality (3 states)
3. Header components
4. Role switcher
5. Basic dashboard page
6. Theme implementation

## Next Steps
1. Set up base Next.js project
2. Install and configure Tailwind + shadcn
3. Create layout components
4. Implement sidebar states
5. Add development role switcher