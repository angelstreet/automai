'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/app/actions/userAction';
import { User } from '@/types/auth/user';

export function useUser(initialUser: User | null = null) {
  // State for managing user data
  const [user, setUser] = useState<User | null>(initialUser || null);
  
  // Use React Query to fetch and cache the current user
  const {
    data: userResponse,
    isLoading: fetchLoading,
    error,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getUser,
    onSuccess: (data) => {
      if (data) setUser(data);
    }
  });

  // Store user data in localStorage for persistence across page refreshes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('cached_user', JSON.stringify(user));
        localStorage.setItem('user_cache_timestamp', Date.now().toString());
      } catch (error) {
        console.error('[@hooks:useUser] Error caching user data:', error);
      }
    }
  }, [user]);

  return {
    user: user || userResponse as User | null,
    isLoading: fetchLoading,
    error,
  };
}
