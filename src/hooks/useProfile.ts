import { useState, useCallback } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile } from '@/app/actions/profile';

interface ProfileData {
  name?: string;
  avatar_url?: string;
}

export function useProfile() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const updateProfile = useCallback(async (data: ProfileData) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update your profile',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setIsUpdating(true);
      await updateUserProfile(data);
      await refreshUser();
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [user, refreshUser, toast]);

  return {
    updateProfile,
    isUpdating,
  };
} 