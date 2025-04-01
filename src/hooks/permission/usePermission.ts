'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkPermission, getUserPermissions } from '@/app/actions/permission';
import { useUser } from '@/context';
import { useTeam } from '@/context';
import type { ResourceType, Operation, PermissionMatrix } from '@/types/context/permissions';

/**
 * Hook for checking user permissions
 */
export function usePermission() {
  const { user } = useUser();
  const { activeTeam } = useTeam();
  const userId = user?.id;
  const teamId = activeTeam?.id;

  // Fetch permissions with React Query
  const {
    data: permissionsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['permissions', userId, teamId],
    queryFn: () => getUserPermissions(userId!, teamId!),
    enabled: !!userId && !!teamId,
  });

  // Function to check if user has a specific permission
  const hasPermission = (resourceType: ResourceType, operation: Operation, creatorId?: string): boolean => {
    if (!permissionsResponse?.success || !permissionsResponse.data) {
      return false;
    }

    // Find the relevant permission matrix for this resource type
    const permissionMatrix = permissionsResponse.data.find(p => p.resource_type === resourceType);
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
  };

  return {
    permissions: permissionsResponse?.data || [],
    isLoading,
    error,
    hasPermission,
    checkPermissionAsync: async (resourceType: ResourceType, operation: Operation, creatorId?: string): Promise<boolean> => {
      if (!userId || !teamId) return false;
      try {
        return await checkPermission(userId, teamId, resourceType, operation, creatorId);
      } catch (error) {
        console.error('Error checking permission:', error);
        return false;
      }
    }
  };
}
