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

// Map the auth user to our User type
const mapAuthUserToUser = (authUser: AuthUser): User => {
  console.log('[UserContext] Mapping auth user to user:', {
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
  
  console.log('[UserContext] User role determined:', role);

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
  console.log('[UserContext] UserProvider initializing');
  const [error, setError] = useState<Error | null>(null);

  // Add a flag to track client-side rendering
  const [isClient, setIsClient] = useState(false);
  
  // Add initialization tracker to prevent duplicate initialization
  const initialized = useRef(false);

  // Set isClient once the component mounts on the client
  useEffect(() => {
    console.log('[UserContext] Client-side initialization');
    setIsClient(true);
    
    // Attempt to fetch user data on mount
    // Don't use setTimeout, fetch immediately
    if (!initialized.current) {
      initialized.current = true;
      console.log('[UserContext] Triggering initial data fetch');
      fetchUserData().catch(e => console.error('[UserContext] Initial fetch error:', e));
    }
    
    return () => {
      console.log('[UserContext] UserProvider unmounting');
      initialized.current = false;
    };
  }, []);

  // Fetch user data with better SSR handling
  const fetchUserData = async (): Promise<User | null> => {
    console.log('[UserContext] fetchUserData called');
    try {
      // On the server, return null to avoid hydration mismatches
      if (typeof window === 'undefined') {
        console.log('[UserContext] Server-side render, returning null');
        return null;
      }

      // Step 2: Improved caching strategy
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
                console.log('[UserContext] Using cached user data, age:', Math.round(timeDiff/1000), 'seconds');
                return parsedUser;
              }
              console.log('[UserContext] Cached user data expired, age:', Math.round(timeDiff/1000), 'seconds');
            }
          } catch (e) {
            // Invalid JSON, ignore and continue
            console.error('[UserContext] Invalid cached user data:', e);
            localStorage.removeItem('cached_user');
            localStorage.removeItem('cached_user_time');
          }
        } else {
          console.log('[UserContext] No cached user data found');
        }
      }

      // Fetch fresh user data directly from server action
      // This reuses middleware authentication without extra API route
      console.log('[UserContext] Fetching fresh user data from server');
      const authUser = await getUser();
      console.log('[UserContext] Server returned auth user:', authUser ? 'found' : 'not found');
      
      if (!authUser) {
        console.log('[UserContext] No auth user returned from server, retrying once');
        // Add a retry after a short delay
        return new Promise((resolve) => {
          setTimeout(async () => {
            try {
              const retryUser = await getUser();
              console.log('[UserContext] Retry server returned auth user:', retryUser ? 'found' : 'still not found');
              
              if (!retryUser) {
                resolve(null);
                return;
              }
              
              try {
                const user = mapAuthUserToUser(retryUser);
                // Cache the user in localStorage
                if (typeof window !== 'undefined') {
                  localStorage.setItem('cached_user', JSON.stringify(user));
                  localStorage.setItem('cached_user_time', Date.now().toString());
                }
                resolve(user);
              } catch (err) {
                console.error('[UserContext] Retry user mapping error:', err);
                resolve(null);
              }
            } catch (err) {
              console.error('[UserContext] Retry fetch error:', err);
              resolve(null);
            }
          }, 1000);
        });
      }

      try {
        // Map to our User type - will throw if tenant data is missing
        const user = mapAuthUserToUser(authUser);
        console.log('[UserContext] Successfully mapped user data:', { 
          id: user.id,
          tenant: user.tenant_name,
          role: user.role 
        });
        
        // Cache the user in localStorage
        if (typeof window !== 'undefined') {
          console.log('[UserContext] Storing user data in localStorage cache');
          localStorage.setItem('cached_user', JSON.stringify(user));
          localStorage.setItem('cached_user_time', Date.now().toString());
        }
        
        return user;
      } catch (error) {
        console.error('[UserContext] User data mapping error:', error);
        setError(error instanceof Error ? error : new Error('Invalid user data'));
        return null;
      }

    } catch (error) {
      console.error('[UserContext] Error fetching user:', error);
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
    // Only run SWR on the client side to avoid hydration mismatches
    isClient ? 'user-data' : null,
    fetchUserData,
    {
      fallbackData: null,
      revalidateOnFocus: true, // Enable revalidation on focus to ensure fresh data
      revalidateOnReconnect: true, // Enable revalidation on reconnect
      dedupingInterval: 10000, // Reduce deduping interval to 10 seconds
      keepPreviousData: true, // Keep previous data while revalidating
      loadingTimeout: 3000, // Consider slow after 3 seconds
      revalidateIfStale: true, // Revalidate if stale to keep data fresh
      refreshInterval: 60000, // Refresh every minute
      onSuccess: (data) => {
        console.log('[UserContext] SWR cache success:', data ? 'user found' : 'no user');
      },
    },
  );

  // Function to clear all caches
  const clearCache = useCallback(async () => {
    console.log('[UserContext] Clearing all user caches');
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cached_user');
      localStorage.removeItem('cached_user_time');
    }
    // Clear SWR cache and set user to null
    await mutateUser(null, false);
  }, [mutateUser]);

  const refreshUser = useCallback(async () => {
    console.log('[UserContext] Manually refreshing user data');
    try {
      const freshUserData = await mutateUser();
      console.log('[UserContext] User refresh complete:', freshUserData ? 'success' : 'no data');
      return freshUserData || null;
    } catch (error) {
      console.error('[UserContext] Error refreshing user:', error);
      return user;
    }
  }, [mutateUser, user]);

  const handleUpdateProfile = async (formData: FormData) => {
    console.log('[UserContext] Updating user profile');
    try {
      await updateProfileAction(formData);
      await refreshUser();
    } catch (err) {
      console.error('[UserContext] Profile update error:', err);
      setError(err instanceof Error ? err : new Error('Failed to update profile'));
    }
  };

  const handleRoleUpdate = async (role: Role) => {
    console.log('[UserContext] Updating user role to:', role);
    try {
      if (!user?.id) throw new Error('No user found');
      const formData = new FormData();
      formData.append('role', role);
      await handleUpdateProfile(formData);
    } catch (err) {
      console.error('[UserContext] Role update error:', err);
      setError(err instanceof Error ? err : new Error('Failed to update role'));
      throw err;
    }
  };

  // Log current context state on each render
  console.log('[UserContext] Current state:', { 
    hasUser: !!user,
    loading,
    hasError: !!error
  });

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
    [user, loading, error, refreshUser, handleRoleUpdate, clearCache],
  );

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
}

export const useUser = () => useContext(UserContext);
