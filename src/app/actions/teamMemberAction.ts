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

      // Update role
      const result = await teamMemberDb.updateTeamMemberRole(teamId, profileId, role, cookieStore);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to update role',
        };
      }

      // Revalidate team-related paths
      revalidatePath('/[locale]/[tenant]/team');

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
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient(cookieStore);

    // Find user by email
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !profileData) {
      return {
        success: false,
        error: `User with email ${email} not found`,
      };
    }

    const profileId = profileData.id;

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
    revalidatePath('/[locale]/[tenant]/team');

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
      revalidatePath('/[locale]/[tenant]/team');

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

    // Remove the member from the team
    const result = await teamMemberDb.removeTeamMember(teamId, profileId, cookieStore);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to remove team member',
      };
    }

    // Revalidate team-related paths
    revalidatePath('/[locale]/[tenant]/team');

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
      revalidatePath('/[locale]/[tenant]/team');

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
