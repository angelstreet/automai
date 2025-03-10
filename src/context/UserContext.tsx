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

// SWR configuration - optimized for authenticated routes
const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
  revalidateOnReconnect: false,
  dedupingInterval: 5000,     // Cache requests for 5s to prevent duplicates
  refreshInterval: 0,
  shouldRetryOnError: true,
  errorRetryCount: 2,         // Allow 2 retries for network issues
  loadingTimeout: 4000,       // Timeout after 4s
  focusThrottleInterval: 5000 // Prevent rapid focus triggers
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
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: false,
  error: null,
  updateProfile: async () => {},
  refreshUser: async () => null,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);
  
  // Helper function to check if a role is valid
  const isValidRole = (role: string): role is Role => {
    return ['admin', 'tester', 'developer', 'viewer'].includes(role);
  };
  
  // Fetch user data only if we have a session
  const fetchUserData = useCallback(async (): Promise<AuthUser | null> => {
    try {
      // Only fetch if we're in an authenticated route (tenant layout)
      const userData = await getCurrentUser();
      if (!userData) {
        console.log('No user data found in session');
        return null;
      }
      return userData;
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      return null;
    }
  }, []);
  
  // Use SWR for user data with the no-revalidation config
  const { 
    data: user, 
    isLoading: loading, 
    mutate: mutateUser 
  } = useSWR<AuthUser | null>('user-data', fetchUserData, SWR_CONFIG);
  
  // Function to extract and normalize user data from Supabase user object
  const extractUserData = useCallback((userData: AuthUser | null): EnhancedUser | null => {
    if (!userData) return null;
    
    // Extract role - ONLY use user_role (not Supabase's role property)
    let userRole: Role;
    
    // First check if user_role exists at the root level
    if ((userData as any).user_role && isValidRole((userData as any).user_role)) {
      userRole = (userData as any).user_role as Role;
    }
    // If not at root, check in metadata
    else if (userData.user_metadata?.user_role && isValidRole(userData.user_metadata.user_role)) {
      userRole = userData.user_metadata.user_role as Role;
    }
    // If neither exists or is valid, use default
    else {
      userRole = DEFAULT_ROLE;
    }
    
    // Extract other metadata fields
    const tenantId = (userData as any).tenant_id || userData.user_metadata?.tenant_id || null;
    const tenantName = (userData as any).tenant_name || userData.user_metadata?.tenant_name || 'trial';
    
    // Extract or derive name
    const name = userData.name || 
                userData.user_metadata?.name || 
                userData.user_metadata?.full_name || 
                userData.email?.split('@')[0] || 
                'Guest';
    
    // Return enhanced user object with all extracted data
    const enhancedUser = {
      ...userData,
      user_role: userRole, // Renamed from 'role' to 'user_role' for clarity
      tenant_id: tenantId,
      tenant_name: tenantName,
      name
    } as EnhancedUser;
    
    // Only log when we successfully create an enhanced user
    console.log('User data processed:', { 
      id: enhancedUser.id,
      email: enhancedUser.email,
      role: enhancedUser.user_role,
      tenant: enhancedUser.tenant_name
    });
    
    return enhancedUser;
  }, []);
  
  // Get enhanced user with all metadata extracted
  const enhancedUser = user ? extractUserData(user) : null;
  
  // Simple user refresh - explicitly called when needed
  const refreshUser = useCallback(async (): Promise<EnhancedUser | null> => {
    try {
      // Explicitly call fetchUserData to get the latest user data
      // This avoids type issues with mutateUser's return value
      await mutateUser(); // Trigger revalidation
      const freshUserData = await fetchUserData();
      
      // Process the fresh user data
      return extractUserData(freshUserData);
    } catch (error) {
      console.error('Error refreshing user:', error);
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
  
  // Create context value
  const contextValue = React.useMemo(() => ({
    user: enhancedUser, // EnhancedUser already contains role, tenant_id, tenant_name
    loading,
    error,
    updateProfile: handleUpdateProfile,
    refreshUser,
  }), [
    enhancedUser,
    loading, 
    error,
    refreshUser
  ]);
  
  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);