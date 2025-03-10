'use server';

import { supabaseAuth } from '@/lib/supabase/auth';

interface ProfileData {
  name?: string;
  avatar_url?: string;
}

export async function updateUserProfile(data: ProfileData): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Updating user profile with data:', data);
    
    // Make sure we have valid data
    if (!data.name && !data.avatar_url) {
      return { success: false, error: 'No data provided for update' };
    }
    
    // Get current user to compare values
    const currentUser = await supabaseAuth.getUser();
    if (!currentUser.success || !currentUser.data) {
      return { success: false, error: 'Could not retrieve current user data' };
    }
    
    // Check if there are actual changes
    const user = currentUser.data;
    const currentName = user.name || user.user_metadata?.name || '';
    const currentAvatar = user.image || user.user_metadata?.avatar_url || '';
    
    // Skip update if no actual changes
    if ((data.name && data.name === currentName) && 
        (data.avatar_url && data.avatar_url === currentAvatar)) {
      console.log('No changes detected, skipping profile update');
      return { success: true };
    }
    
    // Build user_metadata object
    const metadata: Record<string, any> = {};
    if (data.name) metadata.name = data.name;
    if (data.avatar_url) metadata.avatar_url = data.avatar_url;
    
    // Call the Supabase auth service to update user metadata
    const result = await supabaseAuth.updateProfile(metadata);
    
    // Log result for debugging
    if (result.success) {
      console.log('Profile updated successfully');
    } else {
      console.error('Failed to update profile:', result.error);
    }
    
    return { 
      success: result.success, 
      error: result.error || undefined 
    };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

export async function getUserProfile(): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const result = await supabaseAuth.getUser();
    
    return { 
      success: result.success, 
      error: result.error || undefined,
      data: result.data
    };
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message || 'Failed to get user profile' };
  }
} 