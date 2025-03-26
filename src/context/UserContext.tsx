'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import useSWR from 'swr';
import { updateProfile as updateProfileAction } from '@/app/actions/user';
import { getUser } from '@/app/actions/user';
import { Role, User, AuthUser } from '@/types/user';
import { useRequestProtection, clearRequestCache } from '@/hooks/useRequestProtection';
import { persistedData } from './AppContext';
import { AppContextType } from '@/types/context/app';
import {
  signUp as signUpAction,
  signInWithOAuth as signInWithOAuthAction,
} from '@/app/actions/auth';

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
  isInitialized: boolean;
  signUp: (email: string, password: string, name: string, redirectUrl: string) => Promise<any>;
  signInWithOAuth: (provider: 'google' | 'github', redirectUrl: string) => Promise<any>;
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
  signUp: async () => {},
  signInWithOAuth: async () => {},
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
  if (!authUser.tenant_id) {
    throw new Error('Missing tenant_id in user data');
  }

  if (!authUser.tenant_name) {
    throw new Error('Missing tenant_name in user data');
  }

  // Try to extract role from different possible locations
  const role = (authUser as any).role || authUser?.user_metadata?.role || 'viewer';

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
  onAuthChange,
}: {
  children: React.ReactNode;
  appContextRef: React.MutableRefObject<AppContextType>;
  onAuthChange?: (isAuthenticated: boolean) => void;
}) {
  // Check for multiple instances of UserProvider
  useEffect(() => {
    if (USER_CONTEXT_INITIALIZED) {
      console.warn('[UserContext] Multiple instances of UserProvider detected');
    } else {
      USER_CONTEXT_INITIALIZED = true;
      log('[UserContext] UserProvider initialized as singleton');
    }

    // Initialize user context with a quick initial timeout, but ensure it gets set
    // even when there might be auth delays
    const quickTimer = setTimeout(() => {
      setIsInitialized(true);
      log('[UserContext] Initial initialization complete');
    }, 100);
    
    // Backup timer to ensure initialization happens even if auth is delayed
    const backupTimer = setTimeout(() => {
      if (!initialized.current) {
        log('[UserContext] Backup initialization triggered');
        initializationAttempts.current += 1;
        setIsInitialized(true);
        initialized.current = true;
        // Force a refresh if user data still not available
        if (!user) {
          log('[UserContext] User data still missing, forcing refresh');
          refreshUser().catch(e => console.error('[UserContext] Refresh error:', e));
        }
      }
    }, 1500);

    return () => {
      if (USER_CONTEXT_INITIALIZED) {
        USER_CONTEXT_INITIALIZED = false;
      }
      clearTimeout(quickTimer);
      clearTimeout(backupTimer);
    };
  }, []);

  // Add explicit initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initialized = useRef(false);
  const initializationAttempts = useRef(0);

  // Add request protection
  const { protectedFetch, safeUpdateState } = useRequestProtection('UserContext');

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

          try {
            // On the server, return null to avoid hydration mismatches
            if (typeof window === 'undefined') {
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
                      return parsedUser;
                    }
                  }
                } catch (e) {
                  // Invalid JSON, ignore and continue
                  localStorage.removeItem(STORAGE_KEYS.CACHED_USER);
                  localStorage.removeItem(STORAGE_KEYS.CACHED_USER_TIME);
                }
              }
            }

            // Fetch fresh user data directly from server action
            const authUser = await getUser();

            if (!authUser) return null;

            try {
              // Map to our User type - will throw if tenant data is missing
              const user = mapAuthUserToUser(authUser);

              // Cache the user in localStorage
              if (typeof window !== 'undefined') {
                localStorage.setItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(user));
                localStorage.setItem(STORAGE_KEYS.CACHED_USER_TIME, Date.now().toString());
              }

              // Cache in persistedData for cross-navigation
              if (persistedData) {
                persistedData.user = user;
              }

              return user;
            } catch (error) {
              setError(error instanceof Error ? error : new Error('Invalid user data'));
              return null;
            }
          } catch (error) {
            setError(error instanceof Error ? error : new Error('Failed to fetch user'));
            return null;
          }
        },
        { force },
      );
    },
    [protectedFetch],
  );

  // Use SWR for data fetching with stable SSR behavior and better retry handling
  const {
    data: user,
    isLoading: loading,
    mutate: mutateUser,
  } = useSWR('user-data', () => fetchUserData(false), {
    fallbackData: initialUser,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 30000, // Reduced from 60s to 30s
    keepPreviousData: true,
    loadingTimeout: 3000,
    revalidateIfStale: true,
    refreshInterval: 300000,
    errorRetryCount: 3,
    errorRetryInterval: 2000,
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
      log('[UserContext] User loaded:', {
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
    }
  }, [user]);

  // Notify AppContext about authentication state changes
  useEffect(() => {
    // If onAuthChange callback is provided, call it with current auth state
    if (onAuthChange) {
      const isAuthenticated = !!user;
      onAuthChange(isAuthenticated);
    }
  }, [user, onAuthChange]);

  const signUp = useCallback(
    async (email: string, password: string, name: string, redirectUrl: string) => {
      try {
        const result = await signUpAction(email, password, name, redirectUrl);
        if (result.success) {
          // Refresh user data after successful signup
          await refreshUser();
          return result;
        }
        throw new Error(result.error || 'Failed to sign up');
      } catch (error: any) {
        setError(error);
        throw error;
      }
    },
    [refreshUser],
  );

  const signInWithOAuth = useCallback(
    async (provider: 'google' | 'github', redirectUrl: string) => {
      try {
        const result = await signInWithOAuthAction(provider, redirectUrl);
        if (result.success) {
          return result;
        }
        throw new Error(result.error || 'Failed to sign in with OAuth');
      } catch (error: any) {
        setError(error);
        throw error;
      }
    },
    [],
  );

  // Update the value object to include the new functions
  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      updateProfile: handleUpdateProfile,
      refreshUser,
      updateRole: handleRoleUpdate,
      clearCache,
      isInitialized,
      signUp,
      signInWithOAuth,
    }),
    [user, loading, error, refreshUser, clearCache, isInitialized, signUp, signInWithOAuth],
  );

  // Update the central AppContext via the ref for synchronous access
  if (appContextRef?.current) {
    appContextRef.current.user = value;
  }

  // Also expose user context globally for immediate access
  if (typeof window !== 'undefined') {
    (window as any).__userContext = value;
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  // Try to get the global version first if in browser
  if (typeof window !== 'undefined' && (window as any).__userContext) {
    return (window as any).__userContext;
  }

  // Otherwise use React context
  const context = useContext(UserContext);

  // If the context is null for some reason, return a safe default object
  if (!context) {
    console.warn('[useUser] User context is null, returning fallback.');
    return {
      user: null,
      loading: true,
      error: null,
      updateProfile: async () => {},
      refreshUser: async () => null,
      updateRole: async () => {},
      clearCache: async () => {},
      isInitialized: false,
      signUp: async () => {},
      signInWithOAuth: async () => {},
    };
  }

  // Cache for future synchronous access
  if (typeof window !== 'undefined') {
    (window as any).__userContext = context;
  }

  return context;
}
