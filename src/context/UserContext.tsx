'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

import { isFeatureEnabled, canCreateMore, getPlanFeatures } from '@/lib/features';
import { useAuth } from '@/hooks/useAuth';

type PlanType = keyof typeof getPlanFeatures;

type User = {
  id: string;
  email: string;
  image?: string | null;
  name: string | null;
  role: string;
  tenantId: string | null;
  tenantName: string | null;
  plan: PlanType;
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
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkSession: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
};

// Cache for session data
const SESSION_CACHE_KEY = 'user_session_cache';
const SESSION_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, loading: authLoading, error: authError, signOut, refreshUser: refreshAuthUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Add refs to track fetch state and prevent duplicate requests
  const isFetchingRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchAttempts = useRef(0);

  // Update user state when authUser changes
  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (authUser) {
      // Transform authUser to our User type
      const userData: User = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.name || authUser.user_metadata?.name || null,
        role: 'user', // Default role, can be updated from profile API
        tenantId: authUser.tenant_id || authUser.user_metadata?.tenant_id || null,
        tenantName: null, // Will be fetched from profile API
        plan: 'free' as PlanType, // Default plan, can be updated from profile API
      };
      
      // Trigger profile fetch to get additional user data
      fetchUser();
    } else {
      setUser(null);
      setIsLoading(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_CACHE_KEY);
      }
    }

    if (authError) {
      setError(authError.message);
    }
  }, [authUser, authLoading, authError]);

  const fetchUser = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping duplicate request');
      return;
    }

    // Limit fetch attempts to prevent infinite loops
    if (fetchAttempts.current > 3) {
      console.warn('Too many fetch attempts, stopping to prevent infinite loop');
      setError('Failed to fetch user data after multiple attempts');
      setIsLoading(false);
      return;
    }

    try {
      isFetchingRef.current = true;
      fetchAttempts.current += 1;

      if (!authUser) {
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
        } catch (error) {
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

        // If user not found (404), clear session cache and set appropriate error
        if (response.status === 404) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(SESSION_CACHE_KEY);
          }
          setError('User not found - please log in again');
          setUser(null);
          // Don't throw here, just return to prevent further processing
          return;
        }

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
      // Reset fetch attempts on success
      fetchAttempts.current = 0;
    } catch (err) {
      console.error('Error in fetchUser:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
      // Don't clear user here to prevent flickering if it's just a temporary error
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [authUser]);

  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      if (!authUser) {
        throw new Error('No active session');
      }

      try {
        console.log('Updating user profile...');
        const response = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
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
    },
    [authUser, fetchUser],
  );

  // Check session only when needed with debounce
  const checkSession = useCallback(() => {
    const now = Date.now();
    if (now - lastFetch > SESSION_CACHE_EXPIRY) {
      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      // Debounce the fetch call to prevent multiple rapid calls
      fetchTimeoutRef.current = setTimeout(() => {
        fetchUser();
        fetchTimeoutRef.current = null;
      }, 300);
    }
  }, [lastFetch, fetchUser]);

  const checkFeature = (feature: string): boolean => {
    if (!user) return false;
    return isFeatureEnabled(user.plan as PlanType, feature as keyof typeof getPlanFeatures);
  };

  const checkCanCreateMore = (
    feature: 'maxProjects' | 'maxUseCases' | 'maxCampaigns',
    currentCount: number,
  ): boolean => {
    if (!user) return false;
    return canCreateMore(user.plan as PlanType, feature, currentCount);
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_CACHE_KEY);
    }
    
    // Create a FormData object for signOut
    const formData = new FormData();
    formData.append('locale', 'en'); // Default locale
    
    // Sign out using the auth hook
    await signOut(formData);
    
    setUser(null);
  };

  const value = {
    user,
    isLoading: isLoading || authLoading,
    error: error || (authError ? authError.message : null),
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
