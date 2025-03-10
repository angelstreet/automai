'use client';

import React, { createContext, useContext, useCallback, useEffect, useRef, ReactNode, useState } from 'react';
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

// Unique keys for SWR cache
const USER_KEY = 'user-data';
const USER_ROLE_KEY = 'user-role';

// Default role
const DEFAULT_ROLE: Role = 'viewer';

// SWR configuration
const SWR_CONFIG = {
  revalidateOnFocus: false,     // Don't fetch on window focus
  revalidateIfStale: false,     // Don't fetch on stale data
  revalidateOnReconnect: false, // Don't fetch on reconnect
  dedupingInterval: 5000,       // Dedupe requests within 5 seconds
  refreshInterval: 0,           // Don't refresh automatically  
  shouldRetryOnError: false,    // Don't retry on error
  errorRetryCount: 0,           // No error retries
};

// Enhanced user type that includes role
interface EnhancedUser extends AuthUser {
  role?: Role;
}

interface UserContextType {
  // User state
  user: EnhancedUser | null;
  role: Role;
  loading: boolean;
  error: Error | null;
  
  // Auth operations
  signUp: (email: string, password: string, name: string, redirectUrl: string) => Promise<any>;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signInWithOAuth: (provider: 'google' | 'github', redirectUrl: string) => Promise<any>;
  signOut: (formData: FormData) => Promise<void>;
  resetPassword: (email: string, redirectUrl: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  updateProfile: (formData: FormData) => Promise<void>;
  
  // Role operations
  setRole: (role: Role) => void;
  
  // Refresh functions
  refreshUser: () => Promise<EnhancedUser | null>;
  
  // Other operations
  exchangeCodeForSession: () => Promise<{
    success: boolean;
    error?: string;
    redirectUrl?: string;
  }>;
}

const UserContext = createContext<UserContextType>({
  // User state
  user: null,
  role: DEFAULT_ROLE,
  loading: false,
  error: null,
  
  // Auth operations
  signUp: async () => null,
  signInWithPassword: async () => null,
  signInWithOAuth: async () => null,
  signOut: async () => {},
  resetPassword: async () => false,
  updatePassword: async () => false,
  updateProfile: async () => {},
  
  // Role operations
  setRole: () => {},
  
  // Refresh functions
  refreshUser: async () => null,
  
  // Other operations
  exchangeCodeForSession: async () => ({ success: false }),
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<Error | null>(null);
  const isAuthPage = useRef<boolean>(false);
  const forcedRefresh = useRef<boolean>(false);
  
  // Check if we're on an auth page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      isAuthPage.current = path.includes('/login') || 
                           path.includes('/signup') || 
                           path.includes('/auth-redirect') ||
                           path.includes('/forgot-password');
    }
  }, []);
  
  // Helper function to check if a role is valid
  const isValidRole = (role: string): role is Role => {
    return ['admin', 'tester', 'developer', 'viewer'].includes(role);
  };
  
  // Function to extract role from user object
  const getUserRoleFromUserObj = (user: AuthUser | null): Role | null => {
    if (!user) return null;
    
    // Look in user_metadata first (where it's typically stored)
    if (user.user_metadata) {
      // Extract role from user metadata (using any as a workaround)
      const metadataRole = (user.user_metadata as any).role;
      if (metadataRole && isValidRole(metadataRole)) {
        return metadataRole as Role;
      }
    }
    
    return null;
  };
  
  // Fetcher function for user data
  const fetchUserData = useCallback(async () => {
    if (isAuthPage.current && !forcedRefresh.current) {
      console.log('🔄 USER CONTEXT: Skipping fetch on auth page');
      return null;
    }
    
    console.log('🔄 USER CONTEXT: Fetching user data');
    
    try {
      const userData = await getCurrentUser();
      
      if (userData) {
        console.log('🔄 USER CONTEXT: User data received:', userData.id);
      } else {
        console.log('🔄 USER CONTEXT: No user data received - not authenticated');
      }
      
      // Reset the forced refresh flag
      forcedRefresh.current = false;
      
      return userData;
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      return null;
    }
  }, []);
  
  // Use SWR for user data fetching
  const { 
    data: user, 
    isLoading: loading, 
    mutate: mutateUser 
  } = useSWR(USER_KEY, fetchUserData, SWR_CONFIG);
  
  // Fetcher function for role data
  const fetchUserRole = useCallback(async () => {
    // Skip fetching if we don't have a user yet
    if (!user) {
      console.log('🔄 USER CONTEXT: Skipping role fetch - no user');
      return DEFAULT_ROLE;
    }
    
    console.log('🔄 USER CONTEXT: Fetching user role');
    
    // If we have user data with role, use it first
    const userRole = getUserRoleFromUserObj(user);
    if (userRole) {
      console.log('🔄 USER CONTEXT: Found role directly on user object:', userRole);
      
      // If admin role is found, prioritize it
      if (userRole === 'admin') {
        console.log('🔄 USER CONTEXT: Using admin role from user object');
        return 'admin' as Role;
      }
      
      console.log('🔄 USER CONTEXT: Using validated role from user object:', userRole);
      return userRole;
    }
    
    // Fetch from the database as fallback
    try {
      console.log('🔄 USER CONTEXT: Fetching role from database');
      const response = await getCurrentUserRoles();
      
      if (response.success && response.data && response.data.length > 0) {
        const dbRole = response.data[0].name;
        console.log('🔄 USER CONTEXT: Role from database:', dbRole);
        
        // If admin role is found in DB, prioritize it
        if (dbRole === 'admin') {
          console.log('🔄 USER CONTEXT: Using admin role from database');
          return 'admin' as Role;
        }
        
        // Ensure the role from DB is a valid Role type
        if (isValidRole(dbRole)) {
          console.log('🔄 USER CONTEXT: Using validated role from database:', dbRole);
          return dbRole as Role;
        }
      }
      
      // If we get here, use the default role
      console.log('🔄 USER CONTEXT: No valid role found, using default:', DEFAULT_ROLE);
      return DEFAULT_ROLE;
    } catch (error) {
      console.error('🔄 USER CONTEXT: Error fetching user role:', error);
      // Default to DEFAULT_ROLE if there's an error
      return DEFAULT_ROLE;
    }
  }, [user, getUserRoleFromUserObj, isValidRole]);
  
  // Use SWR for role data fetching
  const { 
    data: role = DEFAULT_ROLE, 
    mutate: mutateRole 
  } = useSWR(
    user ? USER_ROLE_KEY : null, // Only fetch when user is available
    fetchUserRole,
    SWR_CONFIG
  );
  
  // Listen for route changes to refresh user data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Force refresh when the URL changes (page navigation)
      const handleRouteChange = () => {
        console.log('Route changed, refreshing user data');
        refreshUser();
      };

      // Listen for pathname changes
      window.addEventListener('popstate', handleRouteChange);
      
      // Clean up
      return () => {
        window.removeEventListener('popstate', handleRouteChange);
      };
    }
  }, []);
  
  // Function to refresh user data
  const refreshUser = useCallback(async () => {
    console.log('🔄 USER CONTEXT: Forcing refresh of user data');
    forcedRefresh.current = true;
    const userData = await mutateUser();
    
    // Also refresh role data when user data is refreshed
    if (userData) {
      await mutateRole();
    }
    
    return userData;
  }, [mutateUser, mutateRole]);
  
  // Function to set role and update SWR cache
  const setRole = useCallback((newRole: Role) => {
    if (role !== newRole) {
      console.log('🔄 USER CONTEXT: Updating role to', newRole);
      mutateRole(newRole, false); // Update cache without revalidation
    }
  }, [role, mutateRole]);
  
  // Auth operation: Sign Out
  const handleSignOut = async (formData: FormData) => {
    try {
      console.log('🔐 LOGOUT - Starting logout process');
      await signOutAction(formData);
      
      // Clear user data immediately on sign out
      await mutateUser(null, false);
      
      // Get the locale from the form data
      const locale = formData.get('locale') as string || 'en';
      
      console.log('🔐 LOGOUT - Redirecting to login page');
      // Client-side redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = `/${locale}/login`;
      }
    } catch (err) {
      console.error('🔐 LOGOUT ERROR:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign out'));
    }
  };
  
  // Auth operation: Update Profile
  const handleUpdateProfile = async (formData: FormData) => {
    try {
      console.log('🔐 PROFILE - Updating user profile');
      await updateProfileAction(formData);
      
      // Refresh user data after profile update
      console.log('🔐 PROFILE - Refreshing user data after profile update');
      await refreshUser();
    } catch (err) {
      console.error('🔐 PROFILE ERROR:', err);
      setError(err instanceof Error ? err : new Error('Failed to update profile'));
    }
  };
  
  // Auth operation: Update Password
  const handleUpdatePassword = async (password: string) => {
    try {
      console.log('🔐 PASSWORD - Updating user password');
      setError(null);
      
      const result = await updatePasswordAction(password);
      
      if (!result.success) {
        console.error('🔐 PASSWORD ERROR:', result.error);
        setError(new Error(result.error || 'Failed to update password'));
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('🔐 PASSWORD ERROR:', err);
      setError(err instanceof Error ? err : new Error('Failed to update password'));
      return false;
    }
  };
  
  // Auth operation: Sign Up
  const handleSignUp = async (email: string, password: string, name: string, redirectUrl: string) => {
    try {
      console.log('🔐 SIGNUP - Starting sign up process');
      setError(null);
      
      const result = await signUpAction(email, password, name, redirectUrl);
      
      if (!result.success) {
        console.error('🔐 SIGNUP ERROR:', result.error);
        setError(new Error(result.error || 'Failed to sign up'));
        return null;
      }
      
      console.log('🔐 SIGNUP - Sign up successful');
      return result.data;
    } catch (err) {
      console.error('🔐 SIGNUP ERROR:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign up'));
      return null;
    }
  };
  
  // Auth operation: Sign In With Password
  const handleSignInWithPassword = async (email: string, password: string) => {
    try {
      console.log('🔐 LOGIN - Starting password login process');
      setError(null);
      
      const result = await signInWithPasswordAction(email, password);
      
      if (!result.success) {
        console.error('🔐 LOGIN ERROR:', result.error);
        setError(new Error(result.error || 'Failed to sign in'));
        return null;
      }
      
      // Force refresh user data after sign in
      console.log('🔐 LOGIN - Refreshing user data after successful auth');
      await refreshUser();
      return result.data;
    } catch (err) {
      console.error('🔐 LOGIN ERROR - Exception:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign in'));
      return null;
    }
  };
  
  // Auth operation: Sign In With OAuth
  const handleSignInWithOAuth = async (provider: 'google' | 'github', redirectUrl: string) => {
    try {
      console.log('🔐 OAUTH - Starting OAuth login process');
      setError(null);
      
      const result = await signInWithOAuthAction(provider, redirectUrl);
      
      if (!result.success) {
        console.error('🔐 OAUTH ERROR:', result.error);
        setError(new Error(result.error || 'Failed to sign in'));
        return null;
      }
      
      console.log('🔐 OAUTH - Sign in initiated successfully');
      return result.data;
    } catch (err) {
      console.error('🔐 OAUTH ERROR:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign in'));
      return null;
    }
  };
  
  // Auth operation: Reset Password
  const handleResetPassword = async (email: string, redirectUrl: string) => {
    try {
      console.log('🔐 RESET - Starting password reset process');
      setError(null);
      
      const result = await resetPasswordAction(email, redirectUrl);
      
      if (!result.success) {
        console.error('🔐 RESET ERROR:', result.error);
        setError(new Error(result.error || 'Failed to reset password'));
        return false;
      }
      
      console.log('🔐 RESET - Password reset email sent successfully');
      return true;
    } catch (err) {
      console.error('🔐 RESET ERROR:', err);
      setError(err instanceof Error ? err : new Error('Failed to reset password'));
      return false;
    }
  };
  
  // Auth operation: Exchange Code For Session
  const exchangeCodeForSession = useCallback(async () => {
    try {
      setError(null);
      
      console.log('🔑 EXCHANGE CODE - Starting code exchange process');
      
      const url = typeof window !== 'undefined' ? window.location.href : '';
      console.log('🔑 EXCHANGE CODE - Calling handleAuthCallbackAction with URL:', url);
      
      const result = await handleAuthCallbackAction(url);
      
      if (!result.success) {
        console.error('🔑 EXCHANGE CODE ERROR:', result.error);
        setError(new Error(result.error || 'Failed to authenticate'));
        return { success: false, error: result.error };
      }
      
      // Refresh user data after successful authentication
      console.log('🔑 EXCHANGE CODE - Refreshing user data after successful auth');
      await refreshUser();
      
      return { 
        success: true, 
        redirectUrl: result.redirectUrl 
      };
    } catch (err) {
      console.error('🔑 EXCHANGE CODE ERROR - Exception:', err);
      setError(err instanceof Error ? err : new Error('Authentication failed'));
      return { success: false, error: 'Authentication failed' };
    }
  }, [refreshUser]);
  
  // Create user with role for components
  const enhancedUser = user ? { ...user, role } : null;
  
  // Create a memoized context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    // User state
    user: enhancedUser,
    role,
    loading,
    error,
    
    // Auth operations
    signUp: handleSignUp,
    signInWithPassword: handleSignInWithPassword,
    signInWithOAuth: handleSignInWithOAuth,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    updatePassword: handleUpdatePassword,
    updateProfile: handleUpdateProfile,
    
    // Role operations
    setRole,
    
    // Refresh functions
    refreshUser,
    
    // Other operations
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