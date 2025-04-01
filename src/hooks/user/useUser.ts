'use client';

import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/app/actions/user';
import { User } from '@/types/auth/user';

export function useUserData() {
  // Use React Query to fetch and cache the current user
  const {
    data: userResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getUser,
  });

  return {
    user: userResponse as User | null,
    isLoading,
    error,
  };
}