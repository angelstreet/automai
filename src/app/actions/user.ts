'use server';

import { supabaseAuth } from '@/lib/supabase/auth';
import { AuthUser, UserTeam, TeamMember } from '@/types/user';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient as createServerClient } from '@/lib/supabase/server';

/**
 * Invalidate user-related cache
 * Clears both client-side storage and server-side cache
 */
export async function invalidateUserCache() {
  // Clear any client-side cache if possible
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user-data-cache');
    localStorage.removeItem('cached_user');
  }

  // Clear the server-side cache
  serverCache.clear();

  return {
    success: true,
    message: 'User cache invalidated',
  };
}

// Cache user data for 5 minutes (300000ms)
const CACHE_TTL = 300000;

// In-memory server-side cache with TTL
type CacheEntry = {
  user: AuthUser | null;
  timestamp: number;
};

// Server-side cache instance (stays across requests in same Node.js instance)
const serverCache = new Map<string, CacheEntry>();

// Clean up expired cache entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of serverCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        serverCache.delete(key);
      }
    }
  }, 60000);
}

/**
 * Get the current authenticated user with their teams
 * Uses Next.js caching and server-side caching for stability during SSR/RSC
 *
 * @returns The authenticated user with teams or null if not authenticated
 */
export const getUser = cache(async function getUser(): Promise<AuthUser | null> {
  try {
    // Get all auth cookies - must await cookies()
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('sb-wexkgcszrwxqsthahfyq-auth-token.0');

    // Fail fast if no auth cookie exists - prevent unnecessary DB queries
    if (!authCookie?.value) {
      return null;
    }

    // Create a stable cache key from the auth cookie
    const cacheKey = `user_cache_${authCookie.value.slice(0, 32)}`;

    // Check in-memory cache first
    const cachedEntry = serverCache.get(cacheKey);
    const now = Date.now();

    if (cachedEntry && now - cachedEntry.timestamp < CACHE_TTL) {
      // Use cached data silently - no logging in production
      return cachedEntry.user;
    }

    // If no valid cache, fetch from Supabase
    const result = await supabaseAuth.getUser();

    if (!result.success || !result.data) {
      // Handle common auth errors
      if (
        result.error === 'No active session' ||
        result.error === 'Auth session missing!' ||
        result.error?.includes('Invalid Refresh Token') ||
        result.error?.includes('refresh_token_not_found')
      ) {
        // Cache the null result to avoid repeated failures
        serverCache.set(cacheKey, { user: null, timestamp: now });
        return null;
      }

      throw new Error(result.error || 'Not authenticated');
    }

    // Verify and enhance user data
    if (result.data) {
      // Add role if missing
      if (!(result.data as any).role) {
        (result.data as any).role = result.data.user_metadata?.role || 'viewer';
      }

      // Now fetch the user's teams if they have a tenant_id
      if (result.data.tenant_id) {
        try {
          // Create a Supabase client for database access (using server client)
          const supabase = await createServerClient(cookieStore);

          // Fetch teams for the user's tenant
          const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('*')
            .eq('tenant_id', result.data.tenant_id);

          if (teamsError) {
            console.error('Error fetching teams:', teamsError);
          } else if (teams) {
            // Add teams to the user data
            (result.data as AuthUser).teams = teams as UserTeam[];

            // Get stored team ID from cookie instead of localStorage (which isn't available in server components)
            const selectedTeamCookie = cookieStore.get(`selected_team_${result.data.id}`);
            const storedTeamId = selectedTeamCookie?.value;

            // Try to find a selected team (prioritize default team)
            const defaultTeam = teams.find((team: UserTeam) => team.is_default);

            // Set the selected team ID
            if (storedTeamId && teams.some((team: UserTeam) => team.id === storedTeamId)) {
              (result.data as AuthUser).selectedTeamId = storedTeamId;
            } else if (defaultTeam) {
              (result.data as AuthUser).selectedTeamId = defaultTeam.id;
            } else if (teams.length > 0) {
              (result.data as AuthUser).selectedTeamId = teams[0].id;
            }

            // If there's a selected team, fetch its members
            if ((result.data as AuthUser).selectedTeamId) {
              try {
                // First, get team members without join to ensure structure is correct
                const { data: members, error: membersError } = await supabase
                  .from('team_members')
                  .select('*')
                  .eq('team_id', (result.data as AuthUser).selectedTeamId);

                if (membersError) {
                  console.error('Error fetching team members:', membersError);
                } else if (members) {
                  // For each member, get their user info separately
                  const transformedMembers = [];

                  for (const member of members) {
                    try {
                      // Get user info for this profile ID from the profiles table
                      const { data: userData, error: userError } = await supabase
                        .from('profiles') // Use the profiles table instead of auth.users
                        .select('id, avatar_url, tenant_id, role, tenant_name')
                        .eq('id', member.profile_id)
                        .single();

                      if (userError) {
                        console.error(
                          `Error fetching profile data for profile ${member.profile_id}:`,
                          userError,
                        );
                      }

                      // If we found the profile, get the user's email from our cached user data
                      // We already have the current user's email from the auth data
                      const userEmail =
                        member.profile_id === result.data.id ? result.data.email : 'Team Member'; // Always a string, never null

                      transformedMembers.push({
                        team_id: member.team_id,
                        profile_id: member.profile_id,
                        role: member.role,
                        created_at: member.created_at,
                        updated_at: member.updated_at,
                        profiles: {
                          id: member.profile_id,
                          email: userEmail,
                          avatar_url: '',
                        },
                      });
                    } catch (userError) {
                      console.error('Error enhancing team member:', userError);
                    }
                  }

                  (result.data as AuthUser).teamMembers = transformedMembers as TeamMember[];
                }
              } catch (memberError) {
                console.error('Exception fetching team members:', memberError);
              }
            }
          }
        } catch (error) {
          console.error('Error enhancing user with teams:', error);
        }
      }
    }

    // Cache the result
    const userData = result.data as AuthUser;
    serverCache.set(cacheKey, { user: userData, timestamp: now });

    return userData;
  } catch (error) {
    // Handle session-related errors specially
    if (
      error instanceof Error &&
      (error.message === 'No active session' || error.message === 'Auth session missing!')
    ) {
      return null;
    }

    // Auth errors should just return null
    if (
      error instanceof Error &&
      (error.message.includes('Refresh Token') ||
        error.message.includes('refresh_token_not_found') ||
        error.message.includes('session') ||
        error.message.includes('auth'))
    ) {
      // Silently return null for common auth errors - don't log these as they're expected
      return null;
    }

    // Only throw for unexpected errors
    console.error('Unexpected error in getUser:', error);
    throw new Error('Failed to get current user');
  }
});

/**
 * Update user profile
 *
 * @param formData Form data or profile data object
 * @returns Result object with success status
 */
export async function updateProfile(formData: FormData | Record<string, any>) {
  try {
    // Extract data - handle both FormData and direct objects
    let name, locale, avatar_url, role;

    if (formData instanceof FormData) {
      name = formData.get('name') as string;
      locale = (formData.get('locale') as string) || 'en';
      avatar_url = formData.get('avatar_url') as string;
      role = formData.get('role') as string;
    } else {
      name = formData.name;
      locale = formData.locale || 'en';
      avatar_url = formData.avatar_url;
      role = (formData as any).role;
    }

    // Prepare metadata object with all provided fields
    const metadata: Record<string, any> = {};
    if (name) metadata.name = name;
    if (locale) metadata.locale = locale;
    if (avatar_url) metadata.avatar_url = avatar_url;
    if (role) metadata.role = role;

    // Update user metadata
    const result = await supabaseAuth.updateProfile(metadata);

    if (!result.success) {
      console.error('Failed to update profile:', result.error);
      throw new Error(result.error || 'Failed to update profile');
    }

    // Return success with the updated user data if available
    return {
      success: true,
      data: result.data || null,
      message: 'Profile updated successfully',
    };
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update profile');
  }
}

/**
 * Set the user's selected team
 *
 * @param teamId The ID of the team to select
 * @returns Result object with success status
 */
export async function setSelectedTeam(teamId: string) {
  try {
    const user = await getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Verify the team exists and the user has access to it
    if (!user.teams?.some((team) => team.id === teamId)) {
      throw new Error('Team not found or access denied');
    }

    // Store the selected team ID in a cookie
    const cookieStore = await cookies();
    cookieStore.set(`selected_team_${user.id}`, teamId, { maxAge: 60 * 60 * 24 * 365 }); // 1 year

    // Invalidate cache to force refresh of user data
    await invalidateUserCache();

    return {
      success: true,
      message: 'Team selected successfully',
    };
  } catch (error) {
    console.error('Error selecting team:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to select team');
  }
}
