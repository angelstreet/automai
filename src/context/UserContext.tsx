'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';
import useSWR from 'swr';
import { 
  signOut as signOutAction, 
  updateProfile as updateProfileAction, 
  getCurrentUser,
  signUp as signUpAction,
  signInWithOAuth as signInWithOAuthAction,
  resetPasswordForEmail as resetPasswordAction,
  signInWithPassword as signInWithPasswordAction,
  updatePassword as updatePasswordAction,
  handleAuthCallback as handleAuthCallbackAction,
} from '@/app/actions/user';
import { Role, AuthUser } from '@/types/user';

// Default role
const DEFAULT_ROLE: Role = 'viewer';

// SWR configuration - disable all automatic revalidation
const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
  revalidateOnReconnect: false,
  dedupingInterval: 5000,
  refreshInterval: 0,
  shouldRetryOnError: false,
  errorRetryCount: 0,
};

// Enhanced user type with all metadata fields
interface EnhancedUser extends Omit<AuthUser, 'tenant_id'> {
  role: Role;
  tenant_id?: string | null;
  tenant_name: string;
  name: string;
}

interface UserContextType {
  user: EnhancedUser | null;
  role: Role;
  loading: boolean;
  error: Error | null;
  signUp: (email: string, password: string, name: string, redirectUrl: string) => Promise<any>;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signInWithOAuth: (provider: 'google' | 'github', redirectUrl: string) => Promise<any>;
  signOut: (formData: FormData) => Promise<void>;
  resetPassword: (email: string, redirectUrl: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  updateProfile: (formData: FormData) => Promise<void>;
  refreshUser: () => Promise<EnhancedUser | null>;
  exchangeCodeForSession: () => Promise<{
    success: boolean;
    error?: string;
    redirectUrl?: string;
  }>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  role: DEFAULT_ROLE,
  loading: false,
  error: null,
  signUp: async () => null,
  signInWithPassword: async () => null,
  signInWithOAuth: async () => null,
  signOut: async () => {},
  resetPassword: async () => false,
  updatePassword: async () => false,
  updateProfile: async () => {},
  refreshUser: async () => null,
  exchangeCodeForSession: async () => ({ success: false }),
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);
  
  // Helper function to check if a role is valid
  const isValidRole = (role: string): role is Role => {
    return ['admin', 'tester', 'developer', 'viewer'].includes(role);
  };
  
  // Fetch user data once on mount
  const fetchUserData = useCallback(async (): Promise<AuthUser | null> => {
    try {
      return await getCurrentUser();
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
    
    // Extract role from user metadata
    const userRole = userData.user_metadata?.user_role && isValidRole(userData.user_metadata.user_role)
      ? userData.user_metadata.user_role as Role
      : DEFAULT_ROLE;
    
    // Extract other metadata fields
    const tenantId = userData.user_metadata?.tenant_id || null;
    const tenantName = userData.user_metadata?.tenant_name || 'trial';
    
    // Extract or derive name
    const name = userData.name || 
                userData.user_metadata?.name || 
                userData.user_metadata?.full_name || 
                userData.email?.split('@')[0] || 
                'Guest';
    
    // Return enhanced user object with all extracted data
    return {
      ...userData,
      role: userRole,
      tenant_id: tenantId,
      tenant_name: tenantName,
      name
    } as EnhancedUser; // Cast to EnhancedUser to ensure type safety
  }, []);
  
  // Get enhanced user with all metadata extracted
  // Ensure we're passing a valid AuthUser | null to extractUserData
  const enhancedUser = user ? extractUserData(user) : null;
  
  // Get role for context
  const role = enhancedUser?.role || DEFAULT_ROLE;
  

  
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
  

  
  // Auth operations
  const handleSignOut = async (formData: FormData) => {
    try {
      await signOutAction(formData);
      await mutateUser(null, false);
      
      const locale = formData.get('locale') as string || 'en';
      if (typeof window !== 'undefined') {
        window.location.href = `/${locale}/login`;
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign out'));
    }
  };
  
  const handleUpdateProfile = async (formData: FormData) => {
    try {
      await updateProfileAction(formData);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update profile'));
    }
  };
  
  const handleUpdatePassword = async (password: string) => {
    try {
      setError(null);
      const result = await updatePasswordAction(password);
      if (!result.success) {
        setError(new Error(result.error || 'Failed to update password'));
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update password'));
      return false;
    }
  };
  
  const handleSignUp = async (email: string, password: string, name: string, redirectUrl: string) => {
    try {
      setError(null);
      const result = await signUpAction(email, password, name, redirectUrl);
      if (!result.success) {
        setError(new Error(result.error || 'Failed to sign up'));
        return null;
      }
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign up'));
      return null;
    }
  };
  
  const handleSignInWithPassword = async (email: string, password: string) => {
    try {
      setError(null);
      const result = await signInWithPasswordAction(email, password);
      if (!result.success) {
        setError(new Error(result.error || 'Failed to sign in'));
        return null;
      }
      await refreshUser();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign in'));
      return null;
    }
  };
  
  const handleSignInWithOAuth = async (provider: 'google' | 'github', redirectUrl: string) => {
    try {
      setError(null);
      const result = await signInWithOAuthAction(provider, redirectUrl);
      if (!result.success) {
        setError(new Error(result.error || 'Failed to sign in'));
        return null;
      }
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign in'));
      return null;
    }
  };
  
  const handleResetPassword = async (email: string, redirectUrl: string) => {
    try {
      setError(null);
      const result = await resetPasswordAction(email, redirectUrl);
      if (!result.success) {
        setError(new Error(result.error || 'Failed to reset password'));
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reset password'));
      return false;
    }
  };
  
  const exchangeCodeForSession = useCallback(async () => {
    try {
      setError(null);
      const url = typeof window !== 'undefined' ? window.location.href : '';
      const result = await handleAuthCallbackAction(url);
      if (!result.success) {
        setError(new Error(result.error || 'Failed to authenticate'));
        return { success: false, error: result.error };
      }
      await refreshUser();
      return { success: true, redirectUrl: result.redirectUrl };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Authentication failed'));
      return { success: false, error: 'Authentication failed' };
    }
  }, [refreshUser]);
  

  

  
  // Create context value
  const contextValue = React.useMemo(() => ({
    user: enhancedUser,
    role,
    loading,
    error,
    signUp: handleSignUp,
    signInWithPassword: handleSignInWithPassword,
    signInWithOAuth: handleSignInWithOAuth,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    updatePassword: handleUpdatePassword,
    updateProfile: handleUpdateProfile,
    refreshUser,
    exchangeCodeForSession,
  }), [
    enhancedUser, 
    role, 
    loading, 
    error,
    refreshUser,
    exchangeCodeForSession
  ]);
  
  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);