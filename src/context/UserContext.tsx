'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
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
  if (!authUser.tenant_id) {
    throw new Error('Missing tenant_id in user data');
  }
  
  if (!authUser.tenant_name) {
    throw new Error('Missing tenant_name in user data');
  }

  return {
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name || authUser.email.split('@')[0] || 'Guest',
    role: (authUser.user_metadata?.role as Role) || 'viewer',
    tenant_id: authUser.tenant_id,
    tenant_name: authUser.tenant_name,
    avatar_url: authUser.user_metadata?.avatar_url || '',
    user_metadata: authUser.user_metadata,
  };
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const isProduction = process.env.NODE_ENV === 'production';
  const [error, setError] = useState<Error | null>(null);

  // Add a flag to track client-side rendering
  const [isClient, setIsClient] = useState(false);

  // Set isClient once the component mounts on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch user data with better SSR handling
  const fetchUserData = async (): Promise<User | null> => {
    try {
      // On the server, return null to avoid hydration mismatches
      if (typeof window === 'undefined') {
        return null;
      }

      // Try to get cached user from localStorage
      if (typeof window !== 'undefined') {
        const cachedUser = localStorage.getItem('cached_user');
        if (cachedUser) {
          try {
            return JSON.parse(cachedUser);
          } catch (e) {
            // Invalid JSON, ignore and continue
            console.error('Invalid cached user data:', e);
            localStorage.removeItem('cached_user');
          }
        }
      }

      // Fetch fresh user data from the server
      const authUser = await getUser();
      if (!authUser) return null;

      try {
        // Map to our User type - will throw if tenant data is missing
        const user = mapAuthUserToUser(authUser);
        
        // Cache the user in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('cached_user', JSON.stringify(user));
        }
        
        return user;
      } catch (error) {
        console.error('User data mapping error:', error);
        setError(error instanceof Error ? error : new Error('Invalid user data'));
        return null;
      }

    } catch (error) {
      console.error('Error fetching user:', error);
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
      revalidateOnFocus: false, // Don't revalidate on focus since we're using it for debug
      revalidateOnReconnect: false, // Don't revalidate on reconnect since we're using it for debug
      dedupingInterval: 60000, // Dedupe requests within 1 minute
      keepPreviousData: true, // Keep previous data while revalidating
      loadingTimeout: 3000, // Consider slow after 3 seconds
      onSuccess: (data) => {
        console.log('SWR cache success:', data);
      },
    },
  );

  // Function to clear all caches
  const clearCache = useCallback(async () => {
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cached_user');
    }
    // Clear SWR cache and set user to null
    await mutateUser(null, false);
  }, [mutateUser]);

  const refreshUser = useCallback(async () => {
    try {
      const freshUserData = await mutateUser();
      return freshUserData || null;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return user;
    }
  }, [mutateUser, user]);

  const handleUpdateProfile = async (formData: FormData) => {
    try {
      await updateProfileAction(formData);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update profile'));
    }
  };

  const handleRoleUpdate = async (role: Role) => {
    try {
      if (!user?.id) throw new Error('No user found');
      const formData = new FormData();
      formData.append('role', role);
      await handleUpdateProfile(formData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update role'));
      throw err;
    }
  };

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
