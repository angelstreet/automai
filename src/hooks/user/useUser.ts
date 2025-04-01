'use client';

import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/app/actions/user';
import { User } from '@/types/auth/user';

export function useUserData() {
  // Use React Query to fetch and cache the current user
  const {
    data: userResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  return {
    user: userResponse?.data as User | null,
    isLoading,
    error,
  };
}