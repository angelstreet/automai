'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeamDetails, setSelectedTeam } from '@/app/actions/teamAction';
import type { Team } from '@/types/context/teamContextType';

export function useTeamQuery(userId: string) {
  const queryClient = useQueryClient();

  // Query for fetching team details
  const {
    data: teamDetails,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['team', userId],
    queryFn: () => getTeamDetails(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation for setting selected team
  const setSelectedTeamMutation = useMutation({
    mutationFn: setSelectedTeam,
    onSuccess: () => {
      // Invalidate team queries to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

  return {
    teamDetails,
    isLoading,
    error,
    setSelectedTeam: setSelectedTeamMutation.mutate,
    isSettingTeam: setSelectedTeamMutation.isPending,
  };
}
