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

// Cache time in milliseconds (5 minutes)
const AUTH_CACHE_TIME = 5 * 60 * 1000;

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Add refs to track last fetch time and if we're on a login page
  const lastFetchTime = useRef<number>(0);
  const isAuthPage = useRef<boolean>(false);
  
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
    // Skip fetching on auth pages unless forced
    if (isAuthPage.current && !force) {
      setLoading(false);
      return;
    }
    
    // Check if we've fetched recently and can use cached data
    const now = Date.now();
    if (!force && now - lastFetchTime.current < AUTH_CACHE_TIME && user !== undefined) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await getCurrentUser();
      setUser(data);
      lastFetchTime.current = now;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Only fetch user on initial load
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSignOut = async (formData: FormData) => {
    try {
      await signOutAction(formData);
      // Clear user data immediately on sign out
      setUser(null);
      lastFetchTime.current = 0;
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

  const refreshUser = useCallback(async () => {
    await fetchUser(true);
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

  return {
    user,
    loading,
    error,
    signOut: handleSignOut,
    updateProfile: handleUpdateProfile,
    updatePassword: handleUpdatePassword,
    signUp: handleSignUp,
    signInWithPassword: handleSignInWithPassword,
    signInWithOAuth: handleSignInWithOAuth,
    resetPassword: handleResetPassword,
    refreshUser,
    exchangeCodeForSession
  };
}