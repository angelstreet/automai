import { cookies } from 'next/headers';
import { createClient } from './server';
import { createClient as createAdminClient } from './admin';

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

export const supabaseAuth = {
  async getSession(): Promise<AuthResult<SessionData>> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        return { success: false, error: error.message };
      }
      if (!data.session) {
        return { success: false, error: 'No active session' };
      }
      const { user, access_token, expires_at } = data.session;
      const metadata = user.user_metadata || {};
      const name =
        metadata.name ||
        metadata.full_name ||
        (metadata as any)?.raw_user_meta_data?.name ||
        metadata.preferred_username ||
        user.email?.split('@')[0] ||
        null;
      const tenant_id = metadata.tenant_id || metadata.tenantId || 'trial';
      const tenant_name = metadata.tenant_name || metadata.tenantName || tenant_id;
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name,
            image: metadata.avatar_url,
            role: metadata.role || 'user',
            tenant_id,
            tenant_name,
          },
          accessToken: access_token,
          expires: expires_at ? new Date(expires_at * 1000).toISOString() : '',
        },
      };
    } catch (error) {
      console.error('Error in getSession:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async extractSessionFromHeader(authHeader: string | null): Promise<AuthResult<SessionData>> {
    if (!isUsingSupabase() || !authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Invalid or missing authorization header' };
    }
    try {
      const token = authHeader.substring(7);
      const supabase = createAdminClient();
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        console.error('Error getting user from token:', error?.message);
        return { success: false, error: error?.message || 'Invalid token' };
      }
      const user = data.user;
      const metadata = user.user_metadata || {};
      const name =
        metadata.name ||
        metadata.full_name ||
        (metadata as any)?.raw_user_meta_data?.name ||
        metadata.preferred_username ||
        user.email?.split('@')[0] ||
        null;
      const tenant_id = metadata.tenant_id || metadata.tenantId || 'trial';
      const tenant_name = metadata.tenant_name || metadata.tenantName || tenant_id;
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name,
            image: metadata.avatar_url,
            role: metadata.role || 'user',
            tenant_id,
            tenant_name,
          },
          accessToken: token,
          expires: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
      };
    } catch (error) {
      console.error('Error extracting session from header:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getUser(): Promise<AuthResult<UserSession>> {
    const sessionResult = await this.getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return { success: false, error: sessionResult.error || 'No user found' };
    }
    return { success: true, data: sessionResult.data.user };
  },

  async isAuthenticated(): Promise<boolean> {
    const sessionResult = await this.getSession();
    return sessionResult.success;
  },

  async signInWithPassword(email: string, password: string): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available in this environment' };
    }
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: data.session };
    } catch (error) {
      console.error('Error signing in:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async signUp(
    email: string,
    password: string,
    options?: { redirectTo?: string; data?: Record<string, any> }
  ): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available in this environment' };
    }
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
      const { data, error } = await supabase.auth.signUp({ email, password, options });
      if (error) {
        console.error('Error signing up:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error signing up:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign up' };
    }
  },

  async signInWithOAuth(
    provider: 'google' | 'github' | 'gitlab',
    options?: { redirectTo?: string }
  ): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available in this environment' };
    }
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
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
      return { success: false, error: 'Supabase auth not available in this environment' };
    }
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Error exchanging code for session:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process OAuth callback',
      };
    }
  },

  async signOut(): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available in this environment' };
    }
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
      const { error } = await supabase.auth.signOut();
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
      return { success: false, error: 'Supabase auth not available in this environment' };
    }
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
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
      return { success: false, error: 'Supabase auth not available in this environment' };
    }
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
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
      return { success: false, error: 'Supabase auth not available in this environment' };
    }
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
      const { data: userData, error } = await supabase.auth.updateUser({ data });
      if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data: userData };
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
export const extractSessionFromHeader = (header: string | null) =>
  supabaseAuth.extractSessionFromHeader(header);
export const getUser = () => supabaseAuth.getUser();
export const isAuthenticated = () => supabaseAuth.isAuthenticated();
export const signInWithPassword = (email: string, password: string) =>
  supabaseAuth.signInWithPassword(email, password);
export const signUp = (
  email: string,
  password: string,
  options?: { redirectTo?: string; data?: Record<string, any> }
) => supabaseAuth.signUp(email, password, options);
export const signInWithOAuth = (
  provider: 'google' | 'github' | 'gitlab',
  options?: { redirectTo?: string }
) => supabaseAuth.signInWithOAuth(provider, options);
export const handleOAuthCallback = (code: string) => supabaseAuth.handleOAuthCallback(code);
export const signOut = () => supabaseAuth.signOut();
export const updatePassword = (password: string) => supabaseAuth.updatePassword(password);
export const resetPasswordForEmail = (email: string, redirectTo?: string) =>
  supabaseAuth.resetPasswordForEmail(email, redirectTo);
export const updateProfile = (data: Record<string, any>) => supabaseAuth.updateProfile(data);