'use client';

import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { updateProfile as updateProfileAction } from '@/app/actions/user';
import { getUser } from '@/app/actions/user';
import { Role, User, AuthUser } from '@/types/user';

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  updateProfile: (formData: FormData) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateRole: (role: Role) => Promise<void>;
  clearCache: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: false,
  error: null,
  updateProfile: async () => {},
  refreshUser: async () => null,
  updateRole: async () => {},
  clearCache: async () => {},
});

// Reduce logging with a DEBUG flag
const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log(...args);

// Map the auth user to our User type
const mapAuthUserToUser = (authUser: AuthUser): User => {
  log('[UserContext] Mapping auth user to user:', {
    id: authUser.id,
    hasTenantId: !!authUser.tenant_id,
    hasTenantName: !!authUser.tenant_name,
    hasUserMetadata: !!authUser.user_metadata
  });

  if (!authUser.tenant_id) {
    throw new Error('Missing tenant_id in user data');
  }
  
  if (!authUser.tenant_name) {
    throw new Error('Missing tenant_name in user data');
  }

  // Try to extract role from different possible locations
  const role = (authUser as any).role || 'viewer';
  
  log('[UserContext] User role determined:', role);

  return {
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name || authUser.email.split('@')[0] || 'Guest',
    role: role as Role,
    tenant_id: authUser.tenant_id,
    tenant_name: authUser.tenant_name,
    avatar_url: authUser.user_metadata?.avatar_url || '',
    user_metadata: authUser.user_metadata,
  };
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  log('[UserContext] UserProvider initializing');
  const [error, setError] = useState<Error | null>(null);
  const initialized = useRef(false);
  
  // Get initial user data synchronously from localStorage
  const [initialUser, setInitialUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedUser = localStorage.getItem('cached_user');
        if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          log('[UserContext] Using initial cached user data from localStorage');
          return parsedUser;
        }
      } catch (e) {
        // Ignore localStorage errors
        log('[UserContext] Error reading from localStorage:', e);
      }
    }
    return null;
  });

  // Fetch user data with better SSR handling
  const fetchUserData = async (): Promise<User | null> => {
    log('[UserContext] fetchUserData called');
    try {
      // On the server, return null to avoid hydration mismatches
      if (typeof window === 'undefined') {
        log('[UserContext] Server-side render, returning null');
        return null;
      }

      // Try to get cached user from localStorage
      if (typeof window !== 'undefined') {
        const cachedUser = localStorage.getItem('cached_user');
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            // Check if the cached user data is fresh (less than 5 minutes old)
            const cachedTime = localStorage.getItem('cached_user_time');
            if (cachedTime) {
              const timeDiff = Date.now() - parseInt(cachedTime, 10);
              // If cache is less than 5 minutes old, use it
              if (timeDiff < 5 * 60 * 1000) {
                log('[UserContext] Using cached user data, age:', Math.round(timeDiff/1000), 'seconds');
                return parsedUser;
              }
              log('[UserContext] Cached user data expired, age:', Math.round(timeDiff/1000), 'seconds');
            }
          } catch (e) {
            // Invalid JSON, ignore and continue
            log('[UserContext] Invalid cached user data:', e);
            localStorage.removeItem('cached_user');
            localStorage.removeItem('cached_user_time');
          }
        } else {
          log('[UserContext] No cached user data found');
        }
      }

      // Fetch fresh user data directly from server action
      log('[UserContext] Fetching fresh user data from server');
      const authUser = await getUser();
      log('[UserContext] Server returned auth user:', authUser ? 'found' : 'not found');
      
      if (!authUser) return null;

      try {
        // Map to our User type - will throw if tenant data is missing
        const user = mapAuthUserToUser(authUser);
        log('[UserContext] Successfully mapped user data:', { 
          id: user.id,
          tenant: user.tenant_name,
          role: user.role 
        });
        
        // Cache the user in localStorage
        if (typeof window !== 'undefined') {
          log('[UserContext] Storing user data in localStorage cache');
          localStorage.setItem('cached_user', JSON.stringify(user));
          localStorage.setItem('cached_user_time', Date.now().toString());
        }
        
        return user;
      } catch (error) {
        log('[UserContext] User data mapping error:', error);
        setError(error instanceof Error ? error : new Error('Invalid user data'));
        return null;
      }

    } catch (error) {
      log('[UserContext] Error fetching user:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch user'));
      return null;
    }
  };

  // Use SWR for data fetching with stable SSR behavior
  const {
    data: user,
    isLoading: loading,
    mutate: mutateUser,
  } = useSWR(
    'user-data',
    fetchUserData,
    {
      fallbackData: initialUser, // Use initial data to avoid flicker
      revalidateOnFocus: false,  // Don't revalidate on every tab focus
      revalidateOnReconnect: true,
      dedupingInterval: 60000,   // Dedupe requests for 1 minute
      keepPreviousData: true, 
      loadingTimeout: 3000,     // Consider slow after 3 seconds
      revalidateIfStale: true,  // Revalidate if stale
      refreshInterval: 300000,  // Refresh every 5 minutes
      onSuccess: (data) => {
        log('[UserContext] SWR cache success:', data ? 'user found' : 'no user');
      },
    },
  );

  // Function to clear all caches
  const clearCache = useCallback(async () => {
    log('[UserContext] Clearing all user caches');
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cached_user');
      localStorage.removeItem('cached_user_time');
    }
    // Clear SWR cache and set user to null
    await mutateUser(null, false);
  }, [mutateUser]);

  const refreshUser = useCallback(async () => {
    log('[UserContext] Manually refreshing user data');
    try {
      const freshUserData = await mutateUser();
      log('[UserContext] User refresh complete:', freshUserData ? 'success' : 'no data');
      return freshUserData || null;
    } catch (error) {
      log('[UserContext] Error refreshing user:', error);
      return user;
    }
  }, [mutateUser, user]);

  const handleUpdateProfile = async (formData: FormData) => {
    log('[UserContext] Updating user profile');
    try {
      await updateProfileAction(formData);
      await refreshUser();
    } catch (err) {
      log('[UserContext] Profile update error:', err);
      setError(err instanceof Error ? err : new Error('Failed to update profile'));
    }
  };

  const handleRoleUpdate = async (role: Role) => {
    log('[UserContext] Updating user role to:', role);
    try {
      if (!user?.id) throw new Error('No user found');
      const formData = new FormData();
      formData.append('role', role);
      await handleUpdateProfile(formData);
    } catch (err) {
      log('[UserContext] Role update error:', err);
      setError(err instanceof Error ? err : new Error('Failed to update role'));
      throw err;
    }
  };

  // Log current context state on significant changes only
  useEffect(() => {
    if (user?.id && !initialized.current) {
      initialized.current = true;
      console.log('[UserContext] User loaded:', { 
        id: user.id, 
        tenant: user.tenant_name,
        role: user.role
      });
    }
  }, [user]);

  const contextValue = React.useMemo(
    () => ({
      user,
      loading,
      error,
      updateProfile: handleUpdateProfile,
      refreshUser,
      updateRole: handleRoleUpdate,
      clearCache,
    }),
    [user, loading, error, refreshUser, clearCache]
  );

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  
  // If the context is null for some reason, return a safe default object
  // This prevents destructuring errors in components
  if (!context) {
    console.warn('[useUser] User context is null, returning fallback');
    return {
      user: null,
      loading: true,
      error: null,
      updateProfile: async () => {},
      refreshUser: async () => null,
      updateRole: async () => {},
      clearCache: async () => {},
    };
  }
  
  return context;
}
