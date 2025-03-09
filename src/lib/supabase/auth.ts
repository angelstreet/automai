import { cookies } from 'next/headers';
import { createClient } from './server';
import db from './db';

// Flag to track if we've already logged auth session missing errors
let authSessionMissingErrorLogged = false;

// Check if we're in an environment where Supabase auth is available
const isUsingSupabase = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

// Types for Supabase auth
export interface UserSession {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string;
  tenant_id?: string;
  tenant_name?: string | null;
}

export interface SessionData {
  user: UserSession;
  accessToken: string;
  expires: string;
}

export interface AuthResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Centralized Supabase Authentication Service
 * This combines functionality from both src/auth.ts and src/lib/services/supabase-auth.ts
 */
export const supabaseAuth = {
  /**
   * Get the current session from Supabase
   */
  async getSession(): Promise<AuthResult<SessionData>> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      // Get cookies and create client
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Try to get the session
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }

      if (!data.session) {
        return {
          success: false,
          error: 'No active session',
        };
      }

      // Extract user data
      const user = data.session.user;
      const userData: UserSession = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        image: user.user_metadata?.avatar_url,
        role: user.user_metadata?.role || 'user',
        tenant_id: user.user_metadata?.tenant_id,
        tenant_name: user.user_metadata?.tenant_name,
      };

      return {
        success: true,
        data: {
          user: userData,
          accessToken: data.session.access_token,
          expires: data.session.expires_at?.toString() || '',
        },
      };
    } catch (error) {
      console.error('Error in getSession:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Extract session from Authorization header
   */
  async extractSessionFromHeader(authHeader: string | null): Promise<AuthResult<SessionData>> {
    if (!isUsingSupabase() || !authHeader) {
      return {
        success: false,
        error: !authHeader ? 'No authorization header provided' : 'Supabase auth not available',
      };
    }

    try {
      // Create a Supabase client
      const supabase = await createClient();

      // Get the user from the token
      const token = authHeader.replace('Bearer ', '');
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        return {
          success: false,
          error: error?.message || 'Invalid token',
        };
      }

      const user = data.user;
      const userData: UserSession = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        image: user.user_metadata?.avatar_url,
        role: user.user_metadata?.role || 'user',
        tenant_id: user.user_metadata?.tenant_id,
        tenant_name: user.user_metadata?.tenant_name,
      };

      return {
        success: true,
        data: {
          user: userData,
          accessToken: token,
          expires: '', // We don't have expiry info from getUser
        },
      };
    } catch (error) {
      console.error('Error extracting session from header:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get the current user
   */
  async getUser(): Promise<AuthResult<UserSession>> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      // Get cookies and create client
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Use getUser instead of getSession for better security
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        // Don't log Auth session missing errors as they're expected on login pages
        if (error.message !== 'Auth session missing!' || !authSessionMissingErrorLogged) {
          if (error.message === 'Auth session missing!') {
            // Only log this error once per session
            authSessionMissingErrorLogged = true;
          }
          
          if (error.message !== 'Auth session missing!') {
            console.error('Error getting user:', error);
          }
        }
        
        return { 
          success: false, 
          error: error.message 
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'No authenticated user',
        };
      }

      // Extract user data
      const user = data.user;
      const userData: UserSession = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        image: user.user_metadata?.avatar_url,
        role: user.user_metadata?.role || 'user',
        tenant_id: user.user_metadata?.tenant_id,
        tenant_name: user.user_metadata?.tenant_name,
      };

      return {
        success: true,
        data: userData,
      };
    } catch (error) {
      console.error('Error in getUser:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Check if the user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const sessionResult = await this.getSession();
    return sessionResult.success;
  },

  /**
   * Sign in with email and password
   */
  async signInWithPassword(email: string, password: string): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data.session,
      };
    } catch (error) {
      console.error('Error signing in:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, options?: { 
    redirectTo?: string; 
    data?: Record<string, any>; 
  }): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options
      });

      if (error) {
        console.error('Error signing up:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error signing up:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign up',
      };
    }
  },

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(provider: 'google' | 'github' | 'gitlab', options?: { 
    redirectTo?: string;
  }): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options
      });

      if (error) {
        console.error('Error signing in with OAuth:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error signing in with OAuth:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign in with OAuth',
      };
    }
  },

  /**
   * Handle OAuth callback
   * This is part of the server DB layer that directly interacts with Supabase
   */
  async handleOAuthCallback(code: string): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Error exchanging code for session:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error handling OAuth callback:', error);
      return {
        success: false,
        error: error.message || 'Failed to process OAuth callback',
      };
    }
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Error signing out:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Error signing out:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign out',
      };
    }
  },

  /**
   * Update user password
   */
  async updatePassword(password: string): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error('Error updating password:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error updating password:', error);
      return {
        success: false,
        error: error.message || 'Failed to update password',
      };
    }
  },

  /**
   * Reset password for email
   */
  async resetPasswordForEmail(email: string, redirectTo?: string): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const options = redirectTo 
        ? { redirectTo } 
        : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, options);

      if (error) {
        console.error('Error resetting password:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Error resetting password:', error);
      return {
        success: false,
        error: error.message || 'Failed to reset password',
      };
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(data: Record<string, any>): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data: userData, error } = await supabase.auth.updateUser({
        data,
      });

      if (error) {
        console.error('Error updating profile:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: userData,
      };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        error: error.message || 'Failed to update profile',
      };
    }
  },
};

// Export a simplified direct access to commonly used functions
export const getSession = () => supabaseAuth.getSession();
export const getUser = () => supabaseAuth.getUser();
export const isAuthenticated = () => supabaseAuth.isAuthenticated();
export const extractSessionFromHeader = (header: string | null) => 
  supabaseAuth.extractSessionFromHeader(header);