import type { ResourceType, Operation } from '@/types/context/permissionsContextType';
import type { UserContextType } from '@/types/context/userContextType';

// Export providers for app usage
export { UserProvider, SidebarProvider, TeamProvider } from '@/app/providers';

// Export basic data context hooks that access provider data only
export { useUser, useSidebar, useTheme } from '@/app/providers';

// Import and re-export useTeam from hooks
export { useTeam, useTeamData, useUnassignedResources, useResourceLimit } from '@/hooks/team';

// Export hooks from hooks directory for more specialized usage
export { usePermission } from '@/hooks/permission';
export { useHost } from '@/hooks/host';
export { useCICD } from '@/hooks/cicd';
export { useDeployment, useDeploymentWizard } from '@/hooks/deployment';
export { useRepository } from '@/hooks/repository';

// Export hooks that are still in the original location
export { FontProvider, useFont } from './FontContext';
export { SearchProvider, useSearch } from './SearchContext';

// Import types from their correct location
export type { ResourceType, Operation };

// Export common types used across the application
export type { UserContextType } from '@/types/context/userContextType';
export type { SidebarContext } from '@/types/context/sidebarContextType';
export type {
  TeamMember,
  TeamCreateInput,
  TeamUpdateInput,
  ResourcePermissions,
  TeamMemberResource,
} from '@/types/context/teamContextType';

// Export context state types for component usage
export type {
  User,
  Role,
  UserTeam,
  TeamMember as UserTeamMember,
  ResourceLimit,
  AuthUser,
} from '@/types/component/userComponentType';

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

/**
 * MIGRATION NOTICE
 *
 * The following hooks have been moved from TeamContext to @/hooks/team:
 * - useTeam → import from '@/hooks/team' or '@/context'
 * - useTeamData → import from '@/hooks/team' or '@/context'
 * - useUnassignedResources → import from '@/hooks/team' or '@/context'
 * - useResourceLimit → import from '@/hooks/team' or '@/context'
 *
 * The following hooks need to be migrated:
 * - useTeamCreation → not implemented yet, use team actions directly
 * - useTeamUpdate → not implemented yet, use team actions directly
 * - useTeamDeletion → not implemented yet, use team actions directly
 * - useTeamDetails → not implemented yet, use useTeam().activeTeam instead
 * - useTeamSwitcher → not implemented yet, use useTeam().switchTeam instead
 */
