'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Sign out the current user
 */
export async function signOut(formData: FormData) {
  // Get the cookie store
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  await supabase.auth.signOut();
  
  // Get locale from form data or default to 'en'
  const locale = formData.get('locale') as string || 'en';
  
  // Redirect to login page
  redirect(`/${locale}/login`); 
}

/**
 * Update the current user's profile
 */
export async function updateProfile(formData: FormData) {
  // Get the cookie store
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  
  const name = formData.get('name') as string;
  const locale = formData.get('locale') as string || 'en';
  
  // Update user metadata
  const { error } = await supabase.auth.updateUser({
    data: { name }
  });
  
  if (error) {
    // Handle error
    console.error('Error updating profile:', error.message);
    return { success: false, error: error.message };
  }
  
  // Redirect back to profile page
  redirect(`/${locale}/profile`);
} 