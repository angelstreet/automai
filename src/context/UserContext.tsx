'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';
import useSWR from 'swr';
import { 
  updateProfile as updateProfileAction, 
  getCurrentUser
} from '@/app/actions/user';
import { Role, AuthUser } from '@/types/user';

// Default role
const DEFAULT_ROLE: Role = 'viewer';

// SWR configuration - optimized to reduce unnecessary fetches
const SWR_CONFIG = {
  revalidateOnFocus: false,    // Disable auto-revalidation on focus
  revalidateIfStale: false,    // Disable background revalidation
  revalidateOnReconnect: false,// Disable revalidation on reconnect
  dedupingInterval: 30000,     // Increase deduping window to 30s
  refreshInterval: 0,          // Don't auto-refresh
  shouldRetryOnError: true,    // Retry on network errors
  errorRetryCount: 2,          // Allow 2 retries for network issues
  loadingTimeout: 4000,        // Timeout after 4s
  focusThrottleInterval: 30000,// Increase focus throttle to 30s
  keepPreviousData: true       // Keep showing old data while fetching new data
};

// Enhanced user type with all metadata fields
interface EnhancedUser extends Omit<AuthUser, 'tenant_id'> {
  user_role: Role; // Renamed from 'role' for clarity and consistency
  tenant_id?: string | null;
  tenant_name: string;
  name: string;
}

interface UserContextType {
  user: EnhancedUser | null; // EnhancedUser already contains role, tenant_id, tenant_name
  loading: boolean;
  error: Error | null;
  updateProfile: (formData: FormData) => Promise<void>;
  refreshUser: () => Promise<EnhancedUser | null>;
  updateRole: (role: Role) => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: false,
  error: null,
  updateProfile: async () => {},
  refreshUser: async () => null,
  updateRole: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  console.log('UserContext - Provider mounting');
  const [error, setError] = useState<Error | null>(null);

  // Log when user data changes
  React.useEffect(() => {
    console.log('UserContext - User data changed in SWR:', { user });
  }, [user]);
  
  // Helper function to check if a role is valid
  const isValidRole = (role: string): role is Role => {
    return ['admin', 'tester', 'developer', 'viewer'].includes(role);
  };
  
  // Fetch user data only if we have a session
  const fetchUserData = useCallback(async (): Promise<AuthUser | null> => {
    console.log('UserContext - Fetching user data');
    try {
      // Check for existing session before making API call
      const userData = await getCurrentUser();
      
      // Early return if no session/user data
      if (!userData) {
        console.log('UserContext - No user data found');
        return null;
      }
      
      console.log('UserContext - User data fetched:', userData);
      return userData;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      return null;
    }
  }, []);
  
  // Use SWR for user data with optimized config and error boundary
  const { 
    data: user, 
    isLoading: loading, 
    mutate: mutateUser,
    error: swrError
  } = useSWR<AuthUser | null>(
    'user-data', 
    fetchUserData, 
    {
      ...SWR_CONFIG,
      onError: (err) => {
        setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      },
      onSuccess: () => {
        setError(null);
      }
    }
  );
  
  // Function to extract and normalize user data from Supabase user object
  // No need for useCallback since this doesn't depend on any props or state
  const extractUserData = (userData: AuthUser | null): EnhancedUser | null => {
    if (!userData) return null;
    
    // Extract role - ONLY use user_role (not Supabase's role property)
    console.log('Raw userData for role extraction:', {
      direct_user_role: (userData as any).user_role,
      metadata_user_role: userData.user_metadata?.user_role,
      full_metadata: userData.user_metadata
    });
    
    const userRole = (
      ((userData as any).user_role && isValidRole((userData as any).user_role) && (userData as any).user_role) ||
      (userData.user_metadata?.user_role && isValidRole(userData.user_metadata.user_role) && userData.user_metadata.user_role) ||
      DEFAULT_ROLE
    ) as Role;
    
    console.log('Extracted userRole:', userRole);
    
    // Extract other metadata fields with fallbacks
    const tenantId = (userData as any).tenant_id || userData.user_metadata?.tenant_id || null;
    const tenantName = (userData as any).tenant_name || userData.user_metadata?.tenant_name || 'trial';
    const name = userData.name || 
                userData.user_metadata?.name || 
                userData.user_metadata?.full_name || 
                userData.email?.split('@')[0] || 
                'Guest';
    
    // Return enhanced user object with all extracted data
    const enhancedUser = {
      ...userData,
      user_role: userRole,
      tenant_id: tenantId,
      tenant_name: tenantName,
      name
    } as EnhancedUser;
    
    console.log('Final enhanced user data:', enhancedUser);
    return enhancedUser;
  };
  
  // Get enhanced user with all metadata extracted
  const enhancedUser = user ? extractUserData(user) : null;
  
  // Optimized user refresh with error handling and caching
  const refreshUser = useCallback(async (): Promise<EnhancedUser | null> => {
    try {
      // Use SWR's mutate to handle revalidation and caching
      const freshUserData = await mutateUser(
        // Fetch function
        async () => {
          const data = await fetchUserData();
          return data;
        },
        // SWR options for this specific mutation
        {
          revalidate: true,
          populateCache: true,
          rollbackOnError: true
        }
      );
      
      // Process and return the fresh user data
      return freshUserData ? extractUserData(freshUserData) : null;
    } catch (error) {
      // Keep existing user data on error
      return enhancedUser;
    }
  }, [mutateUser, fetchUserData, extractUserData, enhancedUser]);
  

  
  // Auth operations have been moved to server actions in /app/actions/auth.ts
  
  const handleUpdateProfile = async (formData: FormData) => {
    try {
      await updateProfileAction(formData);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update profile'));
    }
  };
  
  // Auth callback handling has been moved to server actions in /app/actions/auth.ts
  
  // Handle role update
  const handleRoleUpdate = async (role: Role) => {
    try {
      if (!user?.id) throw new Error('No user found');
      
      // Update the user's role using updateUserProfile
      const formData = new FormData();
      formData.append('user_role', role);
      await handleUpdateProfile(formData);
      
      // Refresh user data to get updated role
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update role'));
      throw err;
    }
  };

  // Create context value
  const contextValue = React.useMemo(() => ({
    user: enhancedUser, // EnhancedUser already contains role, tenant_id, tenant_name
    loading,
    error,
    updateProfile: handleUpdateProfile,
    refreshUser,
    updateRole: handleRoleUpdate,
  }), [
    enhancedUser,
    loading, 
    error,
    refreshUser,
    handleRoleUpdate
  ]);
  
  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);