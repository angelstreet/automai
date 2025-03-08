'use server';

import { createClient } from '@/lib/supabase/server';

import { redirect } from 'next/navigation';

/**
 * Sign out the current user
 */
export async function signOut(formData: FormData) {
  const cookieStore = cookies();
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
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const name = formData.get('name') as string;
  const locale = formData.get('locale') as string || 'en';
  
  const { error } = await supabase.auth.updateUser({
    data: { name }
  });
  
  if (error) {
    // Redirect back with error
    redirect(`/${locale}/profile?error=${encodeURIComponent(error.message)}`);
  }
  
  // Redirect back to profile page
  redirect(`/${locale}/profile?success=Profile updated`);
} 