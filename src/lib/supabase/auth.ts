import { cookies } from 'next/headers';
import { isUsingSupabase } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@/lib/supabase/admin';

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
      const cookieStore = cookies();
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
          error: 'No session found' 
        };
      }

      const { user, access_token, expires_at } = data.session;

      const sessionData: SessionData = {
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || null,
          image: user.user_metadata?.avatar_url || null,
          role: user.user_metadata?.role || 'user',
          tenant_id: user.user_metadata?.tenant_id || user.user_metadata?.tenantId || 'trial',
          tenant_name: user.user_metadata?.tenant_name || user.user_metadata?.tenantName || 'trial',
        },
        accessToken: access_token,
        expires: new Date(expires_at! * 1000).toISOString(),
      };

      return {
        success: true,
        data: sessionData
      };
    } catch (error: any) {
      console.error('Error getting session:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to get session'
      };
    }
  },

  /**
   * Extract session from request headers
   */
  async extractSessionFromHeader(authHeader: string | null): Promise<AuthResult<SessionData>> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { 
        success: false, 
        error: 'Invalid or missing Authorization header' 
      };
    }

    try {
      const token = authHeader.substring(7);
      
      // Create a Supabase admin client
      const supabase = createAdminClient();

      // Get the user from the token
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        console.error('Error getting user from token:', error?.message);
        return { 
          success: false, 
          error: error?.message || 'Invalid token' 
        };
      }

      // Return the session data
      const sessionData: SessionData = {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || null,
          image: data.user.user_metadata?.avatar_url || null,
          role: data.user.user_metadata?.role || 'user',
          tenant_id: data.user.user_metadata?.tenant_id || data.user.user_metadata?.tenantId || 'trial',
          tenant_name: data.user.user_metadata?.tenant_name || data.user.user_metadata?.tenantName || 'trial',
        },
        accessToken: token,
        expires: new Date(Date.now() + 3600 * 1000).toISOString(), // Approximate expiry
      };

      return {
        success: true,
        data: sessionData
      };
    } catch (error: any) {
      console.error('Error extracting session from header:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to extract session'
      };
    }
  },

  /**
   * Get the current user
   */
  async getUser(): Promise<AuthResult<UserSession>> {
    const sessionResult = await this.getSession();
    
    if (!sessionResult.success || !sessionResult.data) {
      return { 
        success: false, 
        error: sessionResult.error || 'No active session'
      };
    }
    
    return {
      success: true,
      data: sessionResult.data.user
    };
  },

  /**
   * Check if a user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const sessionResult = await this.getSession();
    return sessionResult.success && !!sessionResult.data;
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
      const cookieStore = cookies();
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error signing in with password:', error);
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
      console.error('Error signing in with password:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign in',
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
      const cookieStore = cookies();
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
      const cookieStore = cookies();
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
   */
  async handleOAuthCallback(code: string): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = cookies();
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
      const cookieStore = cookies();
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
      const cookieStore = cookies();
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
      const cookieStore = cookies();
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
      const cookieStore = cookies();
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