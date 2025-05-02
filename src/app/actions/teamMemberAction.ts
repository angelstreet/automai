'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { getUser } from '@/app/actions/userAction';
import permissionDb from '@/lib/db/permissionDb';
import teamMemberDb from '@/lib/db/teamMemberDb';
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
