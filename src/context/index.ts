// Context System (The Migration Is Complete)
// -------------------------------------------------
// This file has been simplified after the migration to React Server Components.
// Most data fetching is now done directly in Server Components with the
// appropriate Server Actions.
//
// The following modules have been migrated to Server Components:
//
// 1. Repository functionality:
//    - Server actions: /src/app/actions/repositories.ts
//    - Server components: /src/app/[locale]/[tenant]/repositories/_components/
//    - Client components: /src/app/[locale]/[tenant]/repositories/_components/client/
//
// 2. Deployment functionality:
//    - Server actions: /src/app/actions/deployments.ts
//    - Server components: /src/app/[locale]/[tenant]/deployment/_components/
//    - Client components: /src/app/[locale]/[tenant]/deployment/_components/client/
//
// 3. CICD functionality:
//    - Server actions: /src/app/actions/cicd.ts
//    - Server components: /src/app/[locale]/[tenant]/cicd/_components/
//    - Client components: /src/app/[locale]/[tenant]/cicd/_components/client/
//
// 4. Host functionality:
//    - Server actions: /src/app/actions/hosts.ts
//    - Server components: /src/app/[locale]/[tenant]/hosts/_components/
//    - Client components: /src/app/[locale]/[tenant]/hosts/_components/client/
// -------------------------------------------------

// Re-export hooks and providers that are still needed
export { useUser } from './UserContext';
export { UserProvider } from './UserContext';
export { useSidebar } from './SidebarContext';
export { SidebarProvider } from './SidebarContext';
export { useTheme } from './ThemeContext';
export { ThemeProvider } from './ThemeContext';

// Export types for context usage
export type { UserContextType } from '@/types/context/user';
export type { SidebarContext as SidebarContextType } from '@/types/sidebar';
export type { ThemeContextType } from './ThemeContext';

// Export context state types for component usage
export type { User, Role, AuthUser } from '@/types/user';

// User selectors for optimized context usage
export const userSelectors = {
  // Get just the user data without subscribing to loading state changes
  userData: (context: UserContextType) => context.user,

  // Get just the user tenant info
  userTenant: (context: UserContextType) => context.user?.tenant_name,

  // Get just the user role
  userRole: (context: UserContextType) => context.user?.role,

  // Get loading state only
  isLoading: (context: UserContextType) => context.loading,
};
