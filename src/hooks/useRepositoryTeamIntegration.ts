'use client';

import { useCallback } from 'react';
import {
  getRepositoriesByTeam,
  createRepositoryWithTeam,
  updateRepositoryTeam,
} from '@/app/actions/repositories-team';
import { useTeam } from '@/context';
import { useToast } from '@/components/shadcn/use-toast';
import { useResourceLimit } from '@/hooks/useResourceLimit';
import type { Repository } from '@/types/context/repository';

/**
 * Hook for repository operations with team integration
 * @returns Object with repository-team operations
 */
export function useRepositoryTeamIntegration() {
  const { selectedTeam } = useTeam();
  const { toast } = useToast();
  const { checkAndNotify } = useResourceLimit();

  /**
   * Fetch repositories for the currently selected team
   * @returns Array of repositories or null if error
   */
  const fetchTeamRepositories = useCallback(async () => {
    if (!selectedTeam) {
      toast({
        title: 'No team selected',
        description: 'Please select a team to view repositories',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const result = await getRepositoriesByTeam(selectedTeam.id);

      if (result.success && result.data) {
        return result.data;
      } else {
        toast({
          title: 'Failed to fetch repositories',
          description: result.error || 'An unexpected error occurred',
          variant: 'destructive',
        });
        return null;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
      return null;
    }
  }, [selectedTeam, toast]);

  /**
   * Create a new repository associated with the selected team
   * @param repoData Repository data to create
   * @returns Created repository or null if error
   */
  const createTeamRepository = useCallback(
    async (repoData: Omit<Repository, 'id' | 'created_at' | 'updated_at'>) => {
      if (!selectedTeam) {
        toast({
          title: 'No team selected',
          description: 'Please select a team to create a repository',
          variant: 'destructive',
        });
        return null;
      }

      // Check resource limit before creating
      const canCreate = await checkAndNotify('repositories');
      if (!canCreate) {
        return null;
      }

      try {
        const result = await createRepositoryWithTeam(repoData, selectedTeam.id);

        if (result.success && result.data) {
          toast({
            title: 'Repository created',
            description: `Repository ${repoData.name} has been created successfully`,
          });
          return result.data;
        } else {
          toast({
            title: 'Failed to create repository',
            description: result.error || 'An unexpected error occurred',
            variant: 'destructive',
          });
          return null;
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
        return null;
      }
    },
    [selectedTeam, toast, checkAndNotify],
  );

  /**
   * Update a repository's team association
   * @param repoId Repository ID to update
   * @param teamId Team ID to associate the repository with
   * @returns Updated repository or null if error
   */
  const moveRepositoryToTeam = useCallback(
    async (repoId: string, teamId: string) => {
      try {
        const result = await updateRepositoryTeam(repoId, teamId);

        if (result.success && result.data) {
          toast({
            title: 'Repository moved',
            description: `Repository has been moved to the selected team`,
          });
          return result.data;
        } else {
          toast({
            title: 'Failed to move repository',
            description: result.error || 'An unexpected error occurred',
            variant: 'destructive',
          });
          return null;
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
        return null;
      }
    },
    [toast],
  );

  return {
    fetchTeamRepositories,
    createTeamRepository,
    moveRepositoryToTeam,
  };
}
