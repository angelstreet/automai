'use client';

import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { updateProfile as updateProfileAction } from '@/app/actions/user';
import { getUser } from '@/app/actions/user';
import { Role, User, AuthUser } from '@/types/user';
import { useRequestProtection, clearRequestCache } from '@/hooks/useRequestProtection';
import { persistedData } from './AppContext';
import { AppContextType } from '@/types/context/app';

// Singleton flag to prevent multiple instances
let USER_CONTEXT_INITIALIZED = false;

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  updateProfile: (formData: FormData) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateRole: (role: Role) => Promise<void>;
  clearCache: () => Promise<void>;
  isInitialized: boolean; // Added to track initialization state
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: false,
  error: null,
  updateProfile: async () => {},
  refreshUser: async () => null,
  updateRole: async () => {},
  clearCache: async () => {},
  isInitialized: false,
});

// Reduce logging with a DEBUG flag
const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log(...args);

// Storage keys
const STORAGE_KEYS = {
  CACHED_USER: 'cached_user',
  CACHED_USER_TIME: 'cached_user_time',
};

// Map the auth user to our User type
const mapAuthUserToUser = (authUser: AuthUser): User => {
  log('[UserContext] Mapping auth user to user:', {
    id: authUser.id,
    hasTenantId: !!authUser.tenant_id,
    hasTenantName: !!authUser.tenant_name,
    hasUserMetadata: !!authUser.user_metadata,
  });

  if (!authUser.tenant_id) {
    throw new Error('Missing tenant_id in user data');
  }

  if (!authUser.tenant_name) {
    throw new Error('Missing tenant_name in user data');
  }

  // Try to extract role from different possible locations
  // Use the role from profile data, with fallbacks to user_metadata or default to viewer
  const role = (authUser as any).role || authUser?.user_metadata?.role || 'viewer';

  log('[UserContext] User role determined:', role);

  // Log detailed role resolution for debugging
  if (DEBUG) {
    console.log('[UserContext] Detailed role resolution:', {
      fromAuthUser: (authUser as any).role,
      fromMetadata: authUser?.user_metadata?.role,
      finalRole: role,
    });
  }

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

export function UserProvider({ 
  children, 
  appContextRef,
  onAuthChange
}: { 
  children: React.ReactNode;
  appContextRef: React.MutableRefObject<AppContextType>;
  onAuthChange?: (isAuthenticated: boolean) => void;
}) {
  // Add explicit initialization state
  const [isInitialized, setIsInitialized] = useState(false);

  // Check for multiple instances of UserProvider
  useEffect(() => {
    if (USER_CONTEXT_INITIALIZED) {
      console.warn(
        '[UserContext] Multiple instances of UserProvider detected. ' +
          'This can cause performance issues and unexpected behavior. ' +
          'Ensure that UserProvider is only used once in the component tree, ' +
          'preferably in the AppProvider.',
      );
    } else {
      USER_CONTEXT_INITIALIZED = true;
      log('[UserContext] UserProvider initialized as singleton');
    }

    // Set initialized immediately when user data is available
    // We'll also track this in a separate effect based on user data
    const timer = setTimeout(() => {
      setIsInitialized(true);
      log('[UserContext] UserProvider initialized via timeout');
    }, 100);

    return () => {
      // Only reset on the instance that set it to true
      if (USER_CONTEXT_INITIALIZED) {
        USER_CONTEXT_INITIALIZED = false;
        log('[UserContext] UserProvider singleton instance unmounted');
      }
      clearTimeout(timer);
    };
  }, []);

  log('[UserContext] UserProvider rendering');
  const [error, setError] = useState<Error | null>(null);
  const initialized = useRef(false);
  // Add request protection
  const { protectedFetch, safeUpdateState, renderCount } = useRequestProtection('UserContext');

  // Get initial user data synchronously from localStorage
  const [initialUser, setInitialUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      // Check if we have persisted data from AppContext first
      if (persistedData.user) {
        log('[UserContext] Using initial user data from persistedData');
        return persistedData.user;
      }

      try {
        const cachedUser = localStorage.getItem(STORAGE_KEYS.CACHED_USER);
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

  // Fetch user data with request protection and better SSR handling
  const fetchUserData = useCallback(
    async (force = false): Promise<User | null> => {
      return await protectedFetch(
        'user.getUser',
        async () => {
          log('[UserContext] fetchUserData called, force:', force);
          console.log('DEBUG UserContext - Fetching user data, force:', force);
          try {
            // On the server, return null to avoid hydration mismatches
            if (typeof window === 'undefined') {
              log('[UserContext] Server-side render, returning null');
              console.log('DEBUG UserContext - Server-side render, returning null');
              return null;
            }

            // Try to get cached user from localStorage if not forcing refresh
            if (!force && typeof window !== 'undefined') {
              const cachedUser = localStorage.getItem(STORAGE_KEYS.CACHED_USER);
              if (cachedUser) {
                try {
                  const parsedUser = JSON.parse(cachedUser);
                  // Check if the cached user data is fresh (less than 5 minutes old)
                  const cachedTime = localStorage.getItem(STORAGE_KEYS.CACHED_USER_TIME);
                  if (cachedTime) {
                    const timeDiff = Date.now() - parseInt(cachedTime, 10);
                    // If cache is less than 5 minutes old, use it
                    if (timeDiff < 5 * 60 * 1000) {
                      log(
                        '[UserContext] Using cached user data, age:',
                        Math.round(timeDiff / 1000),
                        'seconds',
                      );
                      console.log('DEBUG UserContext - Using cached user data:', {
                        age: Math.round(timeDiff / 1000) + ' seconds',
                        role: parsedUser?.role,
                        tenantId: parsedUser?.tenant_id
                      });
                      return parsedUser;
                    }
                    log(
                      '[UserContext] Cached user data expired, age:',
                      Math.round(timeDiff / 1000),
                      'seconds',
                    );
                  }
                } catch (e) {
                  // Invalid JSON, ignore and continue
                  log('[UserContext] Invalid cached user data:', e);
                  localStorage.removeItem(STORAGE_KEYS.CACHED_USER);
                  localStorage.removeItem(STORAGE_KEYS.CACHED_USER_TIME);
                }
              } else {
                log('[UserContext] No cached user data found');
              }
            }

            // Fetch fresh user data directly from server action
            log('[UserContext] Fetching fresh user data from server');
            console.log('DEBUG UserContext - Fetching fresh user data from server');
            const authUser = await getUser();
            log('[UserContext] Server returned auth user:', authUser ? 'found' : 'not found');
            console.log('DEBUG UserContext - Server returned auth user:', authUser ? {
              id: authUser.id,
              email: authUser.email,
              role: (authUser as any).role || authUser?.user_metadata?.role || 'not found',
              tenant: authUser.tenant_name
            } : 'not found');

            if (!authUser) return null;

            try {
              // Map to our User type - will throw if tenant data is missing
              const user = mapAuthUserToUser(authUser);
              log('[UserContext] Successfully mapped user data:', {
                id: user.id,
                tenant: user.tenant_name,
                role: user.role,
              });
              
              console.log('DEBUG UserContext - Successfully mapped user data:', {
                id: user.id,
                tenant: user.tenant_name,
                role: user.role,
                authUserRole: (authUser as any).role,
                authUserMetadataRole: authUser?.user_metadata?.role,
                timestamp: new Date().toISOString()
              });

              // Cache the user in localStorage
              if (typeof window !== 'undefined') {
                log('[UserContext] Storing user data in localStorage cache');
                console.log('DEBUG UserContext - Storing user data in localStorage cache', {
                  role: user.role,
                  tenant: user.tenant_name,
                  timestamp: new Date().toISOString()
                });
                localStorage.setItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(user));
                localStorage.setItem(STORAGE_KEYS.CACHED_USER_TIME, Date.now().toString());
                
                // Double check storage
                try {
                  const storedUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CACHED_USER) || '{}');
                  console.log('DEBUG UserContext - Verified stored user data:', {
                    role: storedUser.role,
                    storedCorrectly: storedUser.role === user.role
                  });
                } catch (e) {
                  console.error('DEBUG UserContext - Error verifying stored user:', e);
                }
              }

              // Cache in persistedData for cross-navigation
              if (persistedData) {
                persistedData.user = user;
                log('[UserContext] Stored user in persistedData for cross-navigation');
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
        },
        { force },
      );
    },
    [protectedFetch],
  );

  // Use SWR for data fetching with stable SSR behavior
  const {
    data: user,
    isLoading: loading,
    mutate: mutateUser,
  } = useSWR('user-data', () => fetchUserData(false), {
    fallbackData: initialUser, // Use initial data to avoid flicker
    revalidateOnFocus: false, // Don't revalidate on every tab focus
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // Dedupe requests for 1 minute
    keepPreviousData: true,
    loadingTimeout: 3000, // Consider slow after 3 seconds
    revalidateIfStale: true, // Revalidate if stale
    refreshInterval: 300000, // Refresh every 5 minutes
    onSuccess: (data) => {
      log('[UserContext] SWR cache success:', data ? 'user found' : 'no user');
    },
  });

  // Function to clear all caches
  const clearCache = useCallback(async () => {
    log('[UserContext] Clearing all user caches');

    // Clear request protection cache for user keys
    clearRequestCache(/^user\./);

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CACHED_USER);
      localStorage.removeItem(STORAGE_KEYS.CACHED_USER_TIME);
    }

    // Clear persisted data
    if (persistedData) {
      persistedData.user = null;
    }

    // Clear SWR cache and force revalidation
    await mutateUser(null, true);

    return null;
  }, [mutateUser]);

  const refreshUser = useCallback(async () => {
    log('[UserContext] Manually refreshing user data');
    try {
      // Use force=true to bypass all caches
      const freshUserData = await fetchUserData(true);

      // Update SWR cache with the fresh data
      await mutateUser(freshUserData, false);

      log('[UserContext] User refresh complete:', freshUserData ? 'success' : 'no data');
      return freshUserData || null;
    } catch (error) {
      log('[UserContext] Error refreshing user:', error);
      return user;
    }
  }, [fetchUserData, mutateUser, user]);

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
        role: user.role,
      });
    }
  }, [user]);

  // Persist user data for cross-navigation
  useEffect(() => {
    if (user && persistedData) {
      persistedData.user = user;
      log('[UserContext] Updated persisted user data');
    }
  }, [user]);

  // Notify AppContext about authentication state changes
  useEffect(() => {
    // If onAuthChange callback is provided, call it with current auth state
    if (onAuthChange) {
      const isAuthenticated = !!user;
      log('[UserContext] Notifying AppContext about auth state:', isAuthenticated);
      onAuthChange(isAuthenticated);
    }
  }, [user, onAuthChange]);

  const contextValue = React.useMemo(
    () => ({
      user,
      loading,
      error,
      updateProfile: handleUpdateProfile,
      refreshUser,
      updateRole: handleRoleUpdate,
      clearCache,
      isInitialized,
    }),
    [user, loading, error, refreshUser, clearCache, isInitialized],
  );

  // Update the central AppContext via the ref for synchronous access
  // This ensures the user context is available immediately to all consumers
  if (appContextRef?.current) {
    appContextRef.current.user = contextValue;
    log('[UserContext] Updated central AppContext ref directly');
  }
  
  // Also expose user context globally for immediate access
  if (typeof window !== 'undefined') {
    // Store in global for immediate synchronous access
    (window as any).__userContext = contextValue;
    log('[UserContext] Exposed context globally for synchronous access');
  }
  
  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
}

export function useUser() {
  // Try to get the global version first if in browser
  if (typeof window !== 'undefined' && (window as any).__userContext) {
    console.log('DEBUG useUser - Using global user context from window:', {
      hasUser: !!(window as any).__userContext?.user,
      userRole: (window as any).__userContext?.user?.role || 'no role'
    });
    return (window as any).__userContext;
  }
  
  // Otherwise use React context
  const context = useContext(UserContext);
  
  console.log('DEBUG useUser - Using React context:', {
    hasUser: !!context?.user,
    userRole: context?.user?.role || 'no role',
    isLoading: context?.loading
  });

  // If the context is null for some reason, return a safe default object
  // This prevents destructuring errors in components
  if (!context) {
    console.warn(
      '[useUser] User context is null, returning fallback. This should not happen if using the centralized context system.',
    );
    return {
      user: null,
      loading: true,
      error: null,
      updateProfile: async () => {},
      refreshUser: async () => null,
      updateRole: async () => {},
      clearCache: async () => {},
      isInitialized: false,
    };
  }

  // Cache for future synchronous access
  if (typeof window !== 'undefined') {
    (window as any).__userContext = context;
  }

  return context;
}
