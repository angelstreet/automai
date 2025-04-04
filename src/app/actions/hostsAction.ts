'use server';

import { revalidatePath } from 'next/cache';
import { cache } from 'react';

import { getUserActiveTeam } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import hostDb from '@/lib/db/hostDb';
import hostService from '@/lib/services/hostService';
import { Host } from '@/types/context/hostContextType';

export interface HostFilter {
  status?: string;
}

/**
 * Get all hosts with optional filtering
 */
export const getHosts = cache(
  async (filter?: HostFilter): Promise<{ success: boolean; error?: string; data?: Host[] }> => {
    try {
      // Get current user
      const user = await getUser();
      if (!user) {
        return { success: false, error: 'Unauthorized - Please sign in' };
      }

      // Get the user's active team ID
      const activeTeamResult = await getUserActiveTeam(user.id);
      if (!activeTeamResult?.id) {
        return { success: false, error: 'No active team found' };
      }

      // Get hosts for team
      const result = await hostDb.getHosts(activeTeamResult.id);
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to fetch hosts' };
      }

      // Apply status filter if provided
      let filteredData = result.data;
      if (filter?.status) {
        filteredData = filteredData.filter((host) => host.status === filter.status);
      }

      return { success: true, data: filteredData };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch hosts' };
    }
  },
);

/**
 * Create a new host
 */
export async function createHost(
  data: Omit<Host, 'id'>,
): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    // Get current user
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Get active team directly
    const activeTeam = await getUserActiveTeam(user.id);
    if (!activeTeam?.id) {
      return {
        success: false,
        error: 'No active team found. Please select a team first.',
      };
    }

    // Prepare host data with simplified mapping
    const hostData = {
      name: data.name,
      description: data.description || '',
      type: data.type,
      ip: data.ip,
      port: data.port || (data.type === 'ssh' ? 22 : data.type === 'docker' ? 2375 : 9000),
      user: data.user || (data as any).username || '', // Handle username/user field variation
      password: data.password,
      status: data.status || 'connected',
      is_windows: data.is_windows ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      team_id: activeTeam.id,
      creator_id: user.id,
    };

    // Basic validation for SSH connections
    if (data.type === 'ssh' && (!hostData.user || !hostData.password)) {
      return {
        success: false,
        error: 'SSH connections require both username and password',
      };
    }

    // Create the host
    const result = await hostDb.createHost(hostData);
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to add host',
      };
    }

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error(`[@action:hosts:createHost] Error:`, error.message);
    return { success: false, error: error.message || 'Failed to add host' };
  }
}

/**
 * Update an existing host
 */
export async function updateHost(
  id: string,
  updates: Partial<Omit<Host, 'id'>>,
): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    if (!id) {
      return { success: false, error: 'Host ID is required' };
    }

    // Get current user
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Call hostDb.updateHost with id and updates
    const result = await hostDb.updateHost(id, updates);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Host not found or update failed',
      };
    }

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('[@action:hosts:updateHost] Error updating host:', error);
    return { success: false, error: error.message || 'Failed to update host' };
  }
}

/**
 * Get a specific host by ID
 */
export async function getHostById(
  id: string,
): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    if (!id) {
      return { success: false, error: 'Host ID is required' };
    }

    // Get current user
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Call the hostDb.getHostById method
    const result = await hostDb.getHostById(id);
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Host not found' };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('[@action:hosts:getHostById] Error:', error.message);
    return { success: false, error: error.message || 'Failed to fetch host' };
  }
}

/**
 * Delete a host by ID
 */
export async function deleteHost(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) {
      return { success: false, error: 'Host ID is required' };
    }

    // Get current user
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Get the host first to verify it exists
    const hostResult = await getHostById(id);
    if (!hostResult.success || !hostResult.data) {
      return { success: false, error: 'Host not found' };
    }

    // Call hostDb.deleteHost with id
    const result = await hostDb.deleteHost(id);
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to delete host' };
    }

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');
    return { success: true };
  } catch (error: any) {
    console.error('[@action:hosts:deleteHost] Error:', error.message);
    return { success: false, error: error.message || 'Failed to delete host' };
  }
}

/**
 * Test connection with specific credentials
 */
export async function testConnection(data: {
  type: string;
  ip: string;
  port?: number;
  username?: string;
  password?: string;
  hostId?: string;
}): Promise<{ success: boolean; error?: string; message?: string; is_windows?: boolean }> {
  try {
    // Create connection data object
    const hostData = {
      type: data.type,
      ip: data.ip,
      port: data.port,
      username: data.username,
      password: data.password,
      hostId: data.hostId,
    };

    // Test the connection
    const result = await hostService.testHostConnection(hostData);

    // Format the response
    const response = {
      success: result.success,
      error: result.error,
      message: result.error || (result.success ? 'Connection successful' : 'Connection failed'),
      is_windows: result.is_windows || false,
    };

    // Revalidate if host ID is provided
    if (data.hostId) {
      revalidatePath('/[locale]/[tenant]/hosts');
    }

    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to test connection',
    };
  }
}

/**
 * Test connection to a specific host in the database
 */
export async function testHostConnection(
  id: string,
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    if (!id) {
      return { success: false, error: 'Host ID is required' };
    }

    // Get current user and validate
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized - Please sign in' };
    }

    // Get the host details
    const hostResponse = await getHostById(id);
    if (!hostResponse.success || !hostResponse.data) {
      return { success: false, error: 'Host not found' };
    }

    const host = hostResponse.data;

    // Update host status to testing
    await hostDb.updateHostStatus(id, 'testing');

    // Test the connection
    const result = await testConnection({
      type: host.type,
      ip: host.ip,
      port: host.port,
      username: host.user,
      password: host.password,
      hostId: host.id,
    });

    // Update status based on result
    await hostDb.updateHostStatus(id, result.success ? 'connected' : 'failed');

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');

    return result;
  } catch (error: any) {
    // Update status to failed on error
    try {
      await hostDb.updateHostStatus(id, 'failed');
    } catch {
      // Ignore update error
    }

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');
    return { success: false, error: error.message || 'Failed to test connection' };
  }
}
