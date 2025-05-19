'use server';

import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { cookies } from 'next/headers';

import workspaceDb from '@/lib/db/workspaceDb';
import { createClient } from '@/lib/supabase/server';
import { DbResponse } from '@/lib/utils/commonUtils';
import { Workspace, WorkspaceMapping } from '@/types/component/workspaceComponentType';

/**
 * Custom cache storage with TTL for server-side caching
 */
const workspaceCache = new Map<string, { data: Workspace[] | null; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Invalidate workspace-related cache
 * Clears the server-side workspace cache
 */
export async function invalidateWorkspaceCache() {
  // Clear the server-side workspace cache
  workspaceCache.clear();
  console.log('[@action:workspace:invalidateWorkspaceCache] Server-side workspace cache cleared');

  return {
    success: true,
    message: 'Workspace cache invalidated',
  };
}

/**
 * Get all workspaces for the current user with caching
 */
export const getWorkspaces = cache(async (): Promise<DbResponse<Workspace[]>> => {
  console.log('[@action:workspace:getWorkspaces] Starting to fetch workspaces');

  try {
    // Check if cached data exists and is within TTL
    const cacheKey = 'userWorkspaces';
    const cachedEntry = workspaceCache.get(cacheKey);
    const now = Date.now();
    if (cachedEntry && now - cachedEntry.timestamp < CACHE_TTL_MS) {
      console.log('[@action:workspace:getWorkspaces] Using cached workspace data');
      return { success: true, data: cachedEntry.data };
    }

    console.log('[@action:workspace:getWorkspaces] Fetching fresh workspace data from Supabase');
    const result = await workspaceDb.getWorkspacesForCurrentUser();

    if (result.success && result.data) {
      // Update cache with fresh data
      workspaceCache.set(cacheKey, { data: result.data, timestamp: now });
      console.log('[@action:workspace:getWorkspaces] Workspace data cached for 15 minutes');
      console.log(
        `[@action:workspace:getWorkspaces] Successfully fetched ${result.data.length} workspaces`,
      );
    } else {
      console.log(`[@action:workspace:getWorkspaces] ERROR: ${result.error}`);
    }

    return result;
  } catch (error: any) {
    console.error('[@action:workspace:getWorkspaces] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch workspaces',
    };
  }
});

/**
 * Get the active workspace from the user's profile
 */
export const getActiveWorkspace = cache(async (): Promise<DbResponse<string | null>> => {
  console.log('[@action:workspace:getActiveWorkspace] Getting active workspace from profile');

  try {
    const result = await workspaceDb.getCurrentUserActiveWorkspace();

    if (result.success) {
      console.log(
        `[@action:workspace:getActiveWorkspace] Active workspace: ${result.data || 'default (null)'}`,
      );
    } else {
      console.log(`[@action:workspace:getActiveWorkspace] ERROR: ${result.error}`);
    }

    return result;
  } catch (error: any) {
    console.error('[@action:workspace:getActiveWorkspace] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get active workspace',
    };
  }
});

/**
 * Get all teams the current user belongs to
 */
export const getUserTeams = cache(async (): Promise<DbResponse<any[]>> => {
  console.log('[@action:workspace:getUserTeams] Getting user teams');

  try {
    // Get current user's ID
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      console.log('[@action:workspace:getUserTeams] No authenticated user found');
      return {
        success: false,
        error: 'No authenticated user found',
        data: [],
      };
    }

    // Import teamDb dynamically to avoid circular dependencies
    const { getUserTeams } = await import('@/lib/db/teamDb');
    const result = await getUserTeams(userData.user.id, cookieStore);

    if (result.success) {
      console.log(`[@action:workspace:getUserTeams] Found ${result.data?.length || 0} teams`);
    } else {
      console.log(`[@action:workspace:getUserTeams] ERROR: ${result.error}`);
    }

    return result;
  } catch (error: any) {
    console.error('[@action:workspace:getUserTeams] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get user teams',
      data: [],
    };
  }
});

/**
 * Create a new workspace
 */
export async function addWorkspace(
  name: string,
  description?: string,
  workspace_type: 'private' | 'team' = 'private',
  team_id?: string,
): Promise<DbResponse<Workspace>> {
  console.log(
    `[@action:workspace:addWorkspace] Creating workspace: ${name}, type: ${workspace_type}${team_id ? `, team: ${team_id}` : ''}`,
  );

  const result = await workspaceDb.createWorkspace(name, description, workspace_type, team_id);

  if (result.success) {
    console.log(`[@action:workspace:addWorkspace] Successfully created workspace: ${name}`);
    // Invalidate cache after creating a new workspace
    await invalidateWorkspaceCache();
    revalidatePath('/');
  } else {
    console.log(`[@action:workspace:addWorkspace] ERROR: ${result.error}`);
  }

  return result;
}

/**
 * Delete a workspace by ID
 */
export async function removeWorkspace(id: string): Promise<DbResponse<null>> {
  console.log(`[@action:workspace:removeWorkspace] Deleting workspace: ${id}`);

  const result = await workspaceDb.deleteWorkspace(id);

  if (result.success) {
    console.log(`[@action:workspace:removeWorkspace] Successfully deleted workspace: ${id}`);
    // Invalidate cache after deleting a workspace
    await invalidateWorkspaceCache();
    revalidatePath('/');
  } else {
    console.log(`[@action:workspace:removeWorkspace] ERROR: ${result.error}`);
  }

  return result;
}

/**
 * Set a workspace as default
 */
export async function makeDefaultWorkspace(id: string): Promise<DbResponse<null>> {
  console.log(`[@action:workspace:makeDefaultWorkspace] Setting workspace as default: ${id}`);

  const result = await workspaceDb.setDefaultWorkspace(id);

  if (result.success) {
    console.log(
      `[@action:workspace:makeDefaultWorkspace] Successfully set workspace as default: ${id}`,
    );
    // Invalidate cache after setting a new default workspace
    await invalidateWorkspaceCache();
    revalidatePath('/');
  } else {
    console.log(`[@action:workspace:makeDefaultWorkspace] ERROR: ${result.error}`);
  }

  return result;
}

/**
 * Set active workspace for the current user's profile
 * Setting to null means using the default (show everything)
 */
export async function setActiveWorkspace(workspaceId: string | null): Promise<DbResponse<null>> {
  console.log(
    `[@action:workspace:setActiveWorkspace] Setting active workspace: ${workspaceId || 'default (null)'}`,
  );

  const result = await workspaceDb.updateActiveWorkspace(workspaceId);

  if (result.success) {
    console.log(
      `[@action:workspace:setActiveWorkspace] Successfully set active workspace: ${workspaceId || 'default (null)'}`,
    );
    // No need to invalidate workspace cache as this only affects the profile
    revalidatePath('/');
  } else {
    console.log(`[@action:workspace:setActiveWorkspace] ERROR: ${result.error}`);
  }

  return result;
}

/**
 * Add an item to a workspace
 */
export async function addItemToWorkspace(
  workspaceId: string,
  itemType: 'deployment' | 'repository' | 'host' | 'config',
  itemId: string,
): Promise<DbResponse<WorkspaceMapping>> {
  console.log(
    `[@action:workspace:addItemToWorkspace] Adding ${itemType} ${itemId} to workspace ${workspaceId}`,
  );

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Create the mapping object based on item type
    const mapping: any = {
      workspace_id: workspaceId,
    };

    // Add the appropriate item ID field based on type
    switch (itemType) {
      case 'deployment':
        mapping.deployment_id = itemId;
        break;
      case 'repository':
        mapping.repository_id = itemId;
        break;
      case 'host':
        mapping.host_id = itemId;
        break;
      case 'config':
        mapping.config_id = itemId;
        break;
      default:
        throw new Error(`Invalid item type: ${itemType}`);
    }

    // Insert the mapping
    const { data, error } = await supabase
      .from('workspace_mappings')
      .insert([mapping])
      .select()
      .single();

    if (error) {
      console.log(`[@action:workspace:addItemToWorkspace] ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(
      `[@action:workspace:addItemToWorkspace] Successfully added ${itemType} to workspace`,
    );

    // Revalidate relevant paths
    revalidatePath('/');

    return { success: true, data };
  } catch (error: any) {
    console.error('[@action:workspace:addItemToWorkspace] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Failed to add item to workspace',
    };
  }
}

/**
 * Remove an item from a workspace
 */
export async function removeItemFromWorkspace(
  workspaceId: string,
  itemType: 'deployment' | 'repository' | 'host' | 'config',
  itemId: string,
): Promise<DbResponse<null>> {
  console.log(
    `[@action:workspace:removeItemFromWorkspace] Removing ${itemType} ${itemId} from workspace ${workspaceId}`,
  );

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Create the query conditions based on item type
    const conditions: any = {
      workspace_id: workspaceId,
    };

    // Add the appropriate item ID condition based on type
    switch (itemType) {
      case 'deployment':
        conditions.deployment_id = itemId;
        break;
      case 'repository':
        conditions.repository_id = itemId;
        break;
      case 'host':
        conditions.host_id = itemId;
        break;
      case 'config':
        conditions.config_id = itemId;
        break;
      default:
        throw new Error(`Invalid item type: ${itemType}`);
    }

    // Delete the mapping
    const { error } = await supabase.from('workspace_mappings').delete().match(conditions);

    if (error) {
      console.log(`[@action:workspace:removeItemFromWorkspace] ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(
      `[@action:workspace:removeItemFromWorkspace] Successfully removed ${itemType} from workspace`,
    );

    // Revalidate relevant paths
    revalidatePath('/');

    return { success: true, data: null };
  } catch (error: any) {
    console.error('[@action:workspace:removeItemFromWorkspace] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Failed to remove item from workspace',
    };
  }
}
