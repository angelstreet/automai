'use server';

import { supabaseAuth } from '@/lib/supabase/auth';

interface ProfileData {
  name?: string;
  avatar_url?: string;
}

export async function updateUserProfile(data: ProfileData): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await supabaseAuth.updateProfile(data);
    
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