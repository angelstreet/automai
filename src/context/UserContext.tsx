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
import {
  updateProfile as updateProfileAction,
  setSelectedTeam as setSelectedTeamAction,
} from '@/app/actions/user';
import { getUser } from '@/app/actions/user';
import { Role, User, AuthUser, UserTeam, TeamMember, ResourceLimit } from '@/types/user';
import { useRequestProtection, clearRequestCache } from '@/hooks/useRequestProtection';
// AppContext has been removed in the RSC migration
import {
  signUp as signUpAction,
  signInWithOAuth as signInWithOAuthAction,
} from '@/app/actions/auth';

// Singleton flag to prevent multiple instances
let USER_CONTEXT_INITIALIZED = false;

// Create a meaningful message for the provider duplication issue
const PROVIDER_DUPLICATION_MESSAGE = `
Multiple instances of UserProvider detected.
This can happen if:
1. You have more than one UserProvider in your component tree
2. The app is being rendered with different React roots
3. You're using the same context in multiple places

Check your layout components and make sure UserProvider only appears once.
`;

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
  // Team-related functionality
  teams: UserTeam[];
  selectedTeam: UserTeam | null;
  teamMembers: TeamMember[];
  setSelectedTeam: (teamId: string) => Promise<void>;
  checkResourceLimit: (resourceType: string) => Promise<ResourceLimit | null>;
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
  // Team-related functionality
  teams: [],
  selectedTeam: null,
  teamMembers: [],
  setSelectedTeam: async () => {},
  checkResourceLimit: async () => null,
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

  // Create a User object with all properties
  return {
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name || authUser.email.split('@')[0] || 'Guest',
    role: role as Role,
    tenant_id: authUser.tenant_id,
    tenant_name: authUser.tenant_name,
    avatar_url: authUser.user_metadata?.avatar_url || '',
    user_metadata: authUser.user_metadata,
    // Include team data
    teams: authUser.teams || [],
    selectedTeamId: authUser.selectedTeamId,
    teamMembers: authUser.teamMembers || [],
  };
};

// Create a functional wrapper component that checks for duplicate providers
function SingletonUserProvider({
  children,
  initialUser,
  onAuthChange,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
  onAuthChange?: (isAuthenticated: boolean) => void;
}) {
  // Check for multiple instances first
  useEffect(() => {
    if (USER_CONTEXT_INITIALIZED) {
      console.warn(PROVIDER_DUPLICATION_MESSAGE);
      return;
    }

    USER_CONTEXT_INITIALIZED = true;
    return () => {
      USER_CONTEXT_INITIALIZED = false;
    };
  }, []);

  return (
    <UserProviderImpl initialUser={initialUser} onAuthChange={onAuthChange}>
      {children}
    </UserProviderImpl>
  );
}

// The actual provider implementation (internal)
function UserProviderImpl({
  children,
  initialUser: propInitialUser,
  onAuthChange,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
  onAuthChange?: (isAuthenticated: boolean) => void;
}) {
  // Add explicit initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initialized = useRef(false);
  const initializationAttempts = useRef(0);

  // Initialize quickly
  useEffect(() => {
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
          refreshUser().catch((e) => console.error('[UserContext] Refresh error:', e));
        }
      }
    }, 1500);

    return () => {
      clearTimeout(quickTimer);
      clearTimeout(backupTimer);
    };
  }, []);

  // Add request protection
  const { protectedFetch, safeUpdateState } = useRequestProtection('UserContext');

  // Get initial user data from the props or from localStorage
  const [localInitialUser, setInitialUser] = useState<User | null>(() => {
    // If we have initialUser from props, prefer that (server-fetched data)
    if (propInitialUser) {
      return propInitialUser;
    }

    // Otherwise try localStorage
    if (typeof window !== 'undefined') {
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

                // Cache in global context reference if it exists
                if ((window as any).__userContext) {
                  (window as any).__userContext.user = user;
                }
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
    fallbackData: localInitialUser,
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

  // Team-related computed values
  const teams = useMemo(() => user?.teams || [], [user?.teams]);

  const selectedTeam = useMemo(() => {
    if (!user?.selectedTeamId || !teams.length) return null;
    return teams.find((team) => team.id === user.selectedTeamId) || null;
  }, [user?.selectedTeamId, teams]);

  const teamMembers = useMemo(() => user?.teamMembers || [], [user?.teamMembers]);

  // Modify the clearCache function to return Promise<void> instead of Promise<null>
  const handleClearCache = async () => {
    log('[UserContext] Clearing cache');
    // Clear localStorage items
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CACHED_USER);
      localStorage.removeItem(STORAGE_KEYS.CACHED_USER_TIME);
    }

    // Clear request cache
    await clearRequestCache();

    // Force refresh of user data
    if (typeof mutateUser === 'function') {
      await mutateUser(null, { revalidate: true });
    }
  };

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

  // Function to select a team
  const handleSetSelectedTeam = async (teamId: string) => {
    log('[UserContext] Setting selected team to:', teamId);
    try {
      if (!user?.id) throw new Error('No user found');

      // Validate the team exists in the user's teams
      if (!teams.some((team) => team.id === teamId)) {
        throw new Error('Team not found or access denied');
      }

      // Call the server action to update the selected team
      await setSelectedTeamAction(teamId);

      // Refresh user data to get updated team and members
      await refreshUser();
    } catch (err) {
      log('[UserContext] Team selection error:', err);
      setError(err instanceof Error ? err : new Error('Failed to select team'));
      throw err;
    }
  };

  // Function to check resource limits
  const handleCheckResourceLimit = async (resourceType: string): Promise<ResourceLimit | null> => {
    // Simple implementation - we'll check against the current team's resource limits
    // In a real implementation, you would fetch this from the server or have it as part of the user data
    if (!user?.teams?.length || !selectedTeam) return null;

    // This is a placeholder - in a real implementation, you would call a server action to check the limit
    return {
      type: resourceType,
      current: 0, // This would be the current count of resources
      limit: 10, // This would be the team's limit for this resource type
      isUnlimited: false,
      canCreate: true, // Based on current < limit || isUnlimited
    };
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

  // Persist user data in localStorage
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(user));
      } catch (e) {
        // Ignore localStorage errors
      }
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

  // Update the value object to include the team-related functions
  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      updateProfile: handleUpdateProfile,
      refreshUser,
      updateRole: handleRoleUpdate,
      clearCache: handleClearCache,
      isInitialized,
      signUp,
      signInWithOAuth,
      // Team-related fields and functions
      teams,
      selectedTeam,
      teamMembers,
      setSelectedTeam: handleSetSelectedTeam,
      checkResourceLimit: handleCheckResourceLimit,
    }),
    [
      user,
      loading,
      error,
      refreshUser,
      handleClearCache,
      isInitialized,
      signUp,
      signInWithOAuth,
      teams,
      selectedTeam,
      teamMembers,
      handleSetSelectedTeam,
      handleCheckResourceLimit,
    ],
  );

  // AppContext has been removed in the RSC migration

  // Also expose user context globally for immediate access
  if (typeof window !== 'undefined') {
    (window as any).__userContext = value;
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Export the singleton wrapper as the UserProvider
export const UserProvider = SingletonUserProvider;

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
      // Team-related fields and functions
      teams: [],
      selectedTeam: null,
      teamMembers: [],
      setSelectedTeam: async () => {},
      checkResourceLimit: async () => null,
    };
  }

  // Cache for future synchronous access
  if (typeof window !== 'undefined') {
    (window as any).__userContext = context;
  }

  return context;
}
