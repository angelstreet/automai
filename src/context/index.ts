import type { UserContextType } from '@/types/context/user';

// Re-export hooks and providers that are still needed
export { useUser } from './UserContext';
export { UserProvider } from './UserContext';
export { useSidebar } from './SidebarContext';
export { SidebarProvider } from './SidebarContext';
export { useTheme } from './ThemeContext';
export { ThemeProvider } from './ThemeContext';
export { FontProvider, useFont } from './FontContext';
export { SearchProvider, useSearch } from './SearchContext';
export { TeamProvider, useTeam, usePermission } from './TeamContext';
export { PinProvider, usePin } from './PinContext';

export type { UserContextType } from '@/types/context/user';
export type { SidebarContext as SidebarContextType } from '@/types/sidebar';
export type { ThemeContextType } from './ThemeContext';

// Export context state types for component usage
export type { User, Role, AuthUser, UserTeam, TeamMember, ResourceLimit } from '@/types/user';

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

  // Get just the team data
  teams: (context: UserContextType) => context.teams,

  // Get just the selected team
  selectedTeam: (context: UserContextType) => context.selectedTeam,
};
