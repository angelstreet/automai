import { cookies } from 'next/headers';

import { createClient } from '../server';
import { AuthUser, UserTeam } from '@/types/user';

// Cache for user data
const CACHE_TTL = 300000;
const userCache = new Map<string, { user: AuthUser | null; timestamp: number }>();

// User DB operations
const user = {
  async findMany(options: any = {}) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Start building the query
    let builder = supabase.from('profiles').select('*');

    // Apply filters if provided
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        builder = builder.eq(key, value);
      });
    }

    // Apply ordering
    if (options.orderBy) {
      const [field, direction] = Object.entries(options.orderBy)[0];
      builder = builder.order(field as string, { ascending: direction === 'asc' });
    } else {
      builder = builder.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (options.take) {
      builder = builder.limit(options.take);
    }

    if (options.skip) {
      builder = builder.range(options.skip, options.skip + (options.take || 10) - 1);
    }

    // Execute the query
    const { data, error } = await builder;

    if (error) {
      console.error('Error querying users:', error);
      return [];
    }

    return data || [];
  },

  async findUnique({ where }: { where: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Apply the 'where' conditions
    const { data, error } = await supabase.from('profiles').select().match(where).single();

    if (error) {
      console.error('Error finding user:', error);
      return null;
    }

    return data;
  },

  async getUser(userId: string): Promise<AuthUser | null> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Get the user profile directly - don't use admin API
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, tenant_id, tenant_name, avatar_url')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error('Error getting user profile:', profileError);
        return null;
      }

      // Get basic user info
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authData.user) {
        console.error('Error getting auth user:', authError);
        return null;
      }
      
      // Only proceed if the requested user ID matches the authenticated user
      if (authData.user.id !== userId) {
        console.error('User ID mismatch - cannot access other user data');
        return null;
      }

      // Get user teams
      const { data: teams, error: teamsError } = await supabase
        .from('team_members')
        .select('team_id, teams(id, name, tenant_id, created_at)')
        .eq('user_id', userId);

      // Get the selected team ID
      const selectedTeamCookie = cookieStore.get(`selected_team_${userId}`);
      const selectedTeamId = selectedTeamCookie?.value || null;

      // Only use role from profiles table
      const role = profile.role;
      
      if (!role) {
        console.error('No role found in profiles table');
        return null;
      }

      // Transform teams data
      const userTeams: UserTeam[] = !teamsError && teams ? 
        teams.map((teamMember: any) => ({
          id: teamMember.teams.id,
          name: teamMember.teams.name,
          tenant_id: teamMember.teams.tenant_id,
          created_at: teamMember.teams.created_at,
          is_default: false // Add required property
        })) : [];

      return {
        id: userId,
        email: authData.user.email || '',
        role,
        tenant_id: profile.tenant_id,
        tenant_name: profile.tenant_name,
        user_metadata: authData.user.user_metadata || {},
        teams: userTeams,
        selectedTeamId: selectedTeamId || undefined, // Ensure compatible type
        teamMembers: [],
        // Add missing properties to match AuthUser type
        created_at: authData.user.created_at,
        updated_at: authData.user.updated_at,
      };
    } catch (error) {
      console.error('Error in getUser:', error);
      return null;
    }
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const cookieStore = await cookies();

      // Check for auth cookie and use cache
      const authCookie = cookieStore.get('sb-wexkgcszrwxqsthahfyq-auth-token.0');
      if (!authCookie?.value) return null;

      const cacheKey = `user_cache_${authCookie.value.slice(0, 32)}`;
      const cachedEntry = userCache.get(cacheKey);
      const now = Date.now();

      if (cachedEntry && now - cachedEntry.timestamp < CACHE_TTL) {
        return cachedEntry.user;
      }

      const supabase = await createClient(cookieStore);

      // Get the current user
      const { 
        data: { user: authUser }, 
        error: authError 
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        console.error('Error getting current user:', authError);
        return null;
      }

      const userData = await this.getUser(authUser.id);
      
      if (userData) {
        userCache.set(cacheKey, { user: userData, timestamp: now });
      }
      
      return userData;
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return null;
    }
  },
  
  async clearCache(): Promise<void> {
    userCache.clear();
    
    // Clear client-side cache in case we're in a client context
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user-data-cache');
      localStorage.removeItem('cached_user');
    }
    
    return;
  },
  
  async updateProfile(userId: string, metadata: Record<string, any>): Promise<any> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
      
      // First update auth user metadata
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: metadata,
      });
      
      if (authError) {
        console.error('Error updating auth user:', authError);
        throw new Error(authError.message);
      }
      
      // Then update profile in the database
      const profileData: Record<string, any> = {};
      if (metadata.avatar_url) profileData.avatar_url = metadata.avatar_url;
      if (metadata.role) profileData.role = metadata.role;
      
      if (Object.keys(profileData).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', userId);
          
        if (profileError) {
          console.error('Error updating profile:', profileError);
          throw new Error(profileError.message);
        }
      }
      
      // Clear cache to ensure fresh data on next fetch
      await this.clearCache();
      
      return {
        success: true,
        data: authData.user,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  },

  async setSelectedTeam(userId: string, teamId: string): Promise<any> {
    try {
      const cookieStore = await cookies();
      
      // Store the selected team ID in a cookie
      cookieStore.set(`selected_team_${userId}`, teamId, { 
        maxAge: 60 * 60 * 24 * 365 // 1 year
      });
      
      // Clear cache to ensure fresh data on next fetch
      await this.clearCache();
      
      return {
        success: true,
        message: 'Team selected successfully',
      };
    } catch (error) {
      console.error('Error in setSelectedTeam:', error);
      throw error;
    }
  },

  async create({ data }: { data: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: result, error } = await supabase.from('profiles').insert(data).select().single();

    if (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }

    return result;
  },

  async update({ where, data }: { where: any; data: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: result, error } = await supabase
      .from('profiles')
      .update(data)
      .match(where)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }

    return result;
  },

  async delete({ where }: { where: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Note: Deleting profiles should be done with caution
    // Consider adding additional checks or archiving instead
    const { error } = await supabase.from('profiles').delete().match(where);

    if (error) {
      console.error('Error deleting user profile:', error);
      throw error;
    }

    return { success: true };
  },
};

export default user; 