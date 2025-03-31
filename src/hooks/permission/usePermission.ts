'use client';

import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/context/UserContext';
import { useTeam } from '@/context/TeamContext';

// Define permission types
type ResourceType = 'repository' | 'host' | 'deployment' | 'cicd' | 'team';
type Operation = 'read' | 'create' | 'update' | 'delete' | 'admin' | 'manage';

/**
 * Hook for checking user permissions
 */
export function usePermissions() {
  const { user } = useUser();
  const { activeTeam, checkPermission: checkTeamPermission } = useTeam();

  return {
    /**
     * Check if the user has permission to perform an operation on a resource
     * @param resourceType The type of resource
     * @param operation The operation to check
     * @param creatorId Optional creator ID for ownership-based permissions
     */
    checkPermission: async (
      resourceType: ResourceType,
      operation: Operation,
      creatorId?: string,
    ): Promise<boolean> => {
      if (!user || !activeTeam) return false;

      try {
        return await checkTeamPermission(resourceType, operation, creatorId);
      } catch (error) {
        console.error('Error checking permission:', error);
        return false;
      }
    },
  };
}

/**
 * Hook for accessing all user permissions
 * @param teamId The team ID to get permissions for
 */
export function useUserPermissions(teamId: string | null) {
  const { user } = useUser();
  const { activeTeam, permissions } = useTeam();

  const effectiveTeamId = teamId || activeTeam?.id || null;

  return useQuery({
    queryKey: ['userPermissions', user?.id, effectiveTeamId],
    queryFn: async () => {
      if (!user || !effectiveTeamId) {
        return { success: false, error: 'User or team ID not available' };
      }

      // Since we already have permissions in the TeamContext, we can just return them
      // This is a simplified implementation that assumes the TeamContext has already
      // loaded the permissions
      return {
        success: true,
        data: permissions,
      };
    },
    enabled: !!user && !!effectiveTeamId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
