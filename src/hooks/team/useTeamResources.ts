'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getUnassignedResources,
  assignResourceToTeam,
  checkResourceLimit,
} from '@/app/actions/teamAction';
import { useToast } from '@/components/shadcn/use-toast';
import { useUser } from '@/context/UserContext';

/**
 * Hook for accessing unassigned resources
 */
export function useUnassignedResources() {
  return useQuery({
    queryKey: ['unassignedResources'],
    queryFn: async () => {
      return await getUnassignedResources();
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for assigning resources to a team
 */
export function useResourceAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      resourceId,
      resourceType,
      teamId,
    }: {
      resourceId: string;
      resourceType: string;
      teamId: string;
    }) => {
      const result = await assignResourceToTeam(resourceId, resourceType, teamId);
      if (!result.success) {
        throw new Error(result.error || `Failed to assign ${resourceType} to team`);
      }
      return { resourceId, resourceType, teamId };
    },
    onSuccess: ({ resourceType }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['unassignedResources'] });

      // Resource-specific invalidations
      if (resourceType === 'repository') {
        queryClient.invalidateQueries({ queryKey: ['repositories'] });
      } else if (resourceType === 'host') {
        queryClient.invalidateQueries({ queryKey: ['hosts'] });
      }

      toast({
        title: 'Success',
        description: 'Resource assigned to team successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign resource to team',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for checking resource limits
 * @param resourceType The type of resource to check (hosts, repositories, etc.)
 */
export function useResourceLimit(resourceType: string) {
  const { user } = useUser();

  return useQuery({
    queryKey: ['resourceLimit', resourceType],
    queryFn: async () => {
      if (!user) return { success: false, error: 'Not authenticated' };
      return await checkResourceLimit(resourceType);
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
