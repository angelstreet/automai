'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getUser } from '@/app/actions/userAction';
import { useUser as useUserContext } from '@/app/providers';
import type { User } from '@/types/service/userServiceType';

/**
 * Hook for fetching user data with React Query
 */
export function useUserQuery(initialUser: User | null = null) {
  return useQuery({
    queryKey: ['user'],
    queryFn: getUser,
    initialData: initialUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
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
