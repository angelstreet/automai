import { createClient } from '@/lib/supabase/server';
import { DbResponse } from '@/lib/utils/commonUtils';
import { Workspace } from '@/types/component/workspaceComponentType';
import { cookies } from 'next/headers';

/**
 * Get all workspaces for the current authenticated user
 */
export async function getWorkspacesForCurrentUser(): Promise<DbResponse<Workspace[]>> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');

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
): Promise<DbResponse<Workspace>> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('workspaces')
      .insert([{ name, description }])
      .select()
      .single();

    if (error) {
      console.log(`[@db:workspaceDb:createWorkspace] ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`[@db:workspaceDb:createWorkspace] Successfully created workspace: ${data.name}`);
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

    // Check if this is the default workspace
    const { data: workspace, error: fetchError } = await supabase
      .from('workspaces')
      .select('is_default')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.log(`[@db:workspaceDb:deleteWorkspace] ERROR: ${fetchError.message}`);
      return { success: false, error: fetchError.message };
    }

    if (workspace.is_default) {
      return {
        success: false,
        error: 'Cannot delete the default workspace',
      };
    }

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
 * Set a workspace as default
 */
export async function setDefaultWorkspace(id: string): Promise<DbResponse<null>> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // First, set all workspaces to non-default
    const { error: resetError } = await supabase
      .from('workspaces')
      .update({ is_default: false })
      .neq('id', 'non-existent-id'); // This will update all rows

    if (resetError) {
      console.log(
        `[@db:workspaceDb:setDefaultWorkspace] ERROR resetting defaults: ${resetError.message}`,
      );
      return { success: false, error: resetError.message };
    }

    // Then set the selected workspace as default
    const { error } = await supabase.from('workspaces').update({ is_default: true }).eq('id', id);

    if (error) {
      console.log(`[@db:workspaceDb:setDefaultWorkspace] ERROR setting default: ${error.message}`);
      return { success: false, error: error.message };
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

const workspaceDb = {
  getWorkspacesForCurrentUser,
  createWorkspace,
  deleteWorkspace,
  setDefaultWorkspace,
};

export default workspaceDb;
