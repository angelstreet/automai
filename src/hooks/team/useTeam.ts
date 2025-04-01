'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';

import { getUserTeams, getUserActiveTeam, setUserActiveTeam } from '@/app/actions/teamAction';
import { TeamContext } from '@/context/TeamContext';
import { useUser } from '@/hooks/user/useUser';

/**
 * Hook to access team data from context
 * Pure data accessor with no business logic
 */
export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within a TeamProvider');
  return context;
}

/**
 * Hook to fetch team data with React Query
 * Uses server-side cached actions and adds client-side caching
 */
export function useTeamData() {
  const { user } = useUser();
  const userId = user?.id;

  // Get teams with React Query
  const {
    data: teamsResponse,
    isLoading: teamsLoading,
    error: teamsError,
  } = useQuery({
    queryKey: ['teams', userId],
    queryFn: () => {
      // Only execute if userId is defined
      if (!userId) {
        return Promise.resolve([]);
      }
      return getUserTeams(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get active team with React Query
  const {
    data: activeTeamResponse,
    isLoading: activeTeamLoading,
    error: activeTeamError,
  } = useQuery({
    queryKey: ['activeTeam', userId],
    queryFn: () => {
      // Only execute if userId is defined
      if (!userId) {
        return Promise.resolve(null);
      }
      return getUserActiveTeam(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query client for mutations
  const queryClient = useQueryClient();

  // Switch team mutation
  const { mutate: switchTeam, isPending: isSwitchingTeam } = useMutation({
    mutationFn: (teamId: string) => {
      if (!userId) {
        return Promise.reject(new Error('User ID is undefined'));
      }
      return setUserActiveTeam(userId, teamId);
    },
    onSuccess: () => {
      // Invalidate relevant queries after team switch
      queryClient.invalidateQueries({ queryKey: ['activeTeam', userId] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });

  return {
    teams: teamsResponse || [],
    activeTeam: activeTeamResponse || null,
    isLoading: teamsLoading || activeTeamLoading,
    error: teamsError || activeTeamError,
    switchTeam,
    isSwitchingTeam,
  };
}
