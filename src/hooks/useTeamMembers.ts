'use client';

import { useQuery } from '@tanstack/react-query';

import { getTeamMembers } from '@/app/actions/teamMemberAction';
import type { TeamMember } from '@/types/context/teamContextType';

// Define the return type for better type safety
interface TeamMembersResponse {
  success: boolean;
  error: string | null;
  data: TeamMember[];
}

/**
 * Hook for accessing team members
 * @param teamId The team ID to fetch members for
 */
export function useTeamMembers(teamId: string | null) {
  return useQuery<TeamMembersResponse, Error>({
    queryKey: ['teamMembers', teamId],
    queryFn: async () => {
      try {
        // If teamId is null, return a standardized empty response
        if (!teamId) {
          console.log('[@hook:useTeamMembers] No team ID provided, returning empty result');
          return { success: false, error: 'No team ID provided', data: [] };
        }

        console.log('[@hook:useTeamMembers] Fetching team members for teamId:', teamId);

        // Call the server action with proper error handling
        const result = await getTeamMembers(teamId).catch((error) => {
          console.error('[@hook:useTeamMembers] Server action threw error:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Server action failed',
            data: [],
          };
        });

        // Handle case where server action returns undefined (likely due to server action hash mismatch)
        if (result === undefined) {
          console.error(
            '[@hook:useTeamMembers] Server action returned undefined for teamId:',
            teamId,
          );
          return {
            success: false,
            error: 'Server action returned undefined (possible server deployment mismatch)',
            data: [],
          };
        }

        console.log(`[@hook:useTeamMembers] Retrieved ${result.data?.length || 0} team members`);

        // Return the result with validation to ensure expected structure
        return {
          success: result.success === true,
          error: result.error || null,
          data: result.data || [],
        };
      } catch (error) {
        // Handle any unexpected errors in the queryFn itself
        console.error('[@hook:useTeamMembers] Error in queryFn:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error fetching team members',
          data: [],
        };
      }
    },
    // Only run the query if teamId exists
    enabled: !!teamId,
    // Don't refetch on window focus since this data rarely changes
    refetchOnWindowFocus: false,
    // Long stale time since team members don't change often - 1 hour
    staleTime: 60 * 60 * 1000,
    // Retry only once to avoid excessive requests
    retry: 1,
  });
}

/**
 * Type-safe accessor for team member data
 * @param result The result from useTeamMembers
 */
export function getTeamMembersData(result: TeamMembersResponse | undefined): TeamMember[] {
  if (!result || !result.success || !result.data) {
    return [];
  }
  return result.data;
}
