'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdateData = {
  name?: string;
  locale?: string;
};

/**
 * Sign out the current user
 */
export async function signOut(formData: FormData) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    await supabase.auth.signOut();
    
    // Get locale from form data or default to 'en'
    const locale = formData.get('locale') as string || 'en';
    
    // Redirect to login page
    redirect(`/${locale}/login`);
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out');
  }
}

/**
 * Update the current user's profile
 */
export async function updateProfile(formData: FormData) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const name = formData.get('name') as string;
    const locale = formData.get('locale') as string || 'en';
    
    // Update user metadata
    const { error } = await supabase.auth.updateUser({
      data: { name }
    });
    
    if (error) {
      console.error('Error updating profile:', error.message);
      throw new Error('Failed to update profile');
    }
    
    // Redirect back to profile page
    redirect(`/${locale}/profile`);
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error('Not authenticated');
    }
    
    return user as AuthUser;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw new Error('Failed to get current user');
  }
} 