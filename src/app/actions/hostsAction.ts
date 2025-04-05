'use server';

import { revalidatePath } from 'next/cache';
import { cache } from 'react';

import { getUserActiveTeam } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import hostDb from '@/lib/db/hostDb';
import hostService from '@/lib/services/hostService';
import { Host, HostStatus } from '@/types/context/hostContextType';

export interface HostFilter {
  status?: string;
}

/**
 * Get all hosts with optional filtering
 */
export const getHosts = cache(
  async (filter?: HostFilter): Promise<{ success: boolean; error?: string; data?: Host[] }> => {
    try {
      // Get current user and team
      const user = await getUser();
      const activeTeamResult = await getUserActiveTeam(user?.id ?? '');
      if (!activeTeamResult?.id) {
        return { success: false, error: 'No active team found' };
      }

      // Create a promise that will reject after 10 seconds
      const timeoutPromise = new Promise<{ success: false; error: string }>((_, reject) => {
        setTimeout(() => {
          console.log('[@action:hosts:getHosts] Request timed out after 10 seconds');
          reject({ success: false, error: 'Request timed out after 10 seconds' });
        }, 10000);
      });

      // Create the actual data fetch promise
      const fetchPromise = new Promise<{ success: boolean; error?: string; data?: Host[] }>(
        async (resolve) => {
          try {
            // Get hosts for team
            const result = await hostDb.getHosts(activeTeamResult.id);
            if (!result.success || !result.data) {
              resolve({ success: false, error: result.error || 'Failed to fetch hosts' });
              return;
            }

            // Apply status filter if provided
            let filteredData = result.data;
            if (filter?.status) {
              filteredData = filteredData.filter((host) => host.status === filter.status);
            }

            resolve({ success: true, data: filteredData });
          } catch (error: any) {
            resolve({ success: false, error: error.message || 'Failed to fetch hosts' });
          }
        },
      );

      // Race the fetch against the timeout
      try {
        return await Promise.race([fetchPromise, timeoutPromise]);
      } catch (error: any) {
        return { success: false, error: error.error || 'Request timed out' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch hosts' };
    }
  },
);

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

    // Call the hostDb.getHostById method
    const result = await hostDb.getHostById(id);
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Host not found' };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch host' };
  }
}

/**
 * Create a new host
 */
export async function createHost(
  data: Omit<Host, 'id'>,
): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    // Get current user and team
    const user = await getUser();
    const activeTeam = await getUserActiveTeam(user?.id ?? '');
    if (!activeTeam?.id) {
      return { success: false, error: 'No active team found' };
    }

    // Prepare host data
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
      creator_id: user?.id ?? '',
    };

    // Basic validation for SSH connections
    if (data.type === 'ssh' && (!hostData.user || !hostData.password)) {
      return { success: false, error: 'SSH connections require both username and password' };
    }

    // Create the host
    const result = await hostDb.createHost(hostData);
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to add host' };
    }

    // Revalidate for data-modifying operations
    revalidatePath('/[locale]/[tenant]/hosts', 'page');

    return { success: true, data: result.data };
  } catch (error: any) {
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

    // Call hostDb.updateHost with id and updates
    const result = await hostDb.updateHost(id, updates);
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Host not found or update failed' };
    }

    // Revalidate for data-modifying operations
    revalidatePath('/[locale]/[tenant]/hosts', 'page');

    return { success: true, data: result.data };
  } catch (error: any) {
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

    // Get the host first to verify it exists
    const hostResult = await getHostById(id);
    if (!hostResult.success || !hostResult.data) {
      return { success: false, error: 'Host not found' };
    }

    // Delete the host
    const result = await hostDb.deleteHost(id);
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to delete host' };
    }

    // Revalidate for data-modifying operations
    revalidatePath('/[locale]/[tenant]/hosts', 'page');

    return { success: true };
  } catch (error: any) {
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
    // Test the connection
    const result = await hostService.testHostConnection(data);

    // Format the response
    const response = {
      success: result.success,
      error: result.error,
      message: result.error || (result.success ? 'Connection successful' : 'Connection failed'),
      is_windows: result.is_windows || false,
    };

    // No revalidation - let the UI handle state updates

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

    // Get the host details
    const hostResponse = await getHostById(id);
    if (!hostResponse.success || !hostResponse.data) {
      return { success: false, error: 'Host not found' };
    }

    const host = hostResponse.data;

    // Update host status to testing
    await updateHost(id, { status: 'testing' });

    try {
      // Test the connection
      const testData = {
        type: host.type,
        ip: host.ip,
        port: host.port,
        username: host.user,
        password: host.password,
        hostId: id,
      };

      const testResult = await testConnection(testData);

      // Update the host status based on the test result
      await updateHost(id, {
        status: testResult.success ? 'connected' : 'failed',
        updated_at: new Date().toISOString(),
        is_windows: testResult.is_windows || host.is_windows,
      });

      // No revalidation - let the UI handle state updates

      return {
        success: testResult.success,
        error: testResult.error,
        message: testResult.message,
      };
    } catch (error: any) {
      // Update the host status to failed if there was an error
      await updateHost(id, {
        status: 'failed',
        updated_at: new Date().toISOString(),
      });

      return {
        success: false,
        error: error.message || 'Failed to test connection',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to test host connection',
    };
  }
}

/**
 * Set host status
 */
export async function setHostStatus(
  id: string,
  status: string | HostStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) {
      return { success: false, error: 'Host ID is required' };
    }

    // Update the host status
    const result = await updateHost(id, {
      status: status as HostStatus,
      updated_at: new Date().toISOString(),
    });
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to update host status' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update host status' };
  }
}

/**
 * Revalidate hosts page
 */
export async function revalidateHosts(): Promise<void> {
  revalidatePath('/[locale]/[tenant]/hosts', 'page');
}
