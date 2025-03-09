'use client';
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

  const updateProfile = useCallback(async (data: ProfileData | FormData) => {
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
      console.log('🔄 PROFILE HOOK - UPDATED 2025-03-09: Updating profile with data:', 
        data instanceof FormData 
        ? Object.fromEntries(data.entries()) 
        : data);
      
      // Handle either FormData or direct object
      let profileData;
      if (data instanceof FormData) {
        profileData = {
          name: data.get('name') as string,
          avatar_url: data.get('avatar_url') as string || undefined
        };
        await updateUserProfile(profileData);
      } else {
        profileData = data;
        await updateUserProfile(data);
      }
      
      console.log('🔄 PROFILE HOOK: Profile updated with name:', profileData.name);
      console.log('🔄 PROFILE HOOK: Forcing user data refresh...');
      
      // Force refresh user data
      await refreshUser();
      
      console.log('🔄 PROFILE HOOK: User data refreshed after profile update');
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