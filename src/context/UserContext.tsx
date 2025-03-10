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
  getCurrentUserRoles
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

// Keep original user type with role to maintain compatibility
interface EnhancedUser extends AuthUser {
  role?: Role;
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
  setRole: (role: Role) => void;
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
  setRole: () => {},
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
  const fetchUserData = useCallback(async () => {
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
  } = useSWR('user-data', fetchUserData, SWR_CONFIG);
  
  // Get role from DB when user is available
  const fetchUserRole = useCallback(async () => {
    if (!user) return DEFAULT_ROLE;
    
    try {
      // Check if user_role is in user_metadata
      if (user.user_metadata?.user_role && isValidRole(user.user_metadata.user_role)) {
        return user.user_metadata.user_role as Role;
      }
      
      // Otherwise get from API
      const response = await getCurrentUserRoles();
      if (response.success && response.data && response.data.length > 0) {
        const dbRole = response.data[0].name;
        if (isValidRole(dbRole)) return dbRole as Role;
      }
      
      return DEFAULT_ROLE;
    } catch (error) {
      return DEFAULT_ROLE;
    }
  }, [user]);
  
  // Use SWR for role with the no-revalidation config
  const { 
    data: role = DEFAULT_ROLE, 
    mutate: mutateRole 
  } = useSWR(
    user ? 'user-role' : null, 
    fetchUserRole,
    SWR_CONFIG
  );
  
  // Simple user refresh - explicitly called when needed
  const refreshUser = useCallback(async () => {
    try {
      const userData = await mutateUser();
      if (userData) await mutateRole();
      return userData ? { ...userData, role } : null;
    } catch (error) {
      return user ? { ...user, role } : null;
    }
  }, [mutateUser, mutateRole, user, role]);
  
  // Set role - just updates the cache
  const setRole = useCallback((newRole: Role) => {
    if (role !== newRole) mutateRole(newRole, false);
  }, [role, mutateRole]);
  
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
  
  // Add role and ensure name is available for component compatibility
  const enhancedUser = user ? { 
    ...user, 
    role,
    // Ensure name is directly available on user object (for simpler component access)
    name: user.name || 
          user.user_metadata?.name || 
          user.user_metadata?.full_name || 
          user.email?.split('@')[0] || 
          'Guest',
    // Ensure tenant_name is available (needed by login page)
    tenant_name: user.user_metadata?.tenant_name || 'trial'
  } : null;
  
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
    setRole,
    refreshUser,
    exchangeCodeForSession,
  }), [
    enhancedUser, 
    role, 
    loading, 
    error,
    setRole,
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