'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { cache } from 'react';

import workspaceDb from '@/lib/db/workspaceDb';
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
    const cookieStore = await cookies();

    // Get the current user from the db layer to avoid using Supabase directly
    const { data: profile } = await workspaceDb.getCurrentUserProfile();

    if (!profile || !profile.id) {
      console.log('[@action:workspace:getUserTeams] No authenticated user found');
      return {
        success: false,
        error: 'No authenticated user found',
        data: [],
      };
    }

    // Import teamDb dynamically to avoid circular dependencies
    const { getUserTeams } = await import('@/lib/db/teamDb');
    const result = await getUserTeams(profile.id, cookieStore);

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
    // Call the db layer function to handle the database operation
    const result = await workspaceDb.addItemToWorkspace(workspaceId, itemType, itemId);

    if (result.success) {
      console.log(
        `[@action:workspace:addItemToWorkspace] Successfully added ${itemType} to workspace`,
      );
      // Revalidate relevant paths
      revalidatePath('/');
    } else {
      console.log(`[@action:workspace:addItemToWorkspace] ERROR: ${result.error}`);
    }

    return result;
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
    // Call the db layer function to handle the database operation
    const result = await workspaceDb.removeItemFromWorkspace(workspaceId, itemType, itemId);

    if (result.success) {
      console.log(
        `[@action:workspace:removeItemFromWorkspace] Successfully removed ${itemType} from workspace`,
      );
      // Revalidate relevant paths
      revalidatePath('/');
    } else {
      console.log(`[@action:workspace:removeItemFromWorkspace] ERROR: ${result.error}`);
    }

    return result;
  } catch (error: any) {
    console.error('[@action:workspace:removeItemFromWorkspace] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Failed to remove item from workspace',
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
  console.log(
    `[@action:workspace:getWorkspacesContainingItem] Getting workspaces containing ${itemType} ${itemId}`,
  );

  try {
    const result = await workspaceDb.getWorkspacesContainingItem(itemType, itemId);

    if (result.success) {
      console.log(
        `[@action:workspace:getWorkspacesContainingItem] Found ${result.data?.length || 0} workspaces`,
      );
    } else {
      console.log(`[@action:workspace:getWorkspacesContainingItem] ERROR: ${result.error}`);
    }

    return result;
  } catch (error: any) {
    console.error('[@action:workspace:getWorkspacesContainingItem] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get workspaces containing item',
      data: [],
    };
  }
}

/**
 * Get workspaces for multiple items at once
 * This is a performance optimization to avoid making multiple separate API calls
 */
export async function getBulkWorkspaceMappings(
  itemType: 'deployment' | 'repository' | 'host' | 'config',
  itemIds: string[],
): Promise<DbResponse<Record<string, string[]>>> {
  console.log(
    `[@action:workspace:getBulkWorkspaceMappings] Getting workspaces for ${itemIds.length} ${itemType} items`,
  );

  try {
    const result = await workspaceDb.getBulkWorkspaceMappings(itemType, itemIds);

    if (result.success) {
      const totalMappings = Object.values(result.data || {}).reduce(
        (acc, workspaces) => acc + workspaces.length,
        0,
      );
      console.log(
        `[@action:workspace:getBulkWorkspaceMappings] Found ${totalMappings} workspace mappings for ${itemIds.length} items`,
      );
    } else {
      console.log(`[@action:workspace:getBulkWorkspaceMappings] ERROR: ${result.error}`);
    }

    return result;
  } catch (error: any) {
    console.error('[@action:workspace:getBulkWorkspaceMappings] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get bulk workspace mappings',
      data: {},
    };
  }
}
