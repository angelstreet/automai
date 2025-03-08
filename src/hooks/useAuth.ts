'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  signOut, 
  updateProfile, 
  getCurrentUser,
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
      setUser(null);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to sign out');
    }
  };

  const handleUpdateProfile = async (formData: FormData) => {
    try {
      await updateProfile(formData);
      // Refresh user data after profile update
      await fetchUser();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update profile');
    }
  };

  return {
    user,
    loading,
    error,
    signOut: handleSignOut,
    updateProfile: handleUpdateProfile,
    refresh: fetchUser
  };
}