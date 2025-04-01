/**
 * DEPRECATED: This module is deprecated and will be removed in the future.
 * Please migrate to the new pattern:
 *
 * OLD: import { useTeam, useUser } from '@/context';
 * NEW: import { useTeam, useUser } from '@/hooks';
 */

import type { ResourceType, Operation } from '@/types/context/permissionsContextType';
import type { UserContextType } from '@/types/context/userContextType';

// Export providers for app usage
export { UserProvider, SidebarProvider, TeamProvider, PermissionProvider } from '@/app/providers';

// DEPRECATED: Import hooks from @/hooks instead
export { useTeam, useTeamData, useUnassignedResources, useResourceLimit } from '@/hooks/team';
export { usePermission } from '@/hooks/permission';
export { useHost } from '@/hooks/host';
export { useCICD } from '@/hooks/cicd';
export { useDeployment, useDeploymentWizard } from '@/hooks/deployment';
export { useRepository } from '@/hooks/repository';
export { useSidebar } from '@/hooks/sidebar';
export { useUser } from '@/hooks/user';
export { useTheme } from '@/hooks/theme';

// DEPRECATED: Import these from @/hooks in the future
export { FontProvider, useFont } from './FontContext';
export { SearchProvider, useSearch } from './SearchContext';
export { ThemeProvider } from '@/app/providers';

// Export types (still valid, these won't change)
export type { ResourceType, Operation };
export type { UserContextType } from '@/types/context/userContextType';
export type { SidebarContext } from '@/types/context/sidebarContextType';
export type {
  TeamMember,
  TeamCreateInput,
  TeamUpdateInput,
  ResourcePermissions,
  TeamMemberResource,
} from '@/types/context/teamContextType';
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
 * MIGRATION GUIDE
 *
 * 1. Replace imports:
 *    - import { useX } from '@/context';  →  import { useX } from '@/hooks';
 *
 * 2. These hooks have been fully migrated to @/hooks:
 *    - useTeam
 *    - useTeamData
 *    - useUnassignedResources
 *    - useResourceLimit
 *    - usePermission
 *    - useHost
 *    - useCICD
 *    - useDeployment
 *    - useDeploymentWizard
 *    - useRepository
 *    - useSidebar
 *    - useUser
 *    - useTheme
 *
 * 3. These hooks still need proper migration:
 *    - useFont (still in FontContext.tsx)
 *    - useSearch (still in SearchContext.tsx)
 */
