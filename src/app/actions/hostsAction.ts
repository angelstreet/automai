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
        return {
          success: false,
          error: 'Unauthorized - Please sign in',
        };
      }

      // Get the user's active team ID
      const activeTeamResult = await getUserActiveTeam(user.id);
      const teamId = activeTeamResult.id;
      console.info(`[@action:hosts:getHosts] Getting hosts for team: ${teamId}`);

      // Call hostDb.getHosts with the team ID
      const result = await hostDb.getHosts(teamId);
      console.info(
        `[@action:hosts:getHosts] Result success: ${result.success}, hosts found: ${result.data?.length || 0}`,
      );

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to fetch hosts',
        };
      }

      // If we have a status filter, apply it after fetching
      let filteredData = result.data;
      if (filter?.status) {
        filteredData = filteredData.filter((host) => host.status === filter.status);
      }

      console.info(`[@action:hosts:getHosts] Found hosts: ${filteredData.length}`);
      return { success: true, data: filteredData };
    } catch (error: any) {
      console.error('[@action:hosts:getHosts] Error fetching hosts:', error);
      return { success: false, error: error.message || 'Failed to fetch hosts' };
    }
  },
);

/**
 * Get a specific host by ID
 */
export const getHostById = cache(
  async (id: string): Promise<{ success: boolean; error?: string; data?: Host }> => {
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
      console.error('[@action:hosts:getHostById] Error fetching host:', error);
      return { success: false, error: error.message || 'Failed to fetch host' };
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

    console.info(`[@action:hosts:createHost] Starting host creation for user: ${user.id}`);
    console.info('[@action:hosts:createHost] raw data:', data);
    // Get the active team ID from user context instead of direct cookie access
    const { getUserTeams, createTeam } = await import('@/app/actions/teamAction');

    // Try to get active team first
    let teamId;
    const activeTeamResult = await getUserActiveTeam(user.id);
    if (activeTeamResult && activeTeamResult.id) {
      teamId = activeTeamResult.id;
      console.info(`[@action:hosts:createHost] Using active team: ${teamId}`);
    } else {
      // If no active team, try to get any team the user belongs to
      const teamsResult = await getUserTeams(user.id);
      if (teamsResult && teamsResult.length > 0) {
        teamId = teamsResult[0].id;
        console.info(`[@action:hosts:createHost] Using first available team: ${teamId}`);
      } else {
        // No teams found, create a default personal team
        console.info(`[@action:hosts:createHost] No teams found, creating default personal team`);

        // Pass only valid properties for TeamCreateInput
        const createTeamResult = await createTeam(
          {
            name: 'Personal Team',
            description: 'Default team created for host management',
          },
          user,
        );

        if (createTeamResult && createTeamResult.id) {
          teamId = createTeamResult.id;
          console.info(`[@action:hosts:createHost] Created default team: ${teamId}`);
        } else {
          console.error(`[@action:hosts:createHost] Failed to create default team`);
          return {
            success: false,
            error: 'Failed to create a team for host creation',
          };
        }
      }
    }

    if (!teamId) {
      console.error(
        `[@action:hosts:createHost] No team available for host creation after all attempts`,
      );
      return {
        success: false,
        error: 'No team available for host creation, please create a team first',
      };
    }

    // Explicitly map all fields to ensure field names are correct, especially 'username' to 'user'
    const hostData = {
      name: data.name,
      description: data.description || '',
      type: data.type,
      ip: data.ip,
      port: data.port || (data.type === 'ssh' ? 22 : data.type === 'docker' ? 2375 : 9000),
      user: data.user, // Use the user field from Host type
      password: data.password,
      status: data.status || 'connected',
      is_windows: data.is_windows !== undefined ? data.is_windows : false, // Explicitly handle is_windows
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      team_id: teamId,
      creator_id: user.id,
      tenant_id: user.tenant_id, // Add tenant ID for proper RLS filtering
    };

    // Handle the case where we might receive data from a form with 'username' instead of 'user'
    // This happens when data is coming from the ConnectHostDialog component
    if ((data as any).username && !hostData.user) {
      hostData.user = (data as any).username;
      console.info(
        '[@action:hosts:createHost] Found username field, mapped to user:',
        (data as any).username,
      );
    }

    // CRITICAL FIX: Handle the serialized userData field
    if ((data as any).userData && (!hostData.user || !hostData.password)) {
      try {
        const userData = JSON.parse((data as any).userData);
        if (userData.username && !hostData.user) {
          hostData.user = userData.username;
          console.info(
            '[@action:hosts:createHost] Extracted username from userData:',
            userData.username,
          );
        }
        if (userData.password && !hostData.password) {
          hostData.password = userData.password;
          console.info('[@action:hosts:createHost] Extracted password from userData');
        }
      } catch (e) {
        console.error('[@action:hosts:createHost] Error parsing userData:', e);
      }
    }

    // Add an additional safeguard - if this is an SSH connection, ensure we have user and password
    if (data.type === 'ssh' && (!hostData.user || !hostData.password)) {
      console.error(
        '[@action:hosts:createHost] SSH connection missing required user/password fields:',
        {
          hasUser: !!hostData.user,
          hasPassword: !!hostData.password,
        },
      );
      return {
        success: false,
        error: 'SSH connections require both username and password',
      };
    }

    // Log detailed info about the host before creation
    console.info(`[@action:hosts:createHost] Creating host with data:`, {
      ...hostData,
      password: hostData.password ? '***' : undefined,
    });

    // Call hostDb.createHost with the hostData
    const result = await hostDb.createHost(hostData);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to add host',
      };
    }

    // Verify the status of the created host
    console.info(`[@action:hosts:createHost] New host created with status: ${result.data.status}`);

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');

    console.info(`[@action:hosts:createHost] Successfully created host: ${result.data.id}`);
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error(`[@action:hosts:createHost] Error creating host:`, { error });
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
    console.error('[@action:hosts:deleteHost] Error deleting host:', error);
    return { success: false, error: error.message || 'Failed to delete host' };
  }
}

/**
 * Core connection testing function - handles the actual testing logic without DB operations
 * @private Internal function used by other testing functions
 */
async function testConnectionCore(data: {
  type: string;
  ip: string;
  port?: number;
  username?: string;
  password?: string;
  hostId?: string;
}): Promise<{ success: boolean; error?: string; message?: string; is_windows?: boolean }> {
  try {
    console.info(
      `[@action:hosts:testConnectionCore] Testing connection to ${data.ip}:${data.port || 'default'}`,
    );

    // Log basic connection data without excessive details
    console.info('[@action:hosts:testConnectionCore] Connection data:', {
      type: data.type,
      ip: data.ip,
      hasUsername: !!data.username,
      hasPassword: !!data.password,
    });

    // Convert data to the format expected by hostService.testHostConnection
    const hostData = {
      type: data.type,
      ip: data.ip,
      port: data.port,
      username: data.username, // Keep username as username, not user
      password: data.password,
      hostId: data.hostId,
    };

    // Call the service function that handles the actual testing logic
    const result = await hostService.testHostConnection(hostData);

    // Create response in the format expected by the caller
    const response = {
      success: result.success,
      error: result.error,
      // The service doesn't return a message property directly but may log one
      message: result.error || (result.success ? 'Connection successful' : 'Connection failed'),
      is_windows: result.is_windows || false, // Use is_windows from result or default to false
    };

    // Log concise result summary
    if (result.success) {
      // If the result was successful, we can infer OS type in a real implementation
      // For now just log that the connection was successful
      console.info(`[@action:hosts:testConnectionCore] Connection successful to ${data.ip}`);
    } else {
      // Extract error message in a concise form
      const errorMessage = result.error || 'Unknown error';
      console.error(`[@action:hosts:testConnectionCore] Connection failed to ${data.ip}:`, {
        error: errorMessage,
      });
    }

    return response;
  } catch (error: any) {
    console.error(`[@action:hosts:testConnectionCore] Error testing connection to ${data.ip}:`, {
      error: error.message || 'Unknown error',
    });
    return { success: false, error: error.message || 'Failed to test connection' };
  }
}

/**
 * Test connection to a specific host in the database
 * This function updates the host status and handles DB operations
 */
export async function testHostConnection(
  id: string,
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    console.info(
      `[@action:hosts:testHostConnection] Starting host connection test for host ID: ${id}`,
    );

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

    // Get the host details
    const hostResponse = await getHostById(id);
    if (!hostResponse.success || !hostResponse.data) {
      return {
        success: false,
        error: 'Host not found',
      };
    }

    const host = hostResponse.data;
    console.info(
      `[@action:hosts:testHostConnection] Retrieved host: ${host.name} (${host.ip}:${host.port})`,
    );

    // First update the host to testing state
    await hostDb.updateHostStatus(id, 'testing');
    console.info(`[@action:hosts:testHostConnection] Updated host status to 'testing'`);

    // Use the core testing function
    const result = await testConnectionCore({
      type: host.type,
      ip: host.ip,
      port: host.port,
      username: host.user,
      password: host.password,
      hostId: host.id,
    });

    // Update the host status based on the test result
    await hostDb.updateHostStatus(id, result.success ? 'connected' : 'failed');
    console.info(
      `[@action:hosts:testHostConnection] Updated host status to '${result.success ? 'connected' : 'failed'}'`,
    );

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');

    return result;
  } catch (error: any) {
    console.error(
      `[@action:hosts:testHostConnection] Error testing host connection for ID: ${id}`,
      {
        error,
      },
    );

    // Update status to failed on error
    try {
      const user = await getUser();
      if (user) {
        // Update the host status to failed
        await hostDb.updateHostStatus(id, 'failed');
        console.info(
          `[@action:hosts:testHostConnection] Updated host status to 'failed' after error`,
        );
      }
    } catch (updateError: any) {
      console.error(`[@action:hosts:testHostConnection] Error updating host status to failed:`, {
        error: updateError,
      });
    }

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');
    return { success: false, error: error.message || 'Failed to test connection' };
  }
}

/**
 * Test connection with specific credentials (without requiring an existing host)
 * Used primarily during host creation to verify connection details
 */
export async function testConnection(data: {
  type: string;
  ip: string;
  port?: number;
  username?: string;
  password?: string;
  hostId?: string;
}) {
  try {
    console.info(
      `[@action:hosts:testConnection] Testing connection to ${data.ip}:${data.port || 'default'}`,
    );

    // Use the core testing function
    const result = await testConnectionCore(data);

    // Only log a concise summary of the result
    console.info(
      `[@action:hosts:testConnection] Test result: success=${result.success}, is_windows=${!!result.is_windows}`,
    );

    // Revalidate paths if we have a host ID
    if (data.hostId) {
      revalidatePath('/[locale]/[tenant]/hosts');
    }

    return result;
  } catch (error: any) {
    console.error(`[@action:hosts:testConnection] Error testing connection:`, {
      error: error.message || 'Unknown error',
    });
    return { success: false, error: error.message || 'Failed to test connection' };
  }
}
