'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { getUser } from '@/app/actions/userAction';
import permissionDb from '@/lib/db/permissionDb';
import * as teamDb from '@/lib/db/teamDb';
import teamMemberDb from '@/lib/db/teamMemberDb';
import { createClient as createAdminClient } from '@/lib/supabase/admin';
import type { ResourceType } from '@/types/context/permissionsContextType';
import { ResourcePermissions } from '@/types/context/teamContextType';

/**
 * Get team members for a specific team
 */
export const getTeamMembers = cache(async (teamId: string) => {
  try {
    // Verify the current user is authenticated
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const cookieStore = await cookies();

    // Get team members
    const result = await teamMemberDb.getTeamMembers(teamId, cookieStore);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to get team members',
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error getting team members:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get team members',
    };
  }
});

/**
 * Update a team member's role
 */
export const updateTeamMemberRole = cache(
  async (teamId: string, profileId: string, role: string) => {
    try {
      // Verify the current user is authenticated
      const user = await getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const cookieStore = await cookies();

      // Check if the member being updated is an admin (prevent changing admin roles)
      const membersResult = await teamMemberDb.getTeamMembers(teamId, cookieStore);
      if (!membersResult.success || !membersResult.data) {
        console.error(
          '[@action:teamMemberAction:updateTeamMemberRole] Error checking member role:',
          membersResult.error,
        );
        return { success: false, error: 'Failed to check member role' };
      }

      const memberData = membersResult.data.find((member) => member.profile_id === profileId);
      if (!memberData) {
        console.error('[@action:teamMemberAction:updateTeamMemberRole] Member not found in team');
        return { success: false, error: 'Member not found in team' };
      }

      // Prevent modifying admin users
      if (memberData.role && memberData.role.toLowerCase() === 'admin') {
        console.warn(
          '[@action:teamMemberAction:updateTeamMemberRole] Attempted to modify an admin user - operation blocked',
        );
        return { success: false, error: 'Cannot modify admin users for security reasons' };
      }

      // Update role
      const result = await teamMemberDb.updateTeamMemberRole(teamId, profileId, role, cookieStore);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to update role',
        };
      }

      // Revalidate team-related paths
      revalidatePath('/[locale]/[tenant]/team', 'page');

      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error updating team member role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update role',
      };
    }
  },
);

/**
 * Add a new member to a team with a specified role
 */
export const addTeamMember = cache(async (teamId: string, email: string, role: string) => {
  try {
    // Verify the current user is authenticated
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Lookup the user ID from the email
    const cookieStore = await cookies();

    // Use a db function to find user profiles by email
    // Since we don't have a direct method for this in teamMemberDb,
    // we can use the getAvailableTenantProfilesForTeam which returns profiles
    const profilesResult = await teamMemberDb.getAvailableTenantProfilesForTeam(
      user.tenant_id || '',
      teamId,
      cookieStore,
    );

    if (!profilesResult.success || !profilesResult.data) {
      console.error(
        '[@action:teamMemberAction:addTeamMember] Error getting profiles:',
        profilesResult.error,
      );
      return {
        success: false,
        error: 'Failed to look up users',
      };
    }

    // Find the profile with matching email
    const userProfile = profilesResult.data.find(
      (profile) => profile.email === email || profile.user?.email === email,
    );

    if (!userProfile) {
      console.error('[@action:teamMemberAction:addTeamMember] User not found with email:', email);
      return {
        success: false,
        error: `User with email ${email} not found`,
      };
    }

    const profileId = userProfile.id;

    // Add the member to the team
    const result = await teamMemberDb.addTeamMember(
      {
        team_id: teamId,
        profile_id: profileId,
        role: role,
      },
      cookieStore,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to add team member',
      };
    }

    // If successful, also apply the role template to set permissions
    const roleResult = await permissionDb.applyRoleTemplate(teamId, profileId, role, cookieStore);

    if (!roleResult.success) {
      console.warn('Failed to apply role template, but user was added to team:', roleResult.error);
    }

    // Revalidate team-related paths
    revalidatePath('/[locale]/[tenant]/team', 'page');

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error('Error adding team member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add team member',
    };
  }
});

/**
 * Get available tenant profiles that can be added to a team
 */
export const getAvailableTenantProfiles = cache(async (tenantId: string, teamId: string) => {
  try {
    // Verify the current user is authenticated
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const cookieStore = await cookies();

    // Get available tenant profiles
    const result = await teamMemberDb.getAvailableTenantProfilesForTeam(
      tenantId,
      teamId,
      cookieStore,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to get available tenant profiles',
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error getting available tenant profiles:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get available tenant profiles',
    };
  }
});

/**
 * Add multiple members to a team at once
 */
export const addMultipleTeamMembers = cache(
  async (teamId: string, profileIds: string[], role: string) => {
    try {
      // Verify the current user is authenticated
      const user = await getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const cookieStore = await cookies();

      // Add members to the team
      const result = await teamMemberDb.addMultipleTeamMembers(
        teamId,
        profileIds,
        role,
        cookieStore,
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to add team members',
        };
      }

      // Revalidate team-related paths
      revalidatePath('/[locale]/[tenant]/team', 'page');

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error('Error adding multiple team members:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add team members',
      };
    }
  },
);

/**
 * Update a team member's permissions
 */
export const updateMemberPermissions = cache(
  async (teamId: string, profileId: string, permissions: ResourcePermissions) => {
    try {
      // Verify the current user is authenticated
      const user = await getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const cookieStore = await cookies();

      // Update permissions for each resource type
      const resourceTypes = Object.keys(permissions) as ResourceType[];
      let failedUpdates = 0;

      for (const resourceType of resourceTypes) {
        const resourcePermissions = permissions[resourceType];

        const result = await permissionDb.setUserPermission(
          teamId,
          profileId,
          resourceType,
          {
            can_select: resourcePermissions.select,
            can_insert: resourcePermissions.insert,
            can_update: resourcePermissions.update,
            can_delete: resourcePermissions.delete,
            can_update_own: resourcePermissions.update_own,
            can_delete_own: resourcePermissions.delete_own,
            can_execute: resourcePermissions.execute,
          },
          cookieStore,
        );

        if (!result.success) {
          console.error(`Failed to update permissions for ${resourceType}:`, result.error);
          failedUpdates++;
        }
      }

      // Revalidate team-related paths
      revalidatePath('/[locale]/[tenant]/team', 'page');

      if (failedUpdates > 0) {
        return {
          success: false,
          error: `Failed to update ${failedUpdates} resource types`,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating member permissions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update permissions',
      };
    }
  },
);

/**
 * Remove a member from a team
 */
export const removeTeamMember = cache(async (teamId: string, profileId: string) => {
  try {
    // Verify the current user is authenticated
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const cookieStore = await cookies();

    // Check if the member being removed is an admin (prevent removal of admin users)
    const membersResult = await teamMemberDb.getTeamMembers(teamId, cookieStore);
    if (!membersResult.success || !membersResult.data) {
      console.error(
        '[@action:teamMemberAction:removeTeamMember] Error checking member role:',
        membersResult.error,
      );
      return { success: false, error: 'Failed to check member role' };
    }

    const memberData = membersResult.data.find((member) => member.profile_id === profileId);
    if (!memberData) {
      console.error('[@action:teamMemberAction:removeTeamMember] Member not found in team');
      return { success: false, error: 'Member not found in team' };
    }

    // Prevent removing admin users
    if (memberData.role && memberData.role.toLowerCase() === 'admin') {
      console.warn(
        '[@action:teamMemberAction:removeTeamMember] Attempted to remove an admin user - operation blocked',
      );
      return { success: false, error: 'Cannot remove admin users for security reasons' };
    }

    // Remove the member from the team
    const result = await teamMemberDb.removeTeamMember(teamId, profileId, cookieStore);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to remove team member',
      };
    }

    // Revalidate team-related paths
    revalidatePath('/[locale]/[tenant]/team', 'page');

    return { success: true };
  } catch (error) {
    console.error('Error removing team member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove team member',
    };
  }
});

/**
 * Get the permissions for a team member
 */
export const getMemberPermissions = cache(async (teamId: string, profileId: string) => {
  try {
    // Verify the current user is authenticated
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const cookieStore = await cookies();

    // Get all permissions for this user in this team
    const result = await permissionDb.getUserPermissions(profileId, teamId, cookieStore);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to get member permissions',
      };
    }

    // Transform the permissions to the expected format
    const permissionMatrix = result.data.reduce((acc, perm) => {
      acc[perm.resource_type] = {
        select: perm.can_select,
        insert: perm.can_insert,
        update: perm.can_update,
        delete: perm.can_delete,
        update_own: perm.can_update_own,
        delete_own: perm.can_delete_own,
        execute: perm.can_execute,
      };
      return acc;
    }, {} as ResourcePermissions);

    return {
      success: true,
      data: permissionMatrix,
    };
  } catch (error) {
    console.error('Error getting member permissions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get member permissions',
    };
  }
});

/**
 * Apply a role template to a team member
 */
export const applyRolePermissionTemplate = cache(
  async (teamId: string, profileId: string, role: string) => {
    try {
      // Verify the current user is authenticated
      const user = await getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const cookieStore = await cookies();

      // Apply the role template
      const result = await permissionDb.applyRoleTemplate(teamId, profileId, role, cookieStore);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to apply role template',
        };
      }

      // Also update their role in the team_members table
      const roleResult = await teamMemberDb.updateTeamMemberRole(
        teamId,
        profileId,
        role,
        cookieStore,
      );

      if (!roleResult.success) {
        console.warn(
          'Failed to update member role, but permissions were applied:',
          roleResult.error,
        );
      }

      // Revalidate team-related paths
      revalidatePath('/[locale]/[tenant]/team', 'page');

      return { success: true };
    } catch (error) {
      console.error('Error applying role template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply role template',
      };
    }
  },
);

/**
 * Get a team member's role based on their profile ID and team ID
 */
export const getTeamMemberRole = cache(async (profileId: string, teamId: string) => {
  try {
    console.log(
      `[@action:teamMember:getTeamMemberRole] Getting role for profile: ${profileId}, team: ${teamId}`,
    );

    // Verify if inputs are valid
    if (!profileId || !teamId) {
      console.error(
        `[@action:teamMember:getTeamMemberRole] Invalid inputs: profileId=${profileId}, teamId=${teamId}`,
      );
      return null;
    }

    // Log current time for tracking when this function was called
    console.log(
      `[@action:teamMember:getTeamMemberRole] Function called at: ${new Date().toISOString()}`,
    );

    const cookieStore = await cookies();
    console.log(
      `[@action:teamMember:getTeamMemberRole] Cookie store created, calling teamMemberDb.getTeamMemberRole`,
    );

    // Track timing for the database call
    const startTime = Date.now();
    const result = await teamMemberDb.getTeamMemberRole(profileId, teamId, cookieStore);
    const duration = Date.now() - startTime;

    console.log(
      `[@action:teamMember:getTeamMemberRole] DB query completed in ${duration}ms with result:`,
      {
        success: result.success,
        error: result.error || 'none',
        hasData: result.data !== undefined && result.data !== null,
        dataType: result.data !== null ? typeof result.data : 'null',
        dataValue: result.data,
      },
    );

    if (result.success) {
      if (result.data) {
        console.log(`[@action:teamMember:getTeamMemberRole] Role found: ${result.data}`);
        console.log(`[@action:teamMember:getTeamMemberRole] Role type: ${typeof result.data}`);

        // Ensure we're returning a string
        if (typeof result.data !== 'string') {
          console.warn(
            `[@action:teamMember:getTeamMemberRole] Role is not a string! Converting from ${typeof result.data} to string`,
          );
          return String(result.data);
        }

        return result.data;
      } else {
        console.warn(
          `[@action:teamMember:getTeamMemberRole] No role found for profile: ${profileId}, team: ${teamId}`,
        );
      }

      return null;
    } else {
      console.error(`[@action:teamMember:getTeamMemberRole] Error getting role: ${result.error}`, {
        profileId,
        teamId,
      });
    }

    return null;
  } catch (error) {
    console.error(`[@action:teamMember:getTeamMemberRole] Error:`, error);
    console.error(`[@action:teamMember:getTeamMemberRole] Stack trace:`, new Error().stack);
    return null;
  }
});

/**
 * Invite a user by email to join a team
 * This sends an email invitation to the provided email and creates a temporary invitation record
 */
export const inviteTeamMemberByEmail = cache(
  async (teamId: string, email: string, role: string) => {
    try {
      // Verify the current user is authenticated
      const user = await getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Basic validation
      if (!email) {
        return { success: false, error: 'Email is required' };
      }

      if (!teamId) {
        return { success: false, error: 'Team ID is required' };
      }

      const cookieStore = await cookies();

      // First try to find if the user already exists (but not in the team)
      // Use the database layer instead of direct Supabase queries
      const result = await teamMemberDb.getAvailableTenantProfilesForTeam(
        user.tenant_id || 'default',
        teamId,
        cookieStore,
      );

      if (!result.success || !result.data) {
        console.error(
          '[@action:teamMemberAction:inviteTeamMemberByEmail] Error looking up users:',
          result.error,
        );
        return { success: false, error: 'Error looking up users' };
      }

      // Check if the user with this email exists in the available profiles
      const existingUser = result.data.find(
        (profile) =>
          profile.email?.toLowerCase() === email.toLowerCase() ||
          profile.user?.email?.toLowerCase() === email.toLowerCase(),
      );

      if (existingUser) {
        // User exists, try to add them directly to the team
        const profileId = existingUser.id;

        // Add the member to the team
        const result = await teamMemberDb.addTeamMember(
          {
            team_id: teamId,
            profile_id: profileId,
            role: role,
          },
          cookieStore,
        );

        if (!result.success) {
          if (result.error?.includes('already a member')) {
            return {
              success: false,
              error: 'User is already a member of this team',
            };
          }

          return {
            success: false,
            error: result.error || 'Failed to add team member',
          };
        }

        // If successful, also apply the role template to set permissions
        const roleResult = await permissionDb.applyRoleTemplate(
          teamId,
          profileId,
          role,
          cookieStore,
        );

        if (!roleResult.success) {
          console.warn(
            'Failed to apply role template, but user was added to team:',
            roleResult.error,
          );
        }

        // Revalidate team-related paths
        revalidatePath('/[locale]/[tenant]/team', 'page');

        return {
          success: true,
          data: { added: true, invited: false },
        };
      } else {
        // User doesn't exist in Supabase, create an invitation
        console.log(
          `[@action:teamMemberAction:inviteTeamMemberByEmail] Creating invitation for ${email} to join team ${teamId} with role ${role}`,
        );

        // Get team details using teamDb instead of direct Supabase query
        const teamResult = await teamDb.getTeamById(teamId, cookieStore);

        if (!teamResult.success || !teamResult.data) {
          console.error(
            '[@action:teamMemberAction:inviteTeamMemberByEmail] Error getting team:',
            teamResult.error,
          );
          return { success: false, error: 'Failed to get team information' };
        }

        const team = teamResult.data;

        // Create an invitation record in the database
        const invitationResult = await teamMemberDb.createTeamInvitation(
          teamId,
          email,
          role,
          user.id,
          cookieStore,
        );

        if (!invitationResult.success || !invitationResult.data) {
          console.error(
            '[@action:teamMemberAction:inviteTeamMemberByEmail] Error creating invitation:',
            invitationResult.error,
          );
          return { success: false, error: 'Failed to create invitation' };
        }

        // Get the invitation token
        const { id: invitationId, token } = invitationResult.data;

        // Get current tenant from the user
        const tenant = user.tenant_id || 'default';

        // Create a sign-up URL with the invitation token
        // Use hardcoded production URL instead of environment variables or localhost
        const signupUrl = `https://automai-eta.vercel.app/en/${tenant}/signup/invite/${token}`;

        // Get admin client for user management
        console.log(`[@action:teamMemberAction:inviteTeamMemberByEmail] Getting admin client...`);
        const adminClient = await createAdminClient();
        console.log(`[@action:teamMemberAction:inviteTeamMemberByEmail] Admin client obtained`);

        console.log(
          `[@action:teamMemberAction:inviteTeamMemberByEmail] Sending invitation email to: ${email}`,
        );

        let emailError = null;

        try {
          // Send a magic link - this is the most reliable approach
          const magicLinkResult = await adminClient.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
              redirectTo: signupUrl,
              data: {
                invitation_token: token,
                invited_team_id: teamId,
                invited_role: role,
                invited_by: user.email,
                team_name: team.name,
              },
            },
          });

          if (magicLinkResult.error) {
            console.error(
              `[@action:teamMemberAction:inviteTeamMemberByEmail] Error sending magic link: ${magicLinkResult.error.message}`,
            );
            emailError = magicLinkResult.error;
          } else {
            console.log(
              `[@action:teamMemberAction:inviteTeamMemberByEmail] Magic link email successfully sent to: ${email}`,
            );
          }
        } catch (err) {
          console.error(
            `[@action:teamMemberAction:inviteTeamMemberByEmail] Exception during email sending:`,
            err,
          );
          emailError = err;
        }

        // Handle any email errors (we still want to return success if the invitation was created)
        if (emailError) {
          console.error(
            '[@action:teamMemberAction:inviteTeamMemberByEmail] Error sending invitation email:',
            emailError,
          );
          // We created the invitation record, but failed to send email
          // We'll still return success, but log the error
          console.warn(
            '[@action:teamMemberAction:inviteTeamMemberByEmail] Invitation created but email sending failed',
          );
        }

        console.log(`[@action:teamMemberAction:inviteTeamMemberByEmail] Invitation sent:
        - Team: ${team.name} (${teamId})
        - Inviter: ${user.email} (${user.id})
        - Invitee: ${email}
        - Role: ${role}
        - Token: ${token}
        - Signup URL: ${signupUrl}
      `);

        // Revalidate team-related paths
        revalidatePath('/[locale]/[tenant]/team', 'page');

        return {
          success: true,
          data: { added: false, invited: true, invitationId },
        };
      }
    } catch (error) {
      console.error(
        '[@action:teamMemberAction:inviteTeamMemberByEmail] Error inviting team member:',
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to invite team member',
      };
    }
  },
);
