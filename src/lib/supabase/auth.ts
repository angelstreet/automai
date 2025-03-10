import { cookies } from 'next/headers';
import { createClient } from './server';
import { createClient as createAdminClient } from './admin';
import { UserSession, SessionData, AuthResult, OAuthProvider } from '@/types/user';


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
      // Use the admin client to get user by ID (requires service role)
      const adminClient = createAdminClient();
      const { data, error } = await adminClient.auth.admin.getUserById(userId);
      
      if (error) {
        console.error('Error getting user by ID:', error);
        return { success: false, error: error.message };
      }
      
      if (!data.user) {
        return { success: false, error: 'User not found' };
      }
      
      // Extract user data with metadata
      const user = data.user;
      const metadata = user.user_metadata || {};
      
      // Format user data to match UserSession type
      return { 
        success: true, 
        data: {
          id: user.id,
          email: user.email,
          name: metadata.name || metadata.full_name || user.email?.split('@')[0] || null,
          image: metadata.avatar_url || null,
          role: metadata.role || 'user',
          tenant_id: metadata.tenant_id || 'trial',
          tenant_name: metadata.tenant_name || 'Trial',
          created_at: user.created_at,
          updated_at: user.updated_at,
          user_metadata: user.user_metadata
        }
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
      // Use the admin client to update user metadata (requires service role)
      const adminClient = createAdminClient();
      const { data, error } = await adminClient.auth.admin.updateUserById(
        userId,
        { user_metadata: metadata }
      );
      
      if (error) {
        console.error('Error updating user metadata:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data.user };
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
      // Use admin client to check if user exists and create if not
      const adminClient = createAdminClient();
      
      // Check if user already exists in the users table
      const { data: existingUser, error: findError } = await adminClient
        .from('users')
        .select('*')
        .eq('id', userData.id)
        .single();
        
      if (findError && findError.code !== 'PGRST116') {
        console.error('Error finding user:', findError);
        return { success: false, error: findError.message };
      }
      
      if (existingUser) {
        // User exists, return success
        return { success: true, data: existingUser };
      }
      
      // Create user record in database
      const { data: newUser, error: createError } = await adminClient
        .from('users')
        .insert(userData)
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
            created_at: user.created_at,
            updated_at: user.updated_at,
            user_metadata: user.user_metadata
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
    provider: OAuthProvider,
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
      console.log('🔐 AUTH_SERVICE: Starting OAuth code exchange for code:', code.substring(0, 6) + '...');
      
      // Get cookies before exchange
      const cookieStore = await cookies();
      const cookiesBefore = cookieStore.getAll().filter(c => 
        c.name.startsWith('sb-') || c.name.includes('supabase')
      );
      console.log('🔐 AUTH_SERVICE: Cookies before exchange:', 
        cookiesBefore.map(c => c.name));
      
      // Create client and exchange code
      const supabase = await createClient(cookieStore);
      console.log('🔐 AUTH_SERVICE: Calling exchangeCodeForSession');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('🔐 AUTH_SERVICE ERROR: Error exchanging code for session:', error);
        return { success: false, error: error.message };
      }
      
      // Get cookies after exchange to verify they were set
      const cookiesAfter = (await cookies()).getAll().filter(c => 
        c.name.startsWith('sb-') || c.name.includes('supabase')
      );
      console.log('🔐 AUTH_SERVICE: Cookies after exchange:', 
        cookiesAfter.map(c => c.name));
      
      console.log('🔐 AUTH_SERVICE: Exchange successful:', 
        !!data?.session, 
        data?.session?.user?.id || 'no user id');
      
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
  provider: OAuthProvider,
  options?: { redirectTo?: string }
) => supabaseAuth.signInWithOAuth(provider, options);
export const handleOAuthCallback = (code: string) => supabaseAuth.handleOAuthCallback(code);
export const signOut = () => supabaseAuth.signOut();
export const updatePassword = (password: string) => supabaseAuth.updatePassword(password);
export const resetPasswordForEmail = (email: string, redirectTo?: string) =>
  supabaseAuth.resetPasswordForEmail(email, redirectTo);
export const updateProfile = (data: Record<string, any>) => supabaseAuth.updateProfile(data);