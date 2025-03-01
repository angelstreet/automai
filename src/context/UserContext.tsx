'use client';

import { useSession } from 'next-auth/react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { isFeatureEnabled, canCreateMore, getPlanFeatures } from '@/lib/features';

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string | null;
  tenantName: string | null;
  plan: string;
};

type UserContextType = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isFeatureEnabled: (feature: string) => boolean;
  canCreateMore: (
    feature: 'maxProjects' | 'maxUseCases' | 'maxCampaigns',
    currentCount: number,
  ) => boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
  checkSession: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
};

// Cache for session data
const SESSION_CACHE_KEY = 'user_session_cache';
const SESSION_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchUser = useCallback(async () => {
    try {
      if (!session?.user) {
        console.log('No active session found in fetchUser');
        setUser(null);
        setError('No active session');
        setIsLoading(false);
        return;
      }

      console.log('Session found, fetching user data');

      // Check if we have a cached user and it's still valid
      const now = Date.now();
      const cachedData =
        typeof window !== 'undefined' ? localStorage.getItem(SESSION_CACHE_KEY) : null;

      if (cachedData) {
        try {
          const { user: cachedUser, timestamp } = JSON.parse(cachedData);
          if (now - timestamp < SESSION_CACHE_EXPIRY) {
            console.log('Using cached user data');
            setUser(cachedUser);
            setError(null);
            setIsLoading(false);
            setLastFetch(timestamp);
            return;
          }
        } catch (e) {
          console.warn('Invalid session cache, fetching fresh data');
        }
      }

      console.log('Fetching fresh user data from API');
      const response = await fetch('/api/auth/profile', {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Profile fetch failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error,
        });
        throw new Error(errorData.error || `Failed to fetch user profile: ${response.status}`);
      }

      const userData = await response.json();
      console.log('User data fetched successfully:', { ...userData, id: '***' });

      // Cache the user data
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          SESSION_CACHE_KEY,
          JSON.stringify({
            user: userData,
            timestamp: now,
          }),
        );
      }

      setUser(userData);
      setError(null);
      setLastFetch(now);
    } catch (err) {
      console.error('Error in fetchUser:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!session?.accessToken) {
      throw new Error('No active session');
    }

    try {
      console.log('Updating user profile...');
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update profile: ${response.status}`);
      }

      // Refresh user data after successful update
      await fetchUser();
      console.log('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  }, [session, fetchUser]);

  // Check session only when needed
  const checkSession = useCallback(() => {
    const now = Date.now();
    if (now - lastFetch > SESSION_CACHE_EXPIRY) {
      fetchUser();
    }
  }, [lastFetch, fetchUser]);

  useEffect(() => {
    if (status === 'loading') {
      setIsLoading(true);
      return;
    }

    if (status === 'authenticated' && session?.user) {
      console.log('Session authenticated, fetching user data');
      fetchUser();
    } else if (status === 'unauthenticated') {
      console.log('Session unauthenticated, clearing user data');
      setUser(null);
      setIsLoading(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_CACHE_KEY);
      }
    }
  }, [status, session, fetchUser]);

  const checkFeature = (feature: string): boolean => {
    if (!user) return false;
    return isFeatureEnabled(user.plan, feature as keyof typeof getPlanFeatures);
  };

  const checkCanCreateMore = (
    feature: 'maxProjects' | 'maxUseCases' | 'maxCampaigns',
    currentCount: number,
  ): boolean => {
    if (!user) return false;
    return canCreateMore(user.plan, feature, currentCount);
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_CACHE_KEY);
    }
    setUser(null);
  };

  const value = {
    user,
    isLoading: isLoading || status === 'loading',
    error,
    isFeatureEnabled: checkFeature,
    canCreateMore: checkCanCreateMore,
    logout,
    refreshUser: fetchUser,
    checkSession,
    updateProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
