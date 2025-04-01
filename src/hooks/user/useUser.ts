'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { getUser, updateProfile } from '@/app/actions/userAction';
import { useUser as useUserContext } from '@/app/providers';
import type { User } from '@/types/service/userServiceType';

/**
 * Hook for fetching user data with React Query
 * Handles caching and persistence
 */
export function useUserQuery(initialUser: User | null = null) {
  const queryClient = useQueryClient();

  // User profile update mutation
  const { mutate: updateUser, isPending: isUpdating } = useMutation({
    mutationFn: (userData: Record<string, any>) => updateProfile(userData),
    onSuccess: () => {
      // Invalidate user query to refetch data
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // Main user data query
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user'],
    queryFn: getUser,
    initialData: initialUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Store user data in localStorage for persistence across page refreshes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('cached_user', JSON.stringify(user));
        localStorage.setItem('user_cache_timestamp', Date.now().toString());
      } catch (error) {
        console.error('[@hook:useUser] Error caching user data:', error);
      }
    }
  }, [user]);

  return {
    user,
    isLoading,
    error,
    updateUser,
    isUpdating,
    refetch,
  };
}

/**
 * Memoized hook for accessing user data from context
 * Returns a stable reference to prevent unnecessary re-renders
 */
export function useUser() {
  const userContext = useUserContext();

  return useMemo(() => {
    return {
      user: userContext.user,
    };
  }, [userContext.user]);
}
