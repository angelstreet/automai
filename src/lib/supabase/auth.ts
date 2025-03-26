import { UserSession, SessionData, AuthResult, OAuthProvider } from '@/types/user';

import { createClient } from './server';

const isUsingSupabase = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

export const supabaseAuth = {
  async getSession(): Promise<AuthResult<SessionData>> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error getting session:', sessionError);
        return { success: false, error: sessionError.message };
      }

      if (!sessionData.session) {
        return { success: false, error: 'No active session' };
      }

      const { user, access_token, expires_at } = sessionData.session;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, tenant_name, role, avatar_url')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      const metadata = user.user_metadata || {};

      // Get name from user metadata with fallbacks
      const name = metadata.name || metadata.full_name || user.email?.split('@')[0] || 'Guest';

      // Only use role from profiles table
      const role = profile?.role;
      console.log('Role resolution in getSession:', { profileRole: profile?.role });

      if (!role) {
        console.error('No role found in profiles table');
        return { success: false, error: 'No role found in profiles table' };
      }

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name,
            image: profile?.avatar_url || metadata.avatar_url || null,
            role,
            tenant_id: profile?.tenant_id || metadata.tenant_id || 'unknown',
            tenant_name: profile?.tenant_name || metadata.tenant_name || 'trial',
            user_metadata: metadata,
          },
          accessToken: access_token,
          expires: expires_at ? new Date(expires_at * 1000).toISOString() : '',
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

  async getUser(): Promise<AuthResult<UserSession>> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        return {
          success: false,
          error: authError?.message || 'No authenticated user',
        };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(
          `
          role,
          tenant_id,
          tenant_name,
          avatar_url
        `,
        )
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        return {
          success: false,
          error: profileError.message,
        };
      }

      // Get name from user metadata with fallbacks
      const name =
        authUser.user_metadata?.name ||
        authUser.user_metadata?.full_name ||
        authUser.email?.split('@')[0] ||
        'Guest';

      // Only use role from profiles table
      const role = profile.role;
      console.log('Role resolution in getUser:', { profileRole: profile.role });

      if (!role) {
        console.error('No role found in profiles table');
        return { success: false, error: 'No role found in profiles table' };
      }

      return {
        success: true,
        data: {
          id: authUser.id,
          email: authUser.email || '',
          name,
          role,
          tenant_id: profile.tenant_id || 'default',
          tenant_name: profile.tenant_name || 'trial',
          avatar_url:
            authUser.user_metadata?.avatar_url || profile.avatar_url || '/avatars/default.svg',
          user_metadata: authUser.user_metadata,
        },
      };
    } catch (error) {
      console.error('Error in getUser:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user data',
      };
    }
  },

  async updateUser(userId: string, metadata: Record<string, any>): Promise<AuthResult<any>> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: metadata,
      });

      if (authError) {
        console.error('Error updating auth metadata:', authError);
        return { success: false, error: authError.message };
      }

      const profileUpdate = {
        tenant_id: metadata.tenant_id || null,
        tenant_name: metadata.tenant_name || null,
        role: metadata.role || null,
        avatar_url: metadata.avatar_url || null,
      };
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return { success: false, error: profileError.message };
      }

      return { success: true, data: authData.user };
    } catch (error) {
      console.error('Error updating user metadata:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user metadata',
      };
    }
  },

  async isAuthenticated(): Promise<boolean> {
    const sessionResult = await this.getSession();
    return sessionResult.success;
  },

  async signInWithPassword(email: string, password: string): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: data.session };
    } catch (error) {
      console.error('Error signing in:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async signUp(
    email: string,
    password: string,
    options: { redirectTo: string; data: { name: string } },
  ): Promise<AuthResult<any>> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      console.log('Attempting to sign up user:', { email, options });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: options.redirectTo,
          data: {
            name: options.data.name,
            tenant_name: 'trial', // Default tenant for new users
            role: 'viewer', // Default role for new users
          },
        },
      });

      if (error) {
        console.error('Error during signup:', error);
        return { success: false, error: error.message };
      }

      // Let Supabase handle profile creation via triggers
      // No manual profile creation needed

      return { success: true, data };
    } catch (error) {
      console.error('Error in signUp:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign up',
      };
    }
  },

  async signInWithOAuth(
    provider: OAuthProvider,
    options?: { redirectTo?: string },
  ): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({ provider, options });

      if (error) {
        console.error('Error signing in with OAuth:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error signing in with OAuth:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign in with OAuth',
      };
    }
  },

  async handleOAuthCallback(code: string): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      console.log(
        '🔐 AUTH_SERVICE: Starting OAuth code exchange for code:',
        code.substring(0, 6) + '...',
      );
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('🔐 AUTH_SERVICE ERROR: Error exchanging code for session:', error);
        return { success: false, error: error.message };
      }

      console.log(
        '🔐 AUTH_SERVICE: Exchange successful:',
        !!data?.session,
        data?.session?.user?.id || 'no user id',
      );
      return { success: true, data };
    } catch (error) {
      console.error('🔐 AUTH_SERVICE ERROR: Error handling OAuth callback:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process OAuth callback',
      };
    }
  },

  async signOut(): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.signOut();

      // Clear user data cache from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user-data-cache');
      }

      if (error) {
        console.error('Error signing out:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign out',
      };
    }
  },

  async updatePassword(password: string): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error('Error updating password:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error updating password:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update password',
      };
    }
  },

  async resetPasswordForEmail(email: string, redirectTo?: string): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      const options = redirectTo ? { redirectTo } : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, options);

      if (error) {
        console.error('Error resetting password:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      console.error('Error resetting password:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset password',
      };
    }
  },

  async updateProfile(data: Record<string, any>): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      const { data: authData, error: authError } = await supabase.auth.updateUser({ data });

      if (authError) {
        console.error('Error updating auth profile:', authError);
        return { success: false, error: authError.message };
      }

      const profileUpdate = {
        tenant_id: data.tenant_id || null,
        tenant_name: data.tenant_name || null,
        role: data.role || null,
        avatar_url: data.avatar_url || null,
      };
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return { success: false, error: profileError.message };
      }

      return { success: true, data: authData };
    } catch (error) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      };
    }
  },
};

// Export simplified direct access
export const getSession = () => supabaseAuth.getSession();
export const getUser = () => supabaseAuth.getUser();
export const isAuthenticated = () => supabaseAuth.isAuthenticated();
export const signInWithPassword = (email: string, password: string) =>
  supabaseAuth.signInWithPassword(email, password);
export const signUp = (
  email: string,
  password: string,
  options?: { redirectTo?: string; data?: Record<string, any> },
) => supabaseAuth.signUp(email, password, options);
export const signInWithOAuth = (provider: OAuthProvider, options?: { redirectTo?: string }) =>
  supabaseAuth.signInWithOAuth(provider, options);
export const handleOAuthCallback = (code: string) => supabaseAuth.handleOAuthCallback(code);
export const signOut = () => supabaseAuth.signOut();
export const updatePassword = (password: string) => supabaseAuth.updatePassword(password);
export const resetPasswordForEmail = (email: string, redirectTo?: string) =>
  supabaseAuth.resetPasswordForEmail(email, redirectTo);
export const updateProfile = (data: Record<string, any>) => supabaseAuth.updateProfile(data);
