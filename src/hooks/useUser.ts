'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { updateTeamMemberRole, getTeamMemberRole } from '@/app/actions/teamMemberAction';
import { getUser, updateProfile, invalidateUserCache } from '@/app/actions/userAction';
import type { User } from '@/types/service/userServiceType';

// Generate a unique ID for each hook instance
let hookInstanceCounter = 0;

/**
 * Main hook for accessing and managing user data
 * Uses React Query for client-side caching
 *
 * @param initialUser Optional initial user data
 * @param componentName Optional component name for debugging
 */
export function useUser(initialUser: User | null = null, componentName = 'unknown') {
  const queryClient = useQueryClient();
  const isMounted = useRef(false);
  const instanceId = useRef(++hookInstanceCounter);

  // Log on first render
  useEffect(() => {
    // Store instanceId.current in a variable that won't change between effect and cleanup
    const currentInstanceId = instanceId.current;

    if (!isMounted.current) {
      console.log(
        `[@hook:useUser:useUser] Hook mounted #${currentInstanceId} in component: ${componentName}`,
      );
      isMounted.current = true;
    }

    return () => {
      console.log(
        `[@hook:useUser:useUser] Hook unmounted #${currentInstanceId} from component: ${componentName}`,
      );
    };
  }, [componentName]);

  // Log every access to the hook
  // This shows which components are using the useUser hook
  if (process.env.NODE_ENV === 'development') {
    console.log(`[@hook:useUser:useUser] Hook accessed in component: ${componentName}`);
  }

  // User profile update mutation
  const { mutate: updateUser, isPending: isUpdating } = useMutation({
    mutationFn: (userData: Record<string, any>) => {
      console.log(
        `[@hook:useUser:updateUser] #${instanceId.current} Updating user profile`,
        userData,
      );
      return updateProfile(userData);
    },
    onSuccess: () => {
      console.log(
        `[@hook:useUser:updateUser] #${instanceId.current} Successfully updated user profile`,
      );
      // Invalidate user query to refetch data
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // Role update mutation (uses team member update directly)
  const { mutate: updateRole, isPending: isRoleUpdating } = useMutation({
    mutationFn: async (role: string) => {
      console.log(
        `[@hook:useUser:updateRole] #${instanceId.current} Updating user role to "${role}"`,
      );

      // We need to get the user first
      const userData = await getUser();
      if (!userData) {
        console.error(`[@hook:useUser:updateRole] #${instanceId.current} User not found`);
        throw new Error('User not found');
      }

      // Get active team directly from user data - need to typecast since our type doesn't include active_team
      const userWithActiveTeam = userData as User & { active_team?: string };

      console.log(`[@hook:useUser:updateRole] #${instanceId.current} User data:`, {
        id: userData.id,
        // Log the current role if it exists
        currentRole: userData.role || 'undefined',
        active_team: userWithActiveTeam.active_team,
      });

      // Get active team directly from user data - need to typecast since our type doesn't include active_team
      const activeTeamId = userWithActiveTeam.active_team;
      if (!activeTeamId) {
        console.error(`[@hook:useUser:updateRole] #${instanceId.current} No active team found`);
        throw new Error('No active team found');
      }

      console.log(
        `[@hook:useUser:updateRole] #${instanceId.current} Updating role in team ${activeTeamId} for user ${userData.id} to "${role}"`,
      );

      // Update the role in team_members
      const result = await updateTeamMemberRole(activeTeamId, userData.id, role);

      console.log(`[@hook:useUser:updateRole] #${instanceId.current} Role update result:`, {
        success: result.success,
        error: result.error || 'none',
        updatedRole: result.data?.role || 'unknown',
      });

      return result;
    },
    onSuccess: () => {
      console.log(
        `[@hook:useUser:updateRole] #${instanceId.current} Successfully updated user role`,
      );
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // Cache clearing mutation
  const { mutate: clearCache, isPending: isClearing } = useMutation({
    mutationFn: () => {
      console.log(`[@hook:useUser:clearCache] #${instanceId.current} Clearing user cache`);
      return invalidateUserCache();
    },
    onSuccess: () => {
      console.log(
        `[@hook:useUser:clearCache] #${instanceId.current} Successfully cleared user cache`,
      );
      queryClient.invalidateQueries({ queryKey: ['user'] });
      localStorage.removeItem('cached_user');
      localStorage.removeItem('user_cache_timestamp');
    },
  });

  // Main user data query - now gets role from team_members using our server action
  const {
    data: user,
    isLoading,
    error,
    refetch: refreshUser,
  } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        console.log(
          `[@hook:useUser:useUser] #${instanceId.current} Fetching user data from server`,
        );

        // Call the server action with proper error handling
        const result = await getUser().catch((error) => {
          console.error(
            `[@hook:useUser:useUser] #${instanceId.current} Server action threw error:`,
            error,
          );
          return null;
        });

        // Handle case where server action returns undefined
        if (!result) {
          console.error(
            `[@hook:useUser:useUser] #${instanceId.current} Server action returned no user data`,
          );
          return null;
        }

        // The result from getUser() might have active_team but our User type doesn't reflect this
        // Use type assertion to work with the actual data structure
        const userWithActiveTeam = result as User & { active_team?: string };

        console.log(`[@hook:useUser:useUser] #${instanceId.current} User data received:`, {
          id: userWithActiveTeam.id,
          active_team: userWithActiveTeam.active_team,
          email: userWithActiveTeam.email,
          hasRoleProperty: 'role' in userWithActiveTeam,
          roleValue: userWithActiveTeam.role,
          userKeys: Object.keys(userWithActiveTeam),
        });

        // Get the user's role from team_members using our server action
        if (userWithActiveTeam.id && userWithActiveTeam.active_team) {
          console.log(
            `[@hook:useUser:useUser] #${instanceId.current} Getting role for user ${userWithActiveTeam.id} with active team ${userWithActiveTeam.active_team}`,
          );

          // Use the server action instead of direct Supabase query
          const startTime = Date.now();
          const role = await getTeamMemberRole(
            userWithActiveTeam.id,
            userWithActiveTeam.active_team,
          );
          const duration = Date.now() - startTime;

          // Log the role returned from the server action with more detail
          console.log(
            `[@hook:useUser:useUser] #${instanceId.current} Role from getTeamMemberRole: "${role}" (${typeof role}) - full value:`,
            role,
          );

          // Add the role to the user object
          if (role) {
            console.log(
              `[@hook:useUser:useUser] #${instanceId.current} Setting user role to: "${role}" (took ${duration}ms)`,
            );
            // Cast the role to the User type's role property
            userWithActiveTeam.role = role as any;

            // Verify the role was properly set
            console.log(`[@hook:useUser:useUser] #${instanceId.current} After setting role:`, {
              hasRoleProperty: 'role' in userWithActiveTeam,
              roleValue: userWithActiveTeam.role,
              roleType: typeof userWithActiveTeam.role,
            });
          } else {
            console.log(
              `[@hook:useUser:useUser] #${instanceId.current} No role found for user ${userWithActiveTeam.id} in team ${userWithActiveTeam.active_team} (took ${duration}ms)`,
            );
          }
        } else {
          console.log(
            `[@hook:useUser:useUser] #${instanceId.current} Missing user ID or active team, cannot fetch role. User ID: ${userWithActiveTeam.id}, Active team: ${userWithActiveTeam.active_team}`,
          );
        }

        console.log(`[@hook:useUser:useUser] #${instanceId.current} Final user object with role:`, {
          id: userWithActiveTeam.id,
          role: userWithActiveTeam.role || 'undefined',
          hasRoleProperty: 'role' in userWithActiveTeam,
          roleType: typeof userWithActiveTeam.role,
          active_team: userWithActiveTeam.active_team,
          allProperties: Object.keys(userWithActiveTeam),
        });

        return userWithActiveTeam;
      } catch (error) {
        // Handle any unexpected errors in the queryFn itself
        console.error(`[@hook:useUser:useUser] #${instanceId.current} Error in queryFn:`, error);
        return null;
      }
    },
    initialData: initialUser,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: (() => {
      // Check if there is cached user data in localStorage and if it's still valid
      const cachedUser = localStorage.getItem('cached_user');
      const cacheTimestamp = localStorage.getItem('user_cache_timestamp');
      if (cachedUser && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp, 10);
        // Consider cache valid if less than 30 minutes old
        if (cacheAge < 30 * 60 * 1000) {
          console.log(
            `[@hook:useUser:useUser] #${instanceId.current} Using cached user data from localStorage (age: ${cacheAge / 1000}s)`,
          );
          return false; // Disable fetching if cache is valid
        } else {
          console.log(
            `[@hook:useUser:useUser] #${instanceId.current} Cached user data expired (age: ${cacheAge / 1000}s), fetching new data`,
          );
          return true; // Enable fetching if cache is outdated
        }
      }
      console.log(
        `[@hook:useUser:useUser] #${instanceId.current} No valid cached user data found, fetching new data`,
      );
      return true; // Enable fetching if no cache exists
    })(),
  });

  // Store user data in localStorage for persistence across page refreshes
  useEffect(() => {
    if (user) {
      try {
        console.log(
          `[@hook:useUser:useUser] #${instanceId.current} Caching user data to localStorage`,
        );
        console.log(
          `[@hook:useUser:useUser] #${instanceId.current} User role being cached:`,
          user.role || 'undefined',
        );
        localStorage.setItem('cached_user', JSON.stringify(user));
        localStorage.setItem('user_cache_timestamp', Date.now().toString());
      } catch (error) {
        console.error(
          `[@hook:useUser:useUser] #${instanceId.current} Error caching user data:`,
          error,
        );
      }
    }
  }, [user]);

  // After main React Query, ensure role is present even if initial user data lacked it
  useEffect(() => {
    let cancelled = false;

    async function fetchMissingRole() {
      if (user && !user.role && (user as any).active_team) {
        const activeTeamId = (user as any).active_team as string;
        console.log(
          `[@hook:useUser:useUser] #${instanceId.current} Detected missing role for user ${user.id} with active team ${activeTeamId}. Fetching...`,
        );
        try {
          const start = Date.now();
          const fetchedRole = await getTeamMemberRole(user.id, activeTeamId);
          const duration = Date.now() - start;
          console.log(
            `[@hook:useUser:useUser] #${instanceId.current} Fetched missing role: "${fetchedRole}" in ${duration}ms`,
          );
          if (!cancelled && fetchedRole) {
            // Update cache so all subscribers get updated role
            queryClient.setQueryData(['user'], (old: any) => {
              if (!old) return old;
              return { ...old, role: fetchedRole };
            });
          }
        } catch (err) {
          console.error(
            `[@hook:useUser:useUser] #${instanceId.current} Error fetching missing role:`,
            err,
          );
        }
      }
    }

    fetchMissingRole();

    return () => {
      cancelled = true;
    };
  }, [user, queryClient]);

  return {
    // User data
    user,
    isLoading,
    error,

    // User operations
    updateProfile: updateUser,
    refreshUser,
    updateRole,
    clearCache,

    // Operation states
    isUpdating,
    isRoleUpdating,
    isClearing,
  };
}
