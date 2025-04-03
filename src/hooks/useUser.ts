'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { getUser, updateProfile, invalidateUserCache } from '@/app/actions/userAction';
import type { User, Role } from '@/types/service/userServiceType';

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

  // Role update mutation (uses updateProfile with role data)
  const { mutate: updateRole, isPending: isRoleUpdating } = useMutation({
    mutationFn: (role: Role) => {
      console.log(`[@hook:useUser:updateRole] #${instanceId.current} Updating user role`, role);
      return updateProfile({ role });
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

  // Main user data query
  const {
    data: user,
    isLoading,
    error,
    refetch: refreshUser,
  } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      console.log(`[@hook:useUser:useUser] #${instanceId.current} Fetching user data from server`);
      const result = await getUser();
      console.log(
        `[@hook:useUser:useUser] #${instanceId.current} Received user data:`,
        result ? 'User found' : 'No user',
        user,
      );
      return result;
    },
    initialData: initialUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Store user data in localStorage for persistence across page refreshes
  useEffect(() => {
    if (user) {
      try {
        console.log(
          `[@hook:useUser:useUser] #${instanceId.current} Caching user data to localStorage`,
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
