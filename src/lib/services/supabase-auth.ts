import { isUsingSupabase } from '@/lib/env';
import { cookies } from 'next/headers';

// Dynamically import createClient to prevent errors when Supabase isn't available
let createClient: any;
try {
  const supabaseServer = require('@/utils/supabase/server');
  createClient = supabaseServer.createClient;
} catch (error) {
  console.warn('Supabase server client not available, using mock client');
  createClient = () => null;
}

export interface SupabaseAuthResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Service for handling Supabase authentication functions
 * Only works in production environment when Supabase is configured
 */
export const supabaseAuthService = {
  /**
   * Sign in with email and password using Supabase
   */
  async signInWithEmail(email: string, password: string): Promise<SupabaseAuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);

      if (!supabase) {
        return {
          success: false,
          error: 'Supabase client not initialized',
        };
      }

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
        data,
      };
    } catch (error: any) {
      console.error('Supabase auth error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  },

  /**
   * Sign up with email and password using Supabase
   */
  async signUpWithEmail(email: string, password: string): Promise<SupabaseAuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);

      if (!supabase) {
        return {
          success: false,
          error: 'Supabase client not initialized',
        };
      }

      const { data, error } = await supabase.auth.signUp({
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
        data,
      };
    } catch (error: any) {
      console.error('Supabase auth error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<SupabaseAuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);

      if (!supabase) {
        return {
          success: false,
          error: 'Supabase client not initialized',
        };
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Supabase auth error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  },

  /**
   * Reset password for a user
   */
  async resetPassword(email: string): Promise<SupabaseAuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);

      if (!supabase) {
        return {
          success: false,
          error: 'Supabase client not initialized',
        };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Supabase auth error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  },

  /**
   * Get the current user session
   */
  async getSession(): Promise<SupabaseAuthResult> {
    if (!isUsingSupabase()) {
      return {
        success: false,
        error: 'Supabase auth not available in this environment',
      };
    }

    try {
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);

      if (!supabase) {
        return {
          success: false,
          error: 'Supabase client not initialized',
        };
      }

      const { data, error } = await supabase.auth.getSession();

      if (error) {
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
      console.error('Supabase auth error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  },
};
