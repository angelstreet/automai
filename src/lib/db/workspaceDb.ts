import { cookies } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { DbResponse } from '@/lib/utils/commonUtils';
import { Workspace } from '@/types/component/workspaceComponentType';

/**
 * Get all workspaces for the current authenticated user
 */
export async function getWorkspacesForCurrentUser(): Promise<DbResponse<Workspace[]>> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase.from('workspaces').select('*').order('name');

    if (error) {
      console.log(`[@db:workspaceDb:getWorkspacesForCurrentUser] ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(
      `[@db:workspaceDb:getWorkspacesForCurrentUser] Successfully retrieved ${data?.length || 0} workspaces`,
    );
    return { success: true, data };
  } catch (error: any) {
    console.log(`[@db:workspaceDb:getWorkspacesForCurrentUser] CATCH ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to retrieve workspaces',
    };
  }
}

/**
 * Create a new workspace for the current user
 */
export async function createWorkspace(
  name: string,
  description?: string,
  workspace_type: 'private' | 'team' = 'private',
  team_id?: string,
): Promise<DbResponse<Workspace>> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Get the current user ID
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.log(`[@db:workspaceDb:createWorkspace] ERROR getting user: ${userError.message}`);
      return { success: false, error: userError.message };
    }

    if (!userData?.user?.id) {
      console.log(`[@db:workspaceDb:createWorkspace] ERROR: No authenticated user found`);
      return { success: false, error: 'No authenticated user found' };
    }

    // Get user's profile to access active_team
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active_team')
      .eq('id', userData.user.id)
      .single();

    if (profileError) {
      console.log(
        `[@db:workspaceDb:createWorkspace] ERROR getting profile: ${profileError.message}`,
      );
      return { success: false, error: profileError.message };
    }

    // For team workspaces, use active_team from profile if team_id not specified
    let selectedTeamId = team_id;
    if (workspace_type === 'team') {
      if (!team_id && !profile.active_team) {
        return {
          success: false,
          error: 'No active team found. Please select a team first.',
        };
      }

      // Use provided team_id or fall back to active_team from profile
      selectedTeamId = team_id || profile.active_team;
    }

    const workspaceData: any = {
      name,
      description,
      workspace_type,
      profile_id: userData.user.id, // Add the profile_id to associate the workspace with the user
    };

    // Only include team_id for team workspaces
    if (workspace_type === 'team' && selectedTeamId) {
      workspaceData.team_id = selectedTeamId;
    }

    console.log(`[@db:workspaceDb:createWorkspace] Inserting workspace with data:`, workspaceData);

    const { data, error } = await supabase
      .from('workspaces')
      .insert([workspaceData])
      .select()
      .single();

    if (error) {
      console.log(`[@db:workspaceDb:createWorkspace] ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(
      `[@db:workspaceDb:createWorkspace] Successfully created workspace: ${data.name}, type: ${workspace_type}${selectedTeamId ? `, team: ${selectedTeamId}` : ''}`,
    );
    return { success: true, data };
  } catch (error: any) {
    console.log(`[@db:workspaceDb:createWorkspace] CATCH ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to create workspace',
    };
  }
}

/**
 * Delete a workspace by ID
 */
export async function deleteWorkspace(id: string): Promise<DbResponse<null>> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { error } = await supabase.from('workspaces').delete().eq('id', id);

    if (error) {
      console.log(`[@db:workspaceDb:deleteWorkspace] ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`[@db:workspaceDb:deleteWorkspace] Successfully deleted workspace: ${id}`);
    return { success: true, data: null };
  } catch (error: any) {
    console.log(`[@db:workspaceDb:deleteWorkspace] CATCH ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to delete workspace',
    };
  }
}

/**
 * Update active workspace in the current user's profile
 * @param workspaceId - ID of the workspace to set as active, null for default (show everything)
 */
export async function updateActiveWorkspace(workspaceId: string | null): Promise<DbResponse<null>> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.log(
        `[@db:workspaceDb:updateActiveWorkspace] ERROR getting user: ${userError.message}`,
      );
      return { success: false, error: userError.message };
    }

    if (!userData?.user?.id) {
      console.log(`[@db:workspaceDb:updateActiveWorkspace] ERROR: No authenticated user found`);
      return { success: false, error: 'No authenticated user found' };
    }

    // Update the active_workspace field in the user's profile
    const { error } = await supabase
      .from('profiles')
      .update({ active_workspace: workspaceId })
      .eq('id', userData.user.id);

    if (error) {
      console.log(`[@db:workspaceDb:updateActiveWorkspace] ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(
      `[@db:workspaceDb:updateActiveWorkspace] Successfully updated active workspace to ${
        workspaceId || 'default (null)'
      }`,
    );
    return { success: true, data: null };
  } catch (error: any) {
    console.log(`[@db:workspaceDb:updateActiveWorkspace] CATCH ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to update active workspace',
    };
  }
}

/**
 * Get the active workspace ID from the current user's profile
 * @returns The active workspace ID or null if using default
 */
export async function getCurrentUserActiveWorkspace(): Promise<DbResponse<string | null>> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.log(
        `[@db:workspaceDb:getCurrentUserActiveWorkspace] ERROR getting user: ${userError.message}`,
      );
      return { success: false, error: userError.message, data: null };
    }

    if (!userData?.user?.id) {
      console.log(
        `[@db:workspaceDb:getCurrentUserActiveWorkspace] ERROR: No authenticated user found`,
      );
      return { success: false, error: 'No authenticated user found', data: null };
    }

    // Get the user's profile to find the active workspace
    const { data, error } = await supabase
      .from('profiles')
      .select('active_workspace')
      .eq('id', userData.user.id)
      .single();

    if (error) {
      console.log(`[@db:workspaceDb:getCurrentUserActiveWorkspace] ERROR: ${error.message}`);
      return { success: false, error: error.message, data: null };
    }

    return {
      success: true,
      data: data.active_workspace,
    };
  } catch (error: any) {
    console.log(`[@db:workspaceDb:getCurrentUserActiveWorkspace] CATCH ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to get active workspace',
      data: null,
    };
  }
}

/**
 * Set a workspace as the default one
 * @param id - ID of the workspace to set as default
 */
export async function setDefaultWorkspace(id: string): Promise<DbResponse<null>> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.log(`[@db:workspaceDb:setDefaultWorkspace] ERROR getting user: ${userError.message}`);
      return { success: false, error: userError.message };
    }

    if (!userData?.user?.id) {
      console.log(`[@db:workspaceDb:setDefaultWorkspace] ERROR: No authenticated user found`);
      return { success: false, error: 'No authenticated user found' };
    }

    // Get the workspace to ensure it belongs to the current user
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single();

    if (workspaceError) {
      console.log(`[@db:workspaceDb:setDefaultWorkspace] ERROR: ${workspaceError.message}`);
      return { success: false, error: workspaceError.message };
    }

    if (workspace.profile_id !== userData.user.id) {
      console.log(
        `[@db:workspaceDb:setDefaultWorkspace] ERROR: Not authorized to modify this workspace`,
      );
      return { success: false, error: 'Not authorized to modify this workspace' };
    }

    // First, clear the default flag from all workspaces for this profile
    const { error: clearError } = await supabase
      .from('workspaces')
      .update({
        is_default: false,
        workspace_type: (workspace_type: string) =>
          workspace_type !== 'default' ? workspace_type : 'private',
      })
      .eq('profile_id', userData.user.id);

    if (clearError) {
      console.log(
        `[@db:workspaceDb:setDefaultWorkspace] ERROR clearing defaults: ${clearError.message}`,
      );
      return { success: false, error: clearError.message };
    }

    // Then set the new default
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ is_default: true, workspace_type: 'default' })
      .eq('id', id);

    if (updateError) {
      console.log(`[@db:workspaceDb:setDefaultWorkspace] ERROR updating: ${updateError.message}`);
      return { success: false, error: updateError.message };
    }

    console.log(
      `[@db:workspaceDb:setDefaultWorkspace] Successfully set workspace ${id} as default`,
    );
    return { success: true, data: null };
  } catch (error: any) {
    console.log(`[@db:workspaceDb:setDefaultWorkspace] CATCH ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to set default workspace',
    };
  }
}

/**
 * Add an item to a workspace
 * @param workspaceId - ID of the workspace
 * @param itemType - Type of item to add
 * @param itemId - ID of the item to add
 */
export async function addItemToWorkspace(
  workspaceId: string,
  itemType: 'deployment' | 'repository' | 'host' | 'config',
  itemId: string,
): Promise<DbResponse<any>> {
  console.log(
    `[@db:workspaceDb:addItemToWorkspace] Adding ${itemType} ${itemId} to workspace ${workspaceId}`,
  );

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Different item types use different mapping tables
    let table: string;
    let mapping: any = {};

    switch (itemType) {
      case 'deployment':
        table = 'jobs_configuration_workspaces';
        mapping = {
          workspace_id: workspaceId,
          config_id: itemId, // Note: Deployments use config_id, not deployment_id
        };
        break;
      case 'repository':
        table = 'repository_workspaces';
        mapping = {
          workspace_id: workspaceId,
          repository_id: itemId,
        };
        break;
      case 'host':
        table = 'hosts_workspaces';
        mapping = {
          workspace_id: workspaceId,
          host_id: itemId,
        };
        break;
      case 'config':
        // Assuming configs use the same table as deployments
        table = 'jobs_configuration_workspaces';
        mapping = {
          workspace_id: workspaceId,
          config_id: itemId,
        };
        break;
      default:
        throw new Error(`Invalid item type: ${itemType}`);
    }

    // Insert the mapping to the appropriate table
    const { data, error } = await supabase.from(table).insert([mapping]).select().single();

    if (error) {
      console.log(`[@db:workspaceDb:addItemToWorkspace] ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`[@db:workspaceDb:addItemToWorkspace] Successfully added ${itemType} to workspace`);

    return { success: true, data };
  } catch (error: any) {
    console.log(`[@db:workspaceDb:addItemToWorkspace] CATCH ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to add item to workspace',
    };
  }
}

/**
 * Remove an item from a workspace
 * @param workspaceId - ID of the workspace
 * @param itemType - Type of item to remove
 * @param itemId - ID of the item to remove
 */
export async function removeItemFromWorkspace(
  workspaceId: string,
  itemType: 'deployment' | 'repository' | 'host' | 'config',
  itemId: string,
): Promise<DbResponse<null>> {
  console.log(
    `[@db:workspaceDb:removeItemFromWorkspace] Removing ${itemType} ${itemId} from workspace ${workspaceId}`,
  );

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Different item types use different mapping tables
    let table: string;
    let conditions: any = { workspace_id: workspaceId };

    switch (itemType) {
      case 'deployment':
        table = 'jobs_configuration_workspaces';
        conditions.config_id = itemId; // Note: Deployments use config_id, not deployment_id
        break;
      case 'repository':
        table = 'repository_workspaces';
        conditions.repository_id = itemId;
        break;
      case 'host':
        table = 'hosts_workspaces';
        conditions.host_id = itemId;
        break;
      case 'config':
        // Assuming configs use the same table as deployments
        table = 'jobs_configuration_workspaces';
        conditions.config_id = itemId;
        break;
      default:
        throw new Error(`Invalid item type: ${itemType}`);
    }

    // Delete the mapping from the appropriate table
    const { error } = await supabase.from(table).delete().match(conditions);

    if (error) {
      console.log(`[@db:workspaceDb:removeItemFromWorkspace] ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(
      `[@db:workspaceDb:removeItemFromWorkspace] Successfully removed ${itemType} from workspace`,
    );

    return { success: true, data: null };
  } catch (error: any) {
    console.log(`[@db:workspaceDb:removeItemFromWorkspace] CATCH ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to remove item from workspace',
    };
  }
}

/**
 * Get the current user's profile
 * @returns The user profile information
 */
export async function getCurrentUserProfile(): Promise<DbResponse<any>> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.log(
        `[@db:workspaceDb:getCurrentUserProfile] ERROR getting user: ${userError.message}`,
      );
      return { success: false, error: userError.message, data: null };
    }

    if (!userData?.user?.id) {
      console.log(`[@db:workspaceDb:getCurrentUserProfile] ERROR: No authenticated user found`);
      return { success: false, error: 'No authenticated user found', data: null };
    }

    // Get the user's profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    if (error) {
      console.log(`[@db:workspaceDb:getCurrentUserProfile] ERROR: ${error.message}`);
      return { success: false, error: error.message, data: null };
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.log(`[@db:workspaceDb:getCurrentUserProfile] CATCH ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to get user profile',
      data: null,
    };
  }
}

/**
 * Get all workspaces containing a specific item
 */
export async function getWorkspacesContainingItem(
  itemType: 'deployment' | 'repository' | 'host' | 'config',
  itemId: string,
): Promise<DbResponse<string[]>> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Determine the correct table and field based on item type
    let table: string;
    let field: string;

    switch (itemType) {
      case 'deployment':
        table = 'jobs_configuration_workspaces';
        field = 'config_id';
        break;
      case 'repository':
        table = 'repository_workspaces';
        field = 'repository_id';
        break;
      case 'host':
        table = 'hosts_workspaces';
        field = 'host_id';
        break;
      case 'config':
        table = 'jobs_configuration_workspaces';
        field = 'config_id';
        break;
      default:
        throw new Error(`Invalid item type: ${itemType}`);
    }

    // Query the appropriate table
    const { data, error } = await supabase.from(table).select('workspace_id').eq(field, itemId);

    if (error) {
      console.log(`[@db:workspaceDb:getWorkspacesContainingItem] ERROR: ${error.message}`);
      return { success: false, error: error.message, data: [] };
    }

    // Extract workspace IDs
    const workspaceIds = data.map((item) => item.workspace_id);

    return { success: true, data: workspaceIds };
  } catch (error: any) {
    console.log(`[@db:workspaceDb:getWorkspacesContainingItem] CATCH ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to get workspaces containing item',
      data: [],
    };
  }
}

/**
 * Get workspace mappings for multiple items at once
 * Returns a map of item IDs to workspace IDs arrays
 */
export async function getBulkWorkspaceMappings(
  itemType: 'deployment' | 'repository' | 'host' | 'config',
  itemIds: string[],
): Promise<DbResponse<Record<string, string[]>>> {
  try {
    if (itemIds.length === 0) {
      console.log('[@db:workspaceDb:getBulkWorkspaceMappings] No item IDs provided');
      return { success: true, data: {} };
    }

    console.log(
      `[@db:workspaceDb:getBulkWorkspaceMappings] Fetching workspaces for ${itemIds.length} ${itemType} items`,
    );

    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Determine the correct table and field based on item type
    let table: string;
    let field: string;

    switch (itemType) {
      case 'deployment':
        table = 'jobs_configuration_workspaces';
        field = 'config_id';
        break;
      case 'repository':
        table = 'repository_workspaces';
        field = 'repository_id';
        break;
      case 'host':
        table = 'hosts_workspaces';
        field = 'host_id';
        break;
      case 'config':
        table = 'jobs_configuration_workspaces';
        field = 'config_id';
        break;
      default:
        throw new Error(`Invalid item type: ${itemType}`);
    }

    // Query the appropriate table for all provided item IDs in a single query
    const { data, error } = await supabase
      .from(table)
      .select(`${field}, workspace_id`)
      .in(field, itemIds);

    if (error) {
      console.log(`[@db:workspaceDb:getBulkWorkspaceMappings] ERROR: ${error.message}`);
      return { success: false, error: error.message, data: {} };
    }

    // Group by item ID
    const mappings: Record<string, string[]> = {};

    // Initialize each item ID with an empty array
    itemIds.forEach((id) => {
      mappings[id] = [];
    });

    // Populate the workspace IDs for each item
    data.forEach((item) => {
      const itemId = item[field];
      if (!mappings[itemId]) {
        mappings[itemId] = [];
      }
      mappings[itemId].push(item.workspace_id);
    });

    console.log(
      `[@db:workspaceDb:getBulkWorkspaceMappings] Successfully fetched workspaces for ${itemIds.length} items`,
    );
    return { success: true, data: mappings };
  } catch (error: any) {
    console.log(`[@db:workspaceDb:getBulkWorkspaceMappings] CATCH ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to get bulk workspace mappings',
      data: {},
    };
  }
}

const workspaceDb = {
  getWorkspacesForCurrentUser,
  createWorkspace,
  deleteWorkspace,
  updateActiveWorkspace,
  getCurrentUserActiveWorkspace,
  setDefaultWorkspace,
  addItemToWorkspace,
  removeItemFromWorkspace,
  getCurrentUserProfile,
  getWorkspacesContainingItem,
  getBulkWorkspaceMappings,
};

export default workspaceDb;
