/**
 * Host Database Layer
 * Handles database operations for hosts
 */
import { createClient } from '@/lib/supabase/server';
import { DbResponse } from '@/lib/utils/commonUtils';
// Types from host component type
import { Host, HostStatus } from '@/types/component/hostComponentType';

/**
 * Get all hosts for a team
 */
export async function getHosts(teamId: string): Promise<DbResponse<Host[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('hosts')
      .select(
        `
        *,
        hosts_workspaces(
          workspace_id
        )
      `,
      )
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // Process the data to include workspace IDs in a cleaner format
    const processedData = data.map((host) => {
      // Format workspace data into an array of workspace IDs
      const workspaces = (host.hosts_workspaces || []).map((mapping) => mapping.workspace_id);

      return {
        ...host,
        workspaces, // Add the array of workspace IDs
        hosts_workspaces: undefined, // Remove the raw mapping data
      };
    });

    console.log(
      `[@db:hostDb:getHosts] Successfully retrieved ${processedData.length || 0} hosts with workspace data for team: ${teamId}`,
    );
    return { success: true, data: processedData };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get hosts' };
  }
}

/**
 * Get a host by ID
 */
export async function getHostById(id: string): Promise<DbResponse<Host>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.from('hosts').select('*').eq('id', id).single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get host' };
  }
}

/**
 * Create a new host
 */
export async function createHost(host: Partial<Host>): Promise<DbResponse<Host>> {
  try {
    console.log('[@db:hostDb:createHost] Input data received:', {
      name: host.name,
      description: host.description,
      type: host.type,
      ip: host.ip,
      ip_local: host.ip_local,
      device_type: host.device_type,
      port: host.port,
      user: host.user,
      username: host.username,
      auth_type: host.auth_type,
      password: host.password ? '[REDACTED]' : null,
      private_key: host.private_key ? '[REDACTED]' : null,
      status: host.status,
      is_windows: host.is_windows,
      team_id: host.team_id,
      creator_id: host.creator_id,
    });

    console.log('[@db:hostDb:createHost] Creating host, data check:', {
      hasUser: !!host.user,
      userLength: host.user?.length || 0,
      hasPassword: !!host.password,
      hasPrivateKey: !!host.private_key,
      hasTeamId: !!host.team_id,
      authType: host.auth_type,
      type: host.type,
      hasIpLocal: !!host.ip_local,
      hasDeviceType: !!host.device_type,
      portValue: host.port,
    });

    const supabase = await createClient();

    // First try with auth_type and private_key fields
    try {
      console.log('[@db:hostDb:createHost] About to insert data into Supabase...');

      const { data, error } = await supabase.from('hosts').insert([host]).select().single();

      if (error) {
        // Log the detailed error
        console.error('[@db:hostDb:createHost] Error inserting host:', {
          code: error.code,
          message: error.message,
          hint: error.hint,
          details: error.details,
        });
        return { success: false, error: error.message };
      }

      console.log('[@db:hostDb:createHost] Host created successfully:', {
        id: data.id,
        name: data.name,
        type: data.type,
        ip: data.ip,
        ip_local: data.ip_local,
        device_type: data.device_type,
        port: data.port,
        status: data.status,
      });
      return { success: true, data };
    } catch (error: any) {
      console.error('[@db:hostDb:createHost] Exception during host creation:', error);
      return { success: false, error: error.message || 'Failed to create host' };
    }
  } catch (error: any) {
    console.error('[@db:hostDb:createHost] Outer exception:', error);
    return { success: false, error: error.message || 'Failed to create host' };
  }
}

/**
 * Update a host
 */
export async function updateHost(id: string, host: Partial<Host>): Promise<DbResponse<Host>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('hosts')
      .update(host)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update host' };
  }
}

/**
 * Update host status
 */
export async function updateHostStatus(id: string, status: HostStatus): Promise<DbResponse<Host>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('hosts')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update host status' };
  }
}

/**
 * Delete a host
 */
export async function deleteHost(id: string): Promise<DbResponse<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('hosts').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete host' };
  }
}

// Default export for all host database operations
const hostDb = {
  getHosts,
  getHostById,
  createHost,
  updateHost,
  updateHostStatus,
  deleteHost,
};

export default hostDb;
