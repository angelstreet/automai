/**
 * Host Database Layer
 * Handles database operations for hosts
 */
import { createClient } from '@/lib/supabase/server';

// Types from host component type
import { Host, HostStatus } from '@/types/component/hostComponentType';

/**
 * Standard database response interface
 */
export interface DbResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string;
  count?: number;
}

/**
 * Get all hosts for a team
 */
export async function getHosts(teamId: string): Promise<DbResponse<Host[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('hosts')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    console.log(
      `[@db:hostDb:getHosts] Successfully retrieved ${data?.length || 0} hosts for team: ${teamId}`,
    );
    return { success: true, data };
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
    const supabase = await createClient();

    const { data, error } = await supabase.from('hosts').insert([host]).select().single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
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
