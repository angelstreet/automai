import type {  UserContextType  } from '@/types/context/userContextType';

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

// Export hooks from hooks directory for more specialized usage
export { usePermission } from '@/hooks/permission';
export { useHost } from '@/hooks/host';
export { useCICD } from '@/hooks/cicd';
export { useDeployment, useDeploymentWizard } from '@/hooks/deployment';
export { useRepository } from '@/hooks/repository';

// Export team hooks from TeamContext
// IMPORTANT: These should be moved to hooks/team/ in the future to follow the same pattern
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
import type {  ResourceType, Operation  } from '@/types/context/permissionsContextType';
export type { ResourceType, Operation };

// Export common types used across the application
export type { UserContextType } from '@/types/context/user';
export type { SidebarContext } from '@/types/sidebar';
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
