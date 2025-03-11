import { UserSession, SessionData, AuthResult, OAuthProvider } from '@/types/user';
import { createClient } from './server';

// Check if we're in an environment where Supabase auth is available
const isUsingSupabase = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

export const supabaseAuth = {
  async getUserById(userId: string): Promise<AuthResult<UserSession>> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, tenant_id, tenant_name, role, avatar_url')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error getting profile by ID:', profileError);
        return { success: false, error: profileError.message };
      }

      if (!profile) {
        return { success: false, error: 'User profile not found' };
      }

      // Optionally fetch email and other auth data
      const { data: authUser, error: authError } = await supabase.auth.getUser();

      return {
        success: true,
        data: {
          id: profile.id,
          email: authError ? null : authUser?.user?.email || null, // Fallback if auth fails
          name: null, // Not in profiles; could add to table if needed
          image: profile.avatar_url || null,
          role: profile.role || 'user',
          tenant_id: profile.tenant_id || 'trial',
          tenant_name: profile.tenant_name || 'Trial',
          created_at: authError ? null : authUser?.user?.created_at || null,
          updated_at: authError ? null : authUser?.user?.updated_at || null,
          user_metadata: authError ? {} : authUser?.user?.user_metadata || {},
        },
      };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user by ID',
      };
    }
  },

  async updateUserMetadata(userId: string, metadata: Record<string, any>): Promise<AuthResult<any>> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      // Update auth metadata
      const { data: authData, error: authError } = await supabase.auth.updateUser({ data: metadata });

      if (authError) {
        console.error('Error updating auth metadata:', authError);
        return { success: false, error: authError.message };
      }

      // Update profiles table with relevant fields
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

  async ensureUserInDb(userData: any): Promise<AuthResult<any>> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      const { data: existingUser, error: findError } = await supabase
        .from('profiles')
        .select('id, tenant_id, tenant_name, role, avatar_url')
        .eq('id', userData.id)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        console.error('Error finding user:', findError);
        return { success: false, error: findError.message };
      }

      if (existingUser) {
        return { success: true, data: existingUser };
      }

      const newProfile = {
        id: userData.id,
        tenant_id: userData.tenant_id || 'trial',
        tenant_name: userData.tenant_name || 'Trial',
        role: userData.role || 'user',
        avatar_url: userData.avatar_url || null,
      };
      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return { success: false, error: createError.message };
      }

      return { success: true, data: newUser };
    } catch (error) {
      console.error('Error ensuring user in database:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to ensure user in database',
      };
    }
  },

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

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: metadata.name || user.email?.split('@')[0] || null, // Fallback if not in profiles
            image: profile?.avatar_url || metadata.avatar_url || null,
            role: profile?.role || metadata.role || 'user',
            tenant_id: profile?.tenant_id || metadata.tenant_id || 'trial',
            tenant_name: profile?.tenant_name || metadata.tenant_name || 'Trial',
            created_at: user.created_at,
            updated_at: user.updated_at,
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

  async extractSessionFromHeader(authHeader: string | null): Promise<AuthResult<SessionData>> {
    if (!isUsingSupabase() || !authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Invalid or missing authorization header' };
    }
    try {
      throw new Error(
        'extractSessionFromHeader is not supported with browser client. Use server-side logic with service role key.'
      );
    } catch (error) {
      console.error('Error extracting session from header:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
    options?: { redirectTo?: string; data?: Record<string, any> }
  ): Promise<AuthResult> {
    if (!isUsingSupabase()) {
      return { success: false, error: 'Supabase auth not available' };
    }
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signUp({ email, password, options });

      if (error) {
        console.error('Error signing up:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error signing up:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign up',
      };
    }
  },

  async signInWithOAuth(
    provider: OAuthProvider,
    options?: { redirectTo?: string }
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
      console.log('🔐 AUTH_SERVICE: Starting OAuth code exchange for code:', code.substring(0, 6) + '...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('🔐 AUTH_SERVICE ERROR: Error exchanging code for session:', error);
        return { success: false, error: error.message };
      }

      console.log('🔐 AUTH_SERVICE: Exchange successful:', !!data?.session, data?.session?.user?.id || 'no user id');
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

      // Update profiles table
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
  provider: OAuthProvider,
  options?: { redirectTo?: string }
) => supabaseAuth.signInWithOAuth(provider, options);
export const handleOAuthCallback = (code: string) => supabaseAuth.handleOAuthCallback(code);
export const signOut = () => supabaseAuth.signOut();
export const updatePassword = (password: string) => supabaseAuth.updatePassword(password);
export const resetPasswordForEmail = (email: string, redirectTo?: string) =>
  supabaseAuth.resetPasswordForEmail(email, redirectTo);
export const updateProfile = (data: Record<string, any>) => supabaseAuth.updateProfile(data);