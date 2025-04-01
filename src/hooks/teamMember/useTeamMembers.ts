'use client';

import { useQuery } from '@tanstack/react-query';
import { getTeamMembers } from '@/app/actions/teamMemberAction';
import type {  TeamMember  } from '@/types/context/teamContextType';
import type {  ActionResult  } from '@/types/context/cicdContextType';

/**
 * Hook for accessing team members
 * @param teamId The team ID to fetch members for
 */
export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: ['teamMembers', teamId],
    queryFn: async () => {
      if (!teamId) return { success: false, error: 'No team ID provided' };
      return await getTeamMembers(teamId);
    },
    // Don't run the query if teamId is null
    enabled: !!teamId,
    // Don't refetch on window focus
    refetchOnWindowFocus: false,
    // Keep data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Type-safe accessor for team member data
 * @param result The result from useTeamMembers
 */
export function getTeamMembersData(result: ActionResult<TeamMember[]> | undefined): TeamMember[] {
  if (!result || !result.success || !result.data) {
    return [];
  }
  return result.data;
}
