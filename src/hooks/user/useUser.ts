'use client';

import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/app/actions/userAction';
import type { User } from '@/types/service/userServiceType';

export function useUser(initialUser: User | null = null) {
  return useQuery({
    queryKey: ['user'],
    queryFn: getUser,
    initialData: initialUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
