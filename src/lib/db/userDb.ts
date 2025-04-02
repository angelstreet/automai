import { createClient } from '@/lib/supabase/server';
import { DbResponse } from '@/lib/utils/commonUtils';
import { AuthUser, UserTeam } from '@/types/service/userServiceType';

export default {
  findMany,
  findUnique,
  getUser,
  getCurrentUser,
  updateProfile,
  setSelectedTeam,
  create,
  update,
  deleteUser,
};

/**
 * Find multiple users based on options
 * @param options Query options
 * @param cookieStore Cookie store
 * @returns Array of user profiles
 */
export async function findMany(options: any = {}, cookieStore?: any): Promise<any[]> {
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
    console.error('[@db:userDb:findMany] Error querying users:', error);
    return [];
  }

  return data || [];
}

/**
 * Find a single user by unique criteria
 * @param where Query criteria
 * @param cookieStore Cookie store
 * @returns User profile or null
 */
export async function findUnique(
  { where }: { where: any },
  cookieStore?: any,
): Promise<any | null> {
  const supabase = await createClient(cookieStore);

  // Apply the 'where' conditions
  const { data, error } = await supabase.from('profiles').select().match(where).single();

  if (error) {
    console.error('[@db:userDb:findUnique] Error finding user:', error);
    return null;
  }

  return data;
}

/**
 * Get a user by ID
 * @param userId User ID
 * @param cookieStore Cookie store
 * @returns User data or null
 */
export async function getUser(userId: string, cookieStore?: any): Promise<DbResponse<AuthUser>> {
  try {
    const supabase = await createClient(cookieStore);

    // Get the user profile directly - don't use admin API
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, tenant_id, tenant_name, avatar_url')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('[@db:userDb:getUser] Error getting user profile:', profileError);
      return { success: false, error: 'Failed to get user profile' };
    }

    // Get basic user info
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('[@db:userDb:getUser] Error getting auth user:', authError);
      return { success: false, error: 'Failed to get authenticated user' };
    }

    // Only proceed if the requested user ID matches the authenticated user
    if (authData.user.id !== userId) {
      console.error('[@db:userDb:getUser] User ID mismatch - cannot access other user data');
      return { success: false, error: 'Cannot access other user data' };
    }

    // Get user teams
    const { data: teams, error: teamsError } = await supabase
      .from('team_members')
      .select('team_id, teams(id, name, tenant_id, created_at)')
      .eq('user_id', userId);

    // Get the selected team ID
    let selectedTeamId = null;
    if (cookieStore) {
      const selectedTeamCookie = cookieStore.get(`selected_team_${userId}`);
      selectedTeamId = selectedTeamCookie?.value || null;
    }

    // Only use role from profiles table
    const role = profile.role;

    if (!role) {
      console.error('[@db:userDb:getUser] No role found in profiles table');
      return { success: false, error: 'No role found for user' };
    }

    // Transform teams data
    const userTeams: UserTeam[] =
      !teamsError && teams
        ? teams.map((teamMember: any) => ({
            id: teamMember.teams.id,
            name: teamMember.teams.name,
            tenant_id: teamMember.teams.tenant_id,
            created_at: teamMember.teams.created_at,
            is_default: false, // Add required property
          }))
        : [];

    return {
      success: true,
      data: {
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
        created_at: authData.user.created_at || '',
        updated_at: authData.user.updated_at || '',
      },
    };
  } catch (error) {
    console.error('[@db:userDb:getUser] Error in getUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting user',
    };
  }
}

/**
 * Get the current authenticated user
 * @param cookieStore Cookie store
 * @returns Current user data or null
 */
export async function getCurrentUser(cookieStore?: any): Promise<DbResponse<AuthUser>> {
  try {
    const supabase = await createClient(cookieStore);

    // Get the current user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error('[@db:userDb:getCurrentUser] Error getting current user:', authError);
      return { success: false, error: 'Failed to get current user' };
    }

    const userResult = await getUser(authUser.id, cookieStore);

    return userResult;
  } catch (error) {
    console.error('[@db:userDb:getCurrentUser] Error in getCurrentUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting current user',
    };
  }
}

/**
 * Update user profile
 * @param userId User ID
 * @param metadata Profile metadata to update
 * @param cookieStore Cookie store
 * @returns Updated user data
 */
export async function updateProfile(
  userId: string,
  metadata: Record<string, any>,
  cookieStore?: any,
): Promise<DbResponse<any>> {
  try {
    const supabase = await createClient(cookieStore);

    // First update auth user metadata
    const { data: authData, error: authError } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (authError) {
      console.error('[@db:userDb:updateProfile] Error updating auth user:', authError);
      return { success: false, error: authError.message };
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
        console.error('[@db:userDb:updateProfile] Error updating profile:', profileError);
        return { success: false, error: profileError.message };
      }
    }

    return {
      success: true,
      data: authData.user,
    };
  } catch (error) {
    console.error('[@db:userDb:updateProfile] Error in updateProfile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating profile',
    };
  }
}

/**
 * Set selected team for a user
 * @param userId User ID
 * @param teamId Team ID
 * @param cookieStore Cookie store
 * @returns Operation result
 */
export async function setSelectedTeam(
  userId: string,
  teamId: string,
  cookieStore?: any,
): Promise<DbResponse<null>> {
  try {
    if (!cookieStore) {
      console.error('[@db:userDb:setSelectedTeam] No cookieStore provided');
      return {
        success: false,
        error: 'No cookieStore provided',
        data: null,
      };
    }

    // Store the selected team ID in a cookie
    cookieStore.set(`selected_team_${userId}`, teamId, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error('[@db:userDb:setSelectedTeam] Error in setSelectedTeam:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error setting selected team',
      data: null,
    };
  }
}

/**
 * Create a new user profile
 * @param data Profile data
 * @param cookieStore Cookie store
 * @returns Created user profile
 */
export async function create({ data }: { data: any }, cookieStore?: any): Promise<DbResponse<any>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data: result, error } = await supabase.from('profiles').insert(data).select().single();

    if (error) {
      console.error('[@db:userDb:create] Error creating user profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('[@db:userDb:create] Error in create:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating user profile',
    };
  }
}

/**
 * Update a user profile
 * @param where Query criteria
 * @param data Profile data to update
 * @param cookieStore Cookie store
 * @returns Updated user profile
 */
export async function update(
  { where, data }: { where: any; data: any },
  cookieStore?: any,
): Promise<DbResponse<any>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data: result, error } = await supabase
      .from('profiles')
      .update(data)
      .match(where)
      .select()
      .single();

    if (error) {
      console.error('[@db:userDb:update] Error updating user profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('[@db:userDb:update] Error in update:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating user profile',
    };
  }
}

/**
 * Delete a user profile
 * @param where Query criteria
 * @param cookieStore Cookie store
 * @returns Operation result
 */
export async function deleteUser(
  { where }: { where: any },
  cookieStore?: any,
): Promise<DbResponse<null>> {
  try {
    const supabase = await createClient(cookieStore);

    // Note: Deleting profiles should be done with caution
    // Consider adding additional checks or archiving instead
    const { error } = await supabase.from('profiles').delete().match(where);

    if (error) {
      console.error('[@db:userDb:deleteUser] Error deleting user profile:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('[@db:userDb:deleteUser] Error in deleteUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error deleting user profile',
      data: null,
    };
  }
}
