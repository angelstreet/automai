import { createClient } from '@/lib/supabase/client';

interface ProfileData {
  name?: string;
  avatar_url?: string;
}

export async function updateUserProfile(data: ProfileData) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      ...data
    }
  });

  if (error) throw error;
  return true;
}

export async function getUserProfile() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
} 