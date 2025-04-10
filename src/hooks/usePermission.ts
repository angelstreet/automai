'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useContext, useRef, useEffect } from 'react';

import { checkPermission, getUserPermissions } from '@/app/actions/permissionAction';
import { PermissionContext } from '@/context/PermissionContext';
import { UserContext } from '@/context/UserContext';
import { useTeam } from '@/hooks/useTeam';
import { useUser } from '@/hooks/useUser';
import type { Role } from '@/types/component/userComponentType';
import type {
  ResourceType,
  Operation,
  PermissionsResult,
} from '@/types/context/permissionsContextType';
let hookInstanceCounter = 0;
/**
 * Access the permission context
 * This is a simple hook that just provides access to the context
 */
export function usePermissionContext(componentName = 'unknown') {
  // Log mount/unmount for debugging
  const instanceId = useRef(++hookInstanceCounter);
  const isMounted = useRef(false);

  useEffect(() => {
    const currentInstanceId = instanceId.current;

    if (!isMounted.current) {
      console.log(
        `[@hook:useCICD:useCICD] Hook mounted #${currentInstanceId} in component: ${componentName}`,
      );
      isMounted.current = true;
    }

    return () => {
      console.log(
        `[@hook:useCICD:useCICD] Hook unmounted #${currentInstanceId} from component: ${componentName}`,
      );
    };
  }, [componentName]);

  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissionContext must be used within a PermissionProvider');
  }
  return context;
}

/**
 * Hook for checking user permissions with React Query
 * @param specificTeamId Optional team ID to override the active team from context
 */
export function usePermission(specificTeamId?: string) {
  const { user } = useUser(null, 'usePermission');
  const { activeTeam } = useTeam('usePermission');
  const queryClient = useQueryClient();
  const userId = user?.id;
  const teamId = specificTeamId || activeTeam?.id;

  // Fetch permissions with React Query
  const {
    data: permissionsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['permissions', userId, teamId],
    queryFn: async () => {
      if (!userId || !teamId) {
        return null;
      }
      return getUserPermissions(userId, teamId);
    },
    enabled: !!userId && !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Function to refresh permissions
  const refreshPermissions = useCallback(async () => {
    if (userId && teamId) {
      await queryClient.invalidateQueries({ queryKey: ['permissions', userId, teamId] });
      return refetch();
    }
  }, [userId, teamId, queryClient, refetch]);

  // Function to check if user has a specific permission
  const hasPermission = useCallback(
    (resourceType: ResourceType, operation: Operation, creatorId?: string): boolean => {
      if (!permissionsResponse?.success || !permissionsResponse.data) {
        return false;
      }

      // Find the relevant permission matrix for this resource type
      const permissionMatrix = permissionsResponse.data.find(
        (p) => p.resource_type === resourceType,
      );
      if (!permissionMatrix) {
        return false;
      }

      // Check for ownership permissions if creator ID is provided
      if (creatorId && creatorId === userId) {
        if (operation === 'update' && permissionMatrix.can_update_own) {
          return true;
        }
        if (operation === 'delete' && permissionMatrix.can_delete_own) {
          return true;
        }
      }

      // Check regular permissions
      switch (operation) {
        case 'select':
          return !!permissionMatrix.can_select;
        case 'insert':
          return !!permissionMatrix.can_insert;
        case 'update':
          return !!permissionMatrix.can_update;
        case 'delete':
          return !!permissionMatrix.can_delete;
        case 'execute':
          return !!permissionMatrix.can_execute;
        default:
          return false;
      }
    },
    [permissionsResponse, userId],
  );

  // Function to check permissions via server action
  const checkPermissionAsync = useCallback(
    async (
      resourceType: ResourceType,
      operation: Operation,
      creatorId?: string,
    ): Promise<boolean> => {
      if (!userId || !teamId) return false;
      try {
        return await checkPermission(userId, teamId, resourceType, operation, creatorId);
      } catch (error) {
        console.error(
          '[@hook:usePermission:checkPermissionAsync] Error checking permission:',
          error,
        );
        return false;
      }
    },
    [userId, teamId],
  );

  // Function to check if user has a specific role
  const hasRole = useCallback((requiredRole: Role): boolean => {
    // Get user directly from UserContext for more reliable access
    const { user } = useContext(UserContext);
    return user?.role === requiredRole;
  }, []);

  // Convenience function specifically for checking admin role
  const isAdmin = useCallback((): boolean => {
    return hasRole('admin');
  }, [hasRole]);

  // Convenience function for checking if user can manage team members
  const canManageTeamMembers = useCallback((): boolean => {
    // Only admins can manage team members
    return isAdmin();
  }, [isAdmin]);

  return {
    permissions: permissionsResponse?.data || [],
    permissionsData: permissionsResponse,
    isLoading,
    error,
    hasPermission,
    checkPermissionAsync,
    refreshPermissions,
    // New role-based permission functions
    hasRole,
    isAdmin,
    canManageTeamMembers,
  };
}

/**
 * Hook combining context and query-based permissions
 * Provides one unified API for permissions
 */
export function usePermissionWithContext() {
  const { permissions: contextPermissions } = usePermissionContext();
  const {
    permissions: queryPermissions,
    isLoading,
    error,
    hasPermission,
    checkPermissionAsync,
    refreshPermissions,
    hasRole,
    isAdmin,
    canManageTeamMembers,
  } = usePermission();

  // Use context permissions if available, otherwise use query permissions
  const permissions = contextPermissions || (queryPermissions as unknown as PermissionsResult);

  return {
    permissions,
    isLoading,
    error,
    hasPermission,
    checkPermissionAsync,
    refreshPermissions,
    hasRole,
    isAdmin,
    canManageTeamMembers,
  };
}
