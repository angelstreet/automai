'use server';

import { supabaseAuth } from '@/lib/supabase/auth';
import { 
  AuthUser, 
  ProfileData 
} from '@/types/user';

/********************************************
 * CACHE MANAGEMENT
 ********************************************/

// Cache for user data to reduce redundant checks
let userCache: {
  data: any | null;
  timestamp: number;
  error: string | null;
} | null = null;

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Track if we've already logged a "No active session" error
let noSessionErrorLogged = false;

// Add a function to invalidate the cache when needed
export async function invalidateUserCache() {
  userCache = null;
  return { success: true };
}

/**
 * Get the current authenticated user
 */
export async function getUser(): Promise<AuthUser | null> {
  // Check if we have a valid cache
  const now = Date.now();
  if (userCache && (now - userCache.timestamp < CACHE_EXPIRATION)) {
    // Return cached data if available and not expired
    if (userCache.error) {
      // If the cached error is a session missing error, just return null
      if (userCache.error === 'No active session' || userCache.error === 'Auth session missing!') {
        return null;
      }
      throw new Error(userCache.error);
    }
    return userCache.data;
  }

  try {
    // Only log once per session for debugging
    console.log('[Auth] Using getUser from cache or fetch');
    const result = await supabaseAuth.getUser();
    
    // Update cache with a longer expiration for successful auth
    userCache = {
      data: result.success ? result.data : null,
      timestamp: Date.now(),
      error: result.success ? null : result.error || null
    };
    
    if (!result.success || !result.data) {
      // For "No active session" errors or "Auth session missing!" errors, just return null instead of throwing an error
      if (result.error === 'No active session' || result.error === 'Auth session missing!') {
        return null;
      }
      
      // Reset the flag when we get a new error
      if (result.error !== 'No active session' && result.error !== 'Auth session missing!') {
        noSessionErrorLogged = false;
      }
      
      throw new Error(result.error || 'Not authenticated');
    }
    
    // Reset the flag when successful
    noSessionErrorLogged = false;
    return result.data as AuthUser;
  } catch (error) {
    // Update cache with error
    userCache = {
      data: null,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    // Only log if we haven't logged this specific error before
    if (error instanceof Error && 
        (error.message === 'No active session' || error.message === 'Auth session missing!') && 
        !noSessionErrorLogged) {
      console.error('Error getting current user:', error);
      noSessionErrorLogged = true;
      return null; // Return null instead of throwing for session-related errors
    } else if (!(error instanceof Error) || 
              (error.message !== 'No active session' && error.message !== 'Auth session missing!')) {
      // Always log other types of errors
      console.error('Error getting current user:', error);
    }
    
    // Only throw for errors other than session-related errors
    if (error instanceof Error && 
        (error.message === 'No active session' || error.message === 'Auth session missing!')) {
      return null;
    }
    
    throw new Error('Failed to get current user');
  }
}

/**
 * Update Profile
 */
export async function updateProfile(formData: FormData | ProfileData) {
  try {
    // Extract data - handle both FormData and direct objects
    let name, locale, avatar_url, role;
    
    if (formData instanceof FormData) {
      name = formData.get('name') as string;
      locale = formData.get('locale') as string || 'en';
      avatar_url = formData.get('avatar_url') as string;
      role = formData.get('role') as string;
    } else {
      name = formData.name;
      locale = formData.locale || 'en';
      avatar_url = formData.avatar_url;
      role = (formData as any).role;
    }
    
    console.log('Updating profile with name:', name, 'and role:', role);
    
    // Invalidate user cache before updating profile
    await invalidateUserCache();
    
    // Prepare metadata object with all provided fields
    const metadata: Record<string, any> = {};
    if (name) metadata.name = name;
    if (locale) metadata.locale = locale;
    if (avatar_url) metadata.avatar_url = avatar_url;
    if (role) metadata.role = role;
    
    // Update user metadata
    const result = await supabaseAuth.updateProfile(metadata);
    
    if (!result.success) {
      console.error('Failed to update profile:', result.error);
      throw new Error(result.error || 'Failed to update profile');
    }
    
    console.log('Profile updated successfully');
    
    // Return success instead of redirecting
    // Let the client handle state updates
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }
}