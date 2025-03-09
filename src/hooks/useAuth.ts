'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
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

// Increase cache time to 30 minutes to reduce API calls
const AUTH_CACHE_TIME = 30 * 60 * 1000;

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Add refs to track last fetch time and if we're on a login page
  const lastFetchTime = useRef<number>(0);
  const isAuthPage = useRef<boolean>(false);
  const hasInitialized = useRef<boolean>(false);
  
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

  const fetchUser = useCallback(async (force = false) => {
    // Only skip fetching on auth pages if we're not forcing it
    // This ensures we still check auth state when needed
    if (isAuthPage.current && !force) {
      console.log('🔄 AUTH HOOK: Skipping fetch on auth page');
      setLoading(false);
      return;
    }
    
    // Check if we've fetched recently and can use cached data
    const now = Date.now();
    if (!force && now - lastFetchTime.current < AUTH_CACHE_TIME && user !== undefined) {
      console.log('🔄 AUTH HOOK: Using cached user data');
      setLoading(false);
      return;
    }
    
    console.log('🔄 AUTH HOOK: Fetching user data - VERSION 2025-03-09');
    
    try {
      setLoading(true);
      setError(null);
      const data = await getCurrentUser();
      
      // Enhanced debug logging
      console.log('🔄 AUTH HOOK: User data received:', data);
      if (data) {
        console.log('🔄 AUTH HOOK: User name from data:', data.name);
        console.log('🔄 AUTH HOOK: User metadata:', data.user_metadata);
        console.log('🔄 AUTH HOOK: Name in metadata:', data.user_metadata?.name);
      }
      
      setUser(data);
      lastFetchTime.current = now;
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch user on initial load and ensure it only runs once
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Always fetch user data on initial load, regardless of page type
      fetchUser(true);
    }
  }, [fetchUser]);

  // Add an effect to refresh the user data whenever the pathname changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Force refresh when the URL changes (page navigation)
      const handleRouteChange = () => {
        console.log('Route changed, refreshing user data');
        fetchUser(true);
      };

      // Listen for pathname changes
      window.addEventListener('popstate', handleRouteChange);
      
      // Clean up
      return () => {
        window.removeEventListener('popstate', handleRouteChange);
      };
    }
  }, [fetchUser]);

  const handleSignOut = async (formData: FormData) => {
    try {
      await signOutAction(formData);
      // Clear user data immediately on sign out
      setUser(null);
      lastFetchTime.current = 0;
      
      // Get the locale from the form data
      const locale = formData.get('locale') as string || 'en';
      
      // Client-side redirect to login page
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
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update profile'));
    }
  };

  const handleUpdatePassword = async (password: string) => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string, name: string, redirectUrl: string) => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithPassword = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPasswordAction(email, password);
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to sign in'));
        return null;
      }
      
      // Force refresh user data after sign in
      await fetchUser(true);
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign in'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithOAuth = async (provider: 'google' | 'github', redirectUrl: string) => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email: string, redirectUrl: string) => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // Add a refresh function that components can call to force a refresh of user data
  const refreshUser = useCallback(() => {
    return fetchUser(true);
  }, [fetchUser]);

  const exchangeCodeForSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the auth action to handle the callback
      // This follows the three-layer architecture: client hook → server action → server db
      const url = typeof window !== 'undefined' ? window.location.href : '';
      const result = await handleAuthCallbackAction(url);
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to authenticate'));
        return { success: false, error: result.error };
      }
      
      // Refresh user data after successful authentication
      await fetchUser();
      
      return { 
        success: true, 
        redirectUrl: result.redirectUrl 
      };
    } catch (err) {
      console.error('Error in authentication:', err);
      setError(err instanceof Error ? err : new Error('Authentication failed'));
      return { success: false, error: 'Authentication failed' };
    } finally {
      setLoading(false);
    }
  }, [fetchUser]);

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
  };
}