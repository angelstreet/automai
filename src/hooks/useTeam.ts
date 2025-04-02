'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useContext, useRef, useEffect } from 'react';

import { getUserTeams, getUserActiveTeam, setUserActiveTeam } from '@/app/actions/teamAction';
import { TeamContext } from '@/context/TeamContext';
import { useUser } from '@/hooks/useUser';

// Generate a unique ID for each hook instance
let hookInstanceCounter = 0;

/**
 * Hook to access team data from context
 * Pure data accessor with no business logic
 *
 * @param componentName Optional component name for debugging
 */
export function useTeam(componentName = 'unknown') {
  const context = useContext(TeamContext);
  const instanceId = useRef(++hookInstanceCounter);
  const isMounted = useRef(false);

  // Log mount/unmount for debugging
  useEffect(() => {
    const currentInstanceId = instanceId.current;

    if (!isMounted.current) {
      console.log(
        `[@hook:useTeam:useTeam] Hook mounted #${currentInstanceId} in component: ${componentName}`,
      );
      isMounted.current = true;
    }

    return () => {
      console.log(
        `[@hook:useTeam:useTeam] Hook unmounted #${currentInstanceId} from component: ${componentName}`,
      );
    };
  }, [componentName]);

  if (!context) throw new Error('useTeam must be used within a TeamProvider');
  return context;
}

/**
 * Hook to fetch team data with React Query
 * Uses server-side cached actions and adds client-side caching
 *
 * @param componentName Optional component name for debugging
 */
export function useTeamData(componentName = 'unknown') {
  const { user } = useUser(null, `useTeamData(${componentName})`);
  const userId = user?.id;
  const instanceId = useRef(++hookInstanceCounter);
  const isMounted = useRef(false);

  // Log mount/unmount for debugging
  useEffect(() => {
    const currentInstanceId = instanceId.current;

    if (!isMounted.current) {
      console.log(
        `[@hook:useTeam:useTeamData] Hook mounted #${currentInstanceId} in component: ${componentName}`,
      );
      isMounted.current = true;
    }

    return () => {
      console.log(
        `[@hook:useTeam:useTeamData] Hook unmounted #${currentInstanceId} from component: ${componentName}`,
      );
    };
  }, [componentName]);

  // Get teams with React Query
  const {
    data: teamsResponse,
    isLoading: teamsLoading,
    error: teamsError,
  } = useQuery({
    queryKey: ['teams', userId],
    queryFn: async () => {
      // Only execute if userId is defined
      if (!userId) {
        console.log(
          `[@hook:useTeam:useTeamData] #${instanceId.current} No userId available, returning empty teams array`,
        );
        return Promise.resolve([]);
      }
      console.log(
        `[@hook:useTeam:useTeamData] #${instanceId.current} Fetching teams for user: ${userId}`,
      );
      const result = await getUserTeams(userId);
      console.log(
        `[@hook:useTeam:useTeamData] #${instanceId.current} Received ${result.length} teams`,
      );
      return result;
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
    queryFn: async () => {
      // Only execute if userId is defined
      if (!userId) {
        console.log(
          `[@hook:useTeam:useTeamData] #${instanceId.current} No userId available, returning null activeTeam`,
        );
        return Promise.resolve(null);
      }
      console.log(
        `[@hook:useTeam:useTeamData] #${instanceId.current} Fetching active team for user: ${userId}`,
      );
      const result = await getUserActiveTeam(userId);
      console.log(
        `[@hook:useTeam:useTeamData] #${instanceId.current} Received active team: ${result?.name || 'None'}`,
      );
      return result;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query client for mutations
  const queryClient = useQueryClient();

  // Switch team mutation
  const { mutate: switchTeam, isPending: isSwitchingTeam } = useMutation({
    mutationFn: async (teamId: string) => {
      if (!userId) {
        console.error(
          `[@hook:useTeam:useTeamData] #${instanceId.current} Cannot switch team: User ID is undefined`,
        );
        return Promise.reject(new Error('User ID is undefined'));
      }
      console.log(
        `[@hook:useTeam:useTeamData] #${instanceId.current} Switching to team: ${teamId}`,
      );
      return setUserActiveTeam(userId, teamId);
    },
    onSuccess: () => {
      console.log(`[@hook:useTeam:useTeamData] #${instanceId.current} Successfully switched team`);
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
