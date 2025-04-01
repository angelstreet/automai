'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types/auth/user';

export function useUserLogic(initialUser: User | null = null) {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(false);

  // Store user data in localStorage for persistence across page refreshes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('cached_user', JSON.stringify(user));
        localStorage.setItem('user_cache_timestamp', Date.now().toString());
      } catch (error) {
        console.error('[@hooks:useUserLogic] Error caching user data:', error);
      }
    }
  }, [user]);

  return {
    user,
    setUser,
    isLoading,
    setIsLoading
  };
}