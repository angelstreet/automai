import type { UserContextType } from '@/types/context/user';

// Re-export ALL hooks and providers from the new location
export { 
  useUser, 
  UserProvider,
  useSidebar,
  SidebarProvider,
  useTheme,
  ThemeProviders as ThemeProvider,
  useTeam,
  TeamProvider,
  usePermission
} from '@/app/providers';

// Re-export the specialized team hooks from TeamContext for backward compatibility
export {
  useTeamMember,
  useTeamCreation,
  useTeamUpdate,
  useTeamDeletion,
  useTeamDetails,
  useUnassignedResources,
  useTeamSwitcher
} from './TeamContext';

// Export hooks that are still in the original location
export { FontProvider, useFont } from './FontContext';
export { SearchProvider, useSearch } from './SearchContext';
export { ResourceType, Operation } from '@/app/actions/permission';

// Export types for backward compatibility
export type { UserContextType } from '@/types/context/user';
export type { SidebarContext as SidebarContextType } from '@/types/sidebar';
export type { ThemeContextType } from '@/app/providers/theme';
export type { 
  TeamMember, 
  TeamCreateInput, 
  TeamUpdateInput, 
  ResourcePermissions, 
  TeamMemberResource 
} from '@/types/context/team';

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
