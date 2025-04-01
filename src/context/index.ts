import type { UserContextType } from '@/types/context/user';

// Export providers for app usage
export { 
  UserProvider,
  SidebarProvider,
  TeamProvider
} from '@/app/providers';

// Theme is now handled through app/providers

// Export basic data context hooks that access provider data only
export { 
  useUser, 
  useSidebar,
  useTeam,
  useTheme
} from '@/app/providers';

// Export business logic hooks from hooks directory
export { usePermission } from '@/hooks/permission';
export { useUserLogic, useUserData } from '@/hooks/user';
export { useSidebarLogic } from '@/hooks/sidebar';
// Theme logic is now handled by next-themes

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

// Import types from their correct location
import type { ResourceType, Operation } from '@/types/context/permissions';
export type { ResourceType, Operation };

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
