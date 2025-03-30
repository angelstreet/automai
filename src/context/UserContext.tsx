'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import useSWR from 'swr';

import {
  signUp as signUpAction,
  signInWithOAuth as signInWithOAuthAction,
  signOut as signOutAction,
} from '@/app/actions/auth';
import {
  updateProfile as updateProfileAction,
  setSelectedTeam as setSelectedTeamAction,
  getUser,
} from '@/app/actions/user';
import { useRequestProtection, clearRequestCache } from '@/hooks/useRequestProtection';
import { Role, User, UserTeam, TeamMember, ResourceLimit } from '@/types/user';
import { mapAuthUserToUser } from '@/utils/user';

// Define the context type
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
  signOut: (locale?: string) => Promise<{ success: boolean; redirectUrl?: string }>;
  teams: UserTeam[];
  selectedTeam: UserTeam | null;
  teamMembers: TeamMember[];
  setSelectedTeam: (teamId: string) => Promise<void>;
  checkResourceLimit: (resourceType: string) => Promise<ResourceLimit | null>;
}

// Create context with default values
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
  signOut: async () => ({ success: false }),
  teams: [],
  selectedTeam: null,
  teamMembers: [],
  setSelectedTeam: async () => {},
  checkResourceLimit: async () => null,
});

// UserProvider component
export function UserProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  const { protectedFetch } = useRequestProtection('UserContext');
  const [error, setError] = React.useState<Error | null>(null);

  console.debug(
    '[@context:UserContext:UserProvider] Initializing with initialUser:',
    initialUser ? `${initialUser.id} (${initialUser.email})` : 'null',
  );

  // Fetch user data only when forced (e.g., refresh)
  const fetchUserData = useCallback(
    async (force = false): Promise<User | null> => {
      console.log(
        '[@context:UserContext:fetchUserData] Called with initialUser:',
        initialUser ? 'exists' : 'null',
        'force:',
        force,
      );
      if (force) {
        console.log(
          '[@context:UserContext:fetchUserData] Force fetch triggered by:',
          new Error().stack,
        );
      }

      return protectedFetch('user.getUser', async () => {
        if (!force && initialUser) {
          console.log(
            '[@context:UserContext:fetchUserData] Using initialUser from props, skipping fetch',
          );
          return initialUser; // Trust initialUser unless forced
        }

        console.log('[@context:UserContext:fetchUserData] Fetching fresh user data from server');
        const authUser = await getUser();
        return authUser ? mapAuthUserToUser(authUser) : null;
      }).catch((err) => {
        setError(err instanceof Error ? err : new Error('Fetch user failed'));
        console.error('[@context:UserContext:fetchUserData] Error:', err);
        return null;
      });
    },
    [protectedFetch, initialUser],
  );

  // Use SWR for reactivity, but skip fetch if initialUser is provided
  const {
    data: user,
    isLoading: loading,
    mutate: mutateUser,
  } = useSWR(
    initialUser ? null : 'user-data', // No key means no fetch if initialUser exists
    () => {
      console.log('[@context:UserContext:useSWR] Fetch function executing');
      return fetchUserData(false);
    },
    {
      fallbackData: initialUser,
      revalidateOnMount: false, // Don't revalidate on mount
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 15000, // 15s deduping
      refreshInterval: 0, // Manual refresh only
    },
  );

  // Refresh user data explicitly
  const refreshUser = useCallback(async () => {
    console.log('[@context:UserContext:refreshUser] Called from:', new Error().stack);
    const freshUser = await fetchUserData(true);
    console.log(
      '[@context:UserContext:refreshUser] Got fresh data:',
      freshUser ? `${freshUser.id}` : 'null',
    );
    await mutateUser(freshUser, false);
    setError(null);
    return freshUser || null;
  }, [fetchUserData, mutateUser]);

  // Auth methods
  const signUp = useCallback(
    async (email: string, password: string, name: string, redirectUrl: string) => {
      try {
        const result = await signUpAction(email, password, name, redirectUrl);
        if (result.success) await refreshUser();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Sign up failed'));
        throw err;
      }
    },
    [refreshUser],
  );

  const signInWithOAuth = useCallback(
    async (provider: 'google' | 'github', redirectUrl: string) => {
      try {
        const result = await signInWithOAuthAction(provider, redirectUrl);
        if (result.success) await refreshUser();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('OAuth sign-in failed'));
        throw err;
      }
    },
    [refreshUser],
  );

  const signOut = useCallback(
    async (locale: string = 'en') => {
      try {
        // First clear all local caches
        await clearRequestCache();

        // Clear user state immediately
        await mutateUser(null, { revalidate: false });

        // Clear all localStorage cache
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('cached_user');
            localStorage.removeItem('cached_user_time');
            localStorage.removeItem('user-data-cache');

            // Clear any supabase-related items
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                localStorage.removeItem(key);
              }
            }
          }
        } catch (error) {
          console.error('[@context:UserContext:signOut] Error clearing localStorage:', error);
        }

        // Then sign out with the server
        const formData = new FormData();
        formData.append('locale', locale);

        // Call the server action to sign out
        const result = await signOutAction(formData);

        console.log('[@context:UserContext:signOut] Result:', result);

        return result;
      } catch (err) {
        console.error('[@context:UserContext:signOut] Error:', err);
        setError(err instanceof Error ? err : new Error('Sign out failed'));
        return { success: false, error: 'Sign out failed' };
      }
    },
    [mutateUser],
  );

  // User management methods
  const updateProfile = useCallback(
    async (formData: FormData) => {
      await updateProfileAction(formData);
      await refreshUser();
    },
    [refreshUser],
  );

  const updateRole = useCallback(
    async (role: Role) => {
      const formData = new FormData();
      formData.append('role', role);
      await updateProfile(formData);
    },
    [updateProfile],
  );

  const setSelectedTeam = useCallback(
    async (teamId: string) => {
      await setSelectedTeamAction(teamId);
      await refreshUser();
    },
    [refreshUser],
  );

  const clearCache = useCallback(async () => {
    await clearRequestCache();
    await mutateUser(null, { revalidate: true });
  }, [mutateUser]);

  const checkResourceLimit = useCallback(
    async (resourceType: string): Promise<ResourceLimit | null> => {
      if (!user?.teams?.length || !user?.selectedTeamId) return null;
      return { type: resourceType, current: 0, limit: 10, isUnlimited: false, canCreate: true }; // Placeholder
    },
    [user],
  );

  // Memoized context value
  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      updateProfile,
      refreshUser,
      updateRole,
      clearCache,
      isInitialized: true, // No async init needed
      signUp,
      signInWithOAuth,
      signOut,
      teams: user?.teams || [],
      selectedTeam: user?.teams?.find((team) => team.id === user.selectedTeamId) || null,
      teamMembers: user?.teamMembers || [],
      setSelectedTeam,
      checkResourceLimit,
    }),
    [
      user,
      loading,
      error,
      updateProfile,
      refreshUser,
      updateRole,
      clearCache,
      signUp,
      signInWithOAuth,
      signOut,
      setSelectedTeam,
      checkResourceLimit,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Hook to use the context
export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
}
