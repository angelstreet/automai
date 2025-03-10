'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
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
  AuthUser,
} from '@/app/actions/auth';
import { supabaseAuth } from '@/lib/supabase/auth';

// Unique key for our SWR cache
const AUTH_USER_KEY = 'auth-user';

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

export function useAuth() {
  const [error, setError] = useState<Error | null>(null);
  const isAuthPage = useRef<boolean>(false);
  
  // Use ref to track if we've forced a refresh
  const forcedRefresh = useRef<boolean>(false);
  
  // Check if we're on an auth page (login, signup, etc.)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      isAuthPage.current = path.includes('/login') || 
                           path.includes('/signup') || 
                           path.includes('/auth-redirect') ||
                           path.includes('/forgot-password');
    }
  }, []);
  
  // Create a fetcher function that can be used with SWR
  const fetchUserData = useCallback(async () => {
    if (isAuthPage.current && !forcedRefresh.current) {
      console.log('🔄 AUTH HOOK (SWR): Skipping fetch on auth page');
      return null;
    }
    
    console.log('🔄 AUTH HOOK (SWR): Fetching user data - VERSION 2025-03-10');
    
    // Debug cookie information on client side
    if (typeof document !== 'undefined') {
      console.log('🍪 Cookies present:', document.cookie
        .split(';')
        .map(c => c.trim().split('=')[0])
        .filter(name => name.startsWith('sb-') || name.includes('supabase'))
        .join(', '));
    }
    
    try {
      const data = await getCurrentUser();
      
      // Enhanced debug logging
      console.log('🔄 AUTH HOOK (SWR): User data received:', data);
      if (data) {
        console.log('🔄 AUTH HOOK (SWR): User ID:', data.id);
        console.log('🔄 AUTH HOOK (SWR): User email:', data.email);
      } else {
        console.log('🔄 AUTH HOOK (SWR): No user data received - not authenticated');
      }
      
      // Reset the forced refresh flag
      forcedRefresh.current = false;
      
      return data;
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      return null;
    }
  }, []);
  
  // Use SWR for data fetching with caching and deduplication
  const { data: user, isLoading: loading, mutate } = useSWR(
    AUTH_USER_KEY, 
    fetchUserData,
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

  // Add a refresh function that components can call to force a refresh of user data
  const refreshUser = useCallback(() => {
    console.log('🔄 AUTH HOOK (SWR): Forcing refresh of user data');
    forcedRefresh.current = true;
    return mutate();
  }, [mutate]);

  const handleSignOut = async (formData: FormData) => {
    try {
      console.log('🔐 LOGOUT - Starting logout process');
      await signOutAction(formData);
      
      // Clear user data immediately on sign out
      await mutate(null, false);
      
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
      
      // No need to refresh user data for password update
      return true;
    } catch (err) {
      console.error('🔐 PASSWORD ERROR:', err);
      setError(err instanceof Error ? err : new Error('Failed to update password'));
      return false;
    }
  };

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

  const handleSignInWithPassword = async (email: string, password: string) => {
    try {
      console.log('🔐 LOGIN - Starting password login process');
      setError(null);
      
      // Check cookies before login attempt
      if (typeof document !== 'undefined') {
        console.log('🔐 LOGIN - Cookies before login:', document.cookie
          .split(';')
          .map(c => c.trim().split('=')[0])
          .filter(name => name.startsWith('sb-') || name.includes('supabase'))
          .join(', '));
      }
      
      console.log('🔐 LOGIN - Calling signInWithPasswordAction');
      const result = await signInWithPasswordAction(email, password);
      
      console.log('🔐 LOGIN - Result received:', result.success ? 'SUCCESS' : 'FAILED');
      
      if (!result.success) {
        console.error('🔐 LOGIN ERROR:', result.error);
        setError(new Error(result.error || 'Failed to sign in'));
        return null;
      }
      
      // Check cookies after successful login
      if (typeof document !== 'undefined') {
        console.log('🔐 LOGIN - Cookies after login:', document.cookie
          .split(';')
          .map(c => c.trim().split('=')[0])
          .filter(name => name.startsWith('sb-') || name.includes('supabase'))
          .join(', '));
      }
      
      console.log('🔐 LOGIN - Session data:', result.data ? 'PRESENT' : 'MISSING');
      if (result.data?.session) {
        console.log('🔐 LOGIN - User ID:', result.data.session.user.id);
        console.log('🔐 LOGIN - User email:', result.data.session.user.email);
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

  const exchangeCodeForSession = useCallback(async () => {
    try {
      setError(null);
      
      console.log('🔑 EXCHANGE CODE - Starting code exchange process');
      
      // Debug current cookies before exchange
      if (typeof document !== 'undefined') {
        console.log('🔑 EXCHANGE CODE - Cookies before exchange:', document.cookie
          .split(';')
          .map(c => c.trim().split('=')[0])
          .filter(name => name.startsWith('sb-') || name.includes('supabase'))
          .join(', '));
      }
      
      // Use the auth action to handle the callback
      // This follows the three-layer architecture: client hook → server action → server db
      const url = typeof window !== 'undefined' ? window.location.href : '';
      console.log('🔑 EXCHANGE CODE - Calling handleAuthCallbackAction with URL:', url);
      
      const result = await handleAuthCallbackAction(url);
      
      console.log('🔑 EXCHANGE CODE - Result received:', result.success ? 'SUCCESS' : 'FAILED');
      
      if (!result.success) {
        console.error('🔑 EXCHANGE CODE ERROR:', result.error);
        setError(new Error(result.error || 'Failed to authenticate'));
        return { success: false, error: result.error };
      }
      
      // Debug cookies after successful exchange
      if (typeof document !== 'undefined') {
        console.log('🔑 EXCHANGE CODE - Cookies after exchange:', document.cookie
          .split(';')
          .map(c => c.trim().split('=')[0])
          .filter(name => name.startsWith('sb-') || name.includes('supabase'))
          .join(', '));
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

  // Return the authentication state and functions
  return {
    user,
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
  };
}