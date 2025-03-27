'use client';

import { useCallback } from 'react';
import { getHostsByTeam, createHostWithTeam, updateHostTeam } from '@/app/actions/hosts-team';
import { useUser } from '@/context';
import { useToast } from '@/components/shadcn/use-toast';
import { useResourceLimit } from '@/hooks/useResourceLimit';
import type { Host } from '@/app/[locale]/[tenant]/hosts/types';

/**
 * Hook for host operations with team integration
 * @returns Object with host-team operations
 */
export function useHostTeamIntegration() {
  const { selectedTeam } = useUser();
  const { toast } = useToast();
  const { checkAndNotify } = useResourceLimit();

  /**
   * Fetch hosts for the currently selected team
   * @returns Array of hosts or null if error
   */
  const fetchTeamHosts = useCallback(async () => {
    if (!selectedTeam) {
      toast({
        title: 'No team selected',
        description: 'Please select a team to view hosts',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const result = await getHostsByTeam(selectedTeam.id);

      if (result.success && result.data) {
        return result.data;
      } else {
        toast({
          title: 'Failed to fetch hosts',
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
   * Create a new host associated with the selected team
   * @param hostData Host data to create
   * @returns Created host or null if error
   */
  const createTeamHost = useCallback(
    async (hostData: Omit<Host, 'id' | 'created_at' | 'updated_at'>) => {
      if (!selectedTeam) {
        toast({
          title: 'No team selected',
          description: 'Please select a team to create a host',
          variant: 'destructive',
        });
        return null;
      }

      // Check resource limit before creating
      const canCreate = await checkAndNotify('hosts');
      if (!canCreate) {
        return null;
      }

      try {
        const result = await createHostWithTeam(hostData, selectedTeam.id);

        if (result.success && result.data) {
          toast({
            title: 'Host created',
            description: `Host ${hostData.name} has been created successfully`,
          });
          return result.data;
        } else {
          toast({
            title: 'Failed to create host',
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
   * Update a host's team association
   * @param hostId Host ID to update
   * @param teamId Team ID to associate the host with
   * @returns Updated host or null if error
   */
  const moveHostToTeam = useCallback(
    async (hostId: string, teamId: string) => {
      try {
        const result = await updateHostTeam(hostId, teamId);

        if (result.success && result.data) {
          toast({
            title: 'Host moved',
            description: `Host has been moved to the selected team`,
          });
          return result.data;
        } else {
          toast({
            title: 'Failed to move host',
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
    fetchTeamHosts,
    createTeamHost,
    moveHostToTeam,
  };
}
