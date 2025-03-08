'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  signOut, 
  updateProfile, 
  getCurrentUser,
  signUp as signUpAction,
  signInWithOAuth as signInWithOAuthAction,
  resetPasswordForEmail as resetPasswordAction,
  signInWithPassword as signInWithPasswordAction,
  updatePassword as updatePasswordAction,
  AuthUser,
  ProfileUpdateData
} from '@/app/actions/auth';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCurrentUser();
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSignOut = async (formData: FormData) => {
    try {
      await signOut(formData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign out'));
    }
  };

  const handleUpdateProfile = async (formData: FormData) => {
    try {
      await updateProfile(formData);
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
      
      await fetchUser(); // Refresh user data after sign in
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
    await fetchUser();
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
    refreshUser
  };
}