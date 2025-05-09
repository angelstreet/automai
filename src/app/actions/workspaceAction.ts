'use server';

import workspaceDb from '@/lib/db/workspaceDb';
import { DbResponse } from '@/lib/utils/commonUtils';
import { Workspace } from '@/types/component/workspaceComponentType';
import { revalidatePath } from 'next/cache';

/**
 * Get all workspaces for the current user
 */
export async function getWorkspaces(): Promise<DbResponse<Workspace[]>> {
  console.log('[@action:workspace:getWorkspaces] Starting to fetch workspaces');

  const result = await workspaceDb.getWorkspacesForCurrentUser();

  if (result.success) {
    console.log(
      `[@action:workspace:getWorkspaces] Successfully fetched ${result.data?.length || 0} workspaces`,
    );
  } else {
    console.log(`[@action:workspace:getWorkspaces] ERROR: ${result.error}`);
  }

  return result;
}

/**
 * Create a new workspace
 */
export async function addWorkspace(
  name: string,
  description?: string,
): Promise<DbResponse<Workspace>> {
  console.log(`[@action:workspace:addWorkspace] Creating workspace: ${name}`);

  const result = await workspaceDb.createWorkspace(name, description);

  if (result.success) {
    console.log(`[@action:workspace:addWorkspace] Successfully created workspace: ${name}`);
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
    revalidatePath('/');
  } else {
    console.log(`[@action:workspace:makeDefaultWorkspace] ERROR: ${result.error}`);
  }

  return result;
}
