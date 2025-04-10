/**
 * Authentication Service
 * Handles authentication and user sessions
 */
import userDb from '@/lib/db/userDb';
import { createClient } from '@/lib/supabase/server';
import { AuthResult } from '@/types/service/sessionServiceType';
import { User } from '@/types/service/userServiceType';

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult<User>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Authentication failed' };
    }

    // Get the user profile
    const userResponse = await userDb.getUserById(data.user.id);

    if (!userResponse.success || !userResponse.data) {
      return { success: false, error: userResponse.error || 'Failed to get user profile' };
    }

    return { success: true, data: userResponse.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Authentication failed' };
  }
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(
  provider: 'github' | 'google',
  redirectUrl: string,
): Promise<AuthResult<string>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Return the URL to redirect to
    return { success: true, data: data.url };
  } catch (error: any) {
    return { success: false, error: error.message || 'OAuth authentication failed' };
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  userData: Partial<User>,
): Promise<AuthResult<User>> {
  try {
    const supabase = await createClient();

    // First, create the auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          avatar_url: userData.avatar_url,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Sign up failed' };
    }

    // Then, create the user profile
    const userResponse = await userDb.createUser({
      id: data.user.id,
      email: data.user.email,
      ...userData,
    });

    if (!userResponse.success) {
      return { success: false, error: userResponse.error };
    }

    return { success: true, data: userResponse.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Sign up failed' };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResult<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Sign out failed' };
  }
}

/**
 * Reset password with email
 */
export async function resetPasswordWithEmail(
  email: string,
  redirectUrl: string,
): Promise<AuthResult<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Password reset failed' };
  }
}

/**
 * Update password
 */
export async function updatePassword(password: string): Promise<AuthResult<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Password update failed' };
  }
}

/**
 * Get the current session
 */
export async function getSession(): Promise<AuthResult<any>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.session) {
      return { success: false, error: 'No active session' };
    }

    return { success: true, data: data.session };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get session' };
  }
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<AuthResult<User>> {
  try {
    const sessionResult = await getSession();

    if (!sessionResult.success || !sessionResult.data) {
      return { success: false, error: sessionResult.error || 'No active session' };
    }

    const userId = sessionResult.data.user.id;

    // Get the user profile
    const userResponse = await userDb.getUserById(userId);

    if (!userResponse.success || !userResponse.data) {
      return { success: false, error: userResponse.error || 'Failed to get user profile' };
    }

    return { success: true, data: userResponse.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get current user' };
  }
}

// Default export for all auth service functions
const authService = {
  signInWithEmail,
  signInWithOAuth,
  signUpWithEmail,
  signOut,
  resetPasswordWithEmail,
  updatePassword,
  getSession,
  getCurrentUser,
};

export default authService;
