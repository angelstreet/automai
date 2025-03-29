import { createServerClient } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import { createBrowserClient } from '@/lib/supabase';

export type ResourceType =
  | 'hosts'
  | 'repositories'
  | 'deployments'
  | 'cicd_providers'
  | 'cicd_jobs';
export type Operation = 'select' | 'insert' | 'update' | 'delete' | 'execute';

export interface PermissionMatrix {
  id: string;
  team_id: string;
  profile_id: string;
  resource_type: ResourceType;
  can_select: boolean;
  can_insert: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_update_own: boolean;
  can_delete_own: boolean;
  can_execute: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleTemplate {
  id: string;
  name: string;
  permissions: Record<
    ResourceType,
    {
      select: boolean;
      insert: boolean;
      update: boolean;
      delete: boolean;
      update_own: boolean;
      delete_own: boolean;
      execute: boolean;
    }
  >;
  created_at: string;
  updated_at: string;
}

export type PermissionsResult = {
  success: boolean;
  data?: PermissionMatrix[];
  error?: string;
};

export type RoleTemplatesResult = {
  success: boolean;
  data?: RoleTemplate[];
  error?: string;
};

export type RoleTemplateResult = {
  success: boolean;
  data?: RoleTemplate;
  error?: string;
};

// Function to get supabase client
async function getSupabaseClient() {
  return createBrowserClient();
}

/**
 * Get all permissions for a user in a specific team
 */
export async function getUserPermissions(
  profileId: string,
  teamId: string,
): Promise<PermissionsResult> {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('permission_matrix')
      .select('*')
      .eq('profile_id', profileId)
      .eq('team_id', teamId);

    if (error) throw error;

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting permissions',
    };
  }
}

/**
 * Get all available role templates
 */
export async function getRoleTemplates(): Promise<RoleTemplatesResult> {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('role_templates').select('*');

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error fetching role templates:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch role templates',
    };
  }
}

/**
 * Get a specific role template
 */
export async function getRoleTemplate(name: string): Promise<RoleTemplateResult> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('role_templates')
      .select('*')
      .eq('name', name)
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error fetching role template:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to fetch role template',
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
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getSupabaseClient().rpc('apply_role_template', {
      p_team_id: teamId,
      p_profile_id: profileId,
      p_role_name: roleName,
    });

    if (error) throw error;

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error applying role template:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to apply role template',
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
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if permission exists
    const { data: existingPermission, error: fetchError } = await getSupabaseClient()
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
      const { error: updateError } = await getSupabaseClient()
        .from('permission_matrix')
        .update(permissions)
        .eq('id', existingPermission.id);
      error = updateError;
    } else {
      // Insert new permission
      const { error: insertError } = await getSupabaseClient()
        .from('permission_matrix')
        .insert({
          team_id: teamId,
          profile_id: profileId,
          resource_type: resourceType,
          ...permissions,
        });
      error = insertError;
    }

    if (error) throw error;

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error setting user permission:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to set user permission',
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
 * @returns boolean indicating if permission is granted
 */
export async function checkPermission(
  profileId: string,
  teamId: string,
  resourceType: ResourceType,
  operation: Operation,
  creatorId?: string,
): Promise<boolean> {
  try {
    // If operation is update/delete and creatorId matches profileId,
    // check for "own resource" permission
    const isOwnResource =
      (operation === 'update' || operation === 'delete') && creatorId === profileId;

    // Call the database function
    const { data, error } = await getSupabaseClient().rpc('check_permission', {
      p_profile_id: profileId,
      p_team_id: teamId,
      p_resource_type: resourceType,
      p_operation: operation,
      p_is_own_resource: isOwnResource,
    });

    if (error) throw error;

    return data === true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}
