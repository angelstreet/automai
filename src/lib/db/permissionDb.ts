import { createClient } from '@/lib/supabase/server';

export default {
  formatPermissionsLog,
  getUserPermissions,
  getRoleTemplates,
  getRoleTemplate,
  applyRoleTemplate,
  setUserPermission,
  checkPermission
};
import { 
  PermissionMatrix,
  PermissionsResult,
  RoleTemplatesResult,
  RoleTemplateResult,
  ResourceType,
  Operation,
 } from '@/types/context/permissionsContextType';
import { DbResponse } from './dbUtils';

/**
 * Format permissions into a readable log output
 * @param permissions Array of permission matrices
 * @param profileId User profile ID
 * @param teamId Team ID
 * @returns Formatted log message
 */
export function formatPermissionsLog(
  permissions: PermissionMatrix[],
  profileId: string,
  teamId: string,
): string {
  // Create a header
  let message = `\n[PERMISSIONS LOG] User ID: ${profileId} | Team ID: ${teamId}\n`;
  message += '='.repeat(80) + '\n';

  if (!permissions || permissions.length === 0) {
    return message + 'NO PERMISSIONS FOUND FOR THIS USER\n' + '='.repeat(80);
  }

  // Group by resource type for better readability
  permissions.forEach((perm) => {
    message += `\n🔑 RESOURCE: ${perm.resource_type}\n`;
    message += `   ├─ SELECT:      ${perm.can_select ? '✓ ALLOWED' : '✗ DENIED'}\n`;
    message += `   ├─ INSERT:      ${perm.can_insert ? '✓ ALLOWED' : '✗ DENIED'}\n`;
    message += `   ├─ UPDATE:      ${perm.can_update ? '✓ ALLOWED' : '✗ DENIED'}\n`;
    message += `   ├─ DELETE:      ${perm.can_delete ? '✓ ALLOWED' : '✗ DENIED'}\n`;
    message += `   ├─ UPDATE_OWN:  ${perm.can_update_own ? '✓ ALLOWED' : '✗ DENIED'}\n`;
    message += `   ├─ DELETE_OWN:  ${perm.can_delete_own ? '✓ ALLOWED' : '✗ DENIED'}\n`;
    message += `   └─ EXECUTE:     ${perm.can_execute ? '✓ ALLOWED' : '✗ DENIED'}\n`;
  });

  message += '='.repeat(80);
  return message;
}

/**
 * Get all permissions for a user in a specific team
 */
export async function getUserPermissions(
  profileId: string,
  teamId: string,
  cookieStore?: any,
): Promise<PermissionsResult> {
  try {
    console.log(
      `[@db:permissionDb:getUserPermissions] Getting permissions for profile: ${profileId}, team: ${teamId}`,
    );
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase
      .from('permission_matrix')
      .select('*')
      .eq('profile_id', profileId)
      .eq('team_id', teamId);

    if (error) throw error;

    console.log(
      `[@db:permissionDb:getUserPermissions] Successfully retrieved ${data?.length || 0} permissions`,
    );

    // Add detailed permissions log
    if (data && data.length > 0) {
      console.log(formatPermissionsLog(data, profileId, teamId));
    } else {
      console.log(
        `[@db:permissionDb:getUserPermissions] No permissions found for user: ${profileId}`,
      );
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error('[@db:permissionDb:getUserPermissions] Error getting user permissions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting permissions',
    };
  }
}

/**
 * Get all available role templates
 */
export async function getRoleTemplates(cookieStore?: any): Promise<RoleTemplatesResult> {
  try {
    console.log('[@db:permissionDb:getRoleTemplates] Getting all role templates');
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase.from('role_templates').select('*');

    if (error) throw error;

    console.log(
      `[@db:permissionDb:getRoleTemplates] Successfully retrieved ${data?.length || 0} role templates`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('[@db:permissionDb:getRoleTemplates] Error fetching role templates:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch role templates',
    };
  }
}

/**
 * Get a specific role template
 */
export async function getRoleTemplate(
  name: string,
  cookieStore?: any,
): Promise<RoleTemplateResult> {
  try {
    console.log(`[@db:permissionDb:getRoleTemplate] Getting role template: ${name}`);
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase
      .from('role_templates')
      .select('*')
      .eq('name', name)
      .single();

    if (error) throw error;

    console.log('[@db:permissionDb:getRoleTemplate] Successfully retrieved role template');
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('[@db:permissionDb:getRoleTemplate] Error fetching role template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch role template',
    };
  }
}

/**
 * Apply a role template to a user in a team
 */
export async function applyRoleTemplate(
  teamId: string,
  profileId: string,
  roleName: string,
  cookieStore?: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      `[@db:permissionDb:applyRoleTemplate] Applying role template: ${roleName} to profile: ${profileId} in team: ${teamId}`,
    );
    const supabase = await createClient(cookieStore);
    const { error } = await supabase.rpc('apply_role_template', {
      p_team_id: teamId,
      p_profile_id: profileId,
      p_role_name: roleName,
    });

    if (error) throw error;

    console.log('[@db:permissionDb:applyRoleTemplate] Successfully applied role template');

    // Get and log the permissions that were just applied
    const { data } = await supabase
      .from('permission_matrix')
      .select('*')
      .eq('profile_id', profileId)
      .eq('team_id', teamId);

    if (data && data.length > 0) {
      console.log(formatPermissionsLog(data, profileId, teamId));
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('[@db:permissionDb:applyRoleTemplate] Error applying role template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply role template',
    };
  }
}

/**
 * Set custom permissions for a user in a team
 */
export async function setUserPermission(
  teamId: string,
  profileId: string,
  resourceType: ResourceType,
  permissions: {
    can_select?: boolean;
    can_insert?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
    can_update_own?: boolean;
    can_delete_own?: boolean;
    can_execute?: boolean;
  },
  cookieStore?: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      `[@db:permissionDb:setUserPermission] Setting permissions for profile: ${profileId}, team: ${teamId}, resource: ${resourceType}`,
    );
    const supabase = await createClient(cookieStore);

    // Check if permission exists
    const { data: existingPermission, error: fetchError } = await supabase
      .from('permission_matrix')
      .select('id')
      .eq('team_id', teamId)
      .eq('profile_id', profileId)
      .eq('resource_type', resourceType)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than "no rows returned"
      throw fetchError;
    }

    let error;

    if (existingPermission) {
      // Update existing permission
      console.log(
        `[@db:permissionDb:setUserPermission] Updating existing permission: ${existingPermission.id}`,
      );
      const { error: updateError } = await supabase
        .from('permission_matrix')
        .update(permissions)
        .eq('id', existingPermission.id);
      error = updateError;
    } else {
      // Insert new permission
      console.log('[@db:permissionDb:setUserPermission] Inserting new permission');
      const { error: insertError } = await supabase.from('permission_matrix').insert({
        team_id: teamId,
        profile_id: profileId,
        resource_type: resourceType,
        ...permissions,
      });
      error = insertError;
    }

    if (error) throw error;

    console.log('[@db:permissionDb:setUserPermission] Successfully set user permission');

    // Get and log the updated permissions
    const { data } = await supabase
      .from('permission_matrix')
      .select('*')
      .eq('team_id', teamId)
      .eq('profile_id', profileId)
      .eq('resource_type', resourceType);

    if (data && data.length > 0) {
      console.log(`Permission set for resource ${resourceType}:`);
      console.log(data[0]);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('[@db:permissionDb:setUserPermission] Error setting user permission:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set user permission',
    };
  }
}

/**
 * Check if a user has permission for a specific operation on a resource type
 *
 * @param profileId The user's profile ID
 * @param teamId The team ID
 * @param resourceType The type of resource (hosts, repositories, etc.)
 * @param operation The operation (select, insert, update, delete, execute)
 * @param creatorId The creator of the resource (optional, for own-resource checks)
 * @param cookieStore Cookie store for authentication
 * @returns boolean indicating if permission is granted
 */
export async function checkPermission(
  profileId: string,
  teamId: string,
  resourceType: ResourceType,
  operation: Operation,
  creatorId?: string,
  cookieStore?: any,
): Promise<boolean> {
  try {
    console.log(
      `[@db:permissionDb:checkPermission] Checking permission for profile: ${profileId}, team: ${teamId}, resource: ${resourceType}, operation: ${operation}`,
    );

    // If operation is update/delete and creatorId matches profileId,
    // check for "own resource" permission
    const isOwnResource =
      (operation === 'update' || operation === 'delete') && creatorId === profileId;

    const supabase = await createClient(cookieStore);

    // Call the database function
    const { data, error } = await supabase.rpc('check_permission', {
      p_profile_id: profileId,
      p_team_id: teamId,
      p_resource_type: resourceType,
      p_operation: operation,
      p_is_own_resource: isOwnResource,
    });

    if (error) throw error;

    // Log the permission check result in a more detailed way
    const result = data === true;
    console.log(`
[@db:permissionDb:checkPermission] PERMISSION CHECK RESULT:
┌─────────────────────────────────────────────────┐
│ User ID:      ${profileId.substring(0, 8)}...   │
│ Team ID:      ${teamId.substring(0, 8)}...      │
│ Resource:     ${resourceType.padEnd(15)}        │
│ Operation:    ${operation.padEnd(15)}           │
│ Own Resource: ${isOwnResource ? 'Yes' : 'No'}   │
│ RESULT:       ${result ? '✓ ALLOWED' : '✗ DENIED'} │
└─────────────────────────────────────────────────┘
    `);

    return result;
  } catch (error) {
    console.error('[@db:permissionDb:checkPermission] Error checking permission:', error);
    return false;
  }
}