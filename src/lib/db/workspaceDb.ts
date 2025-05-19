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
        workspace_type: (workspace_type) =>
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

const workspaceDb = {
  getWorkspacesForCurrentUser,
  createWorkspace,
  deleteWorkspace,
  updateActiveWorkspace,
  getCurrentUserActiveWorkspace,
  setDefaultWorkspace,
};

export default workspaceDb;
