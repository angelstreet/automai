'use server';

import { revalidatePath } from 'next/cache';
import { cache } from 'react';

import { getUserActiveTeam } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import hostDb from '@/lib/db/hostDb';
import hostService from '@/lib/services/hostService';
import { encryptValue, decryptValue } from '@/lib/utils/encryptionUtils';
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

      // Create a promise that will resolve (not reject) after 15 seconds
      const timeoutPromise = new Promise<{ success: false; error: string }>((resolve) => {
        setTimeout(() => {
          console.log('[@action:hosts:getHosts] Request timed out after 15 seconds');
          resolve({ success: false, error: 'Request timed out after 15 seconds' });
        }, 15000); // Increased timeout to 15 seconds
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

      // Race the fetch against the timeout - both will resolve, not reject
      return await Promise.race([fetchPromise, timeoutPromise]);
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
    console.log('[@action:hosts:createHost] Current user:', {
      id: user?.id,
      email: user?.email,
    });

    const activeTeam = await getUserActiveTeam(user?.id ?? '');
    console.log('[@action:hosts:createHost] Active team:', {
      id: activeTeam?.id,
      name: activeTeam?.name,
    });

    if (!activeTeam?.id) {
      return { success: false, error: 'No active team found' };
    }

    // Process authentication data based on authType
    let password: string | undefined = undefined;
    let private_key: string | undefined = undefined;

    // Log the auth type for debugging
    console.log('[@action:hosts:createHost] Processing auth type:', (data as any).authType);

    if ((data as any).authType === 'password' && data.password) {
      // Encrypt password
      password = encryptValue(data.password);
      console.log('[@action:hosts:createHost] Password encrypted successfully');
    } else if ((data as any).authType === 'privateKey' && (data as any).privateKey) {
      // Encrypt private key
      private_key = encryptValue((data as any).privateKey);
      console.log('[@action:hosts:createHost] Private key encrypted successfully');
    }

    // Prepare host data
    const hostData = {
      name: data.name,
      description: data.description || '',
      type: data.type,
      ip: data.ip,
      port: data.port || (data.type === 'ssh' ? 22 : data.type === 'docker' ? 2375 : 9000),
      user: data.user || (data as any).username || '', // Handle username/user field variation
      password: password,
      private_key: private_key,
      auth_type: (data as any).authType || 'password',
      status: data.status || 'connected',
      is_windows: data.is_windows ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      team_id: activeTeam.id,
      creator_id: user?.id ?? '',
    };

    // Log a sanitized version of the host data for debugging
    console.log('[@action:hosts:createHost] Host data being sent to database:', {
      ...hostData,
      password: hostData.password ? '[ENCRYPTED DATA]' : undefined,
      private_key: hostData.private_key ? '[ENCRYPTED DATA]' : undefined,
      // Add relevant checks that the RLS policy looks for
      hasUser: !!hostData.user,
      userLength: hostData.user?.length || 0,
      hasPassword: !!hostData.password,
      hasPrivateKey: !!hostData.private_key,
      teamId: hostData.team_id,
      authType: hostData.auth_type,
    });

    // Basic validation for SSH connections based on auth type
    if (data.type === 'ssh') {
      if (hostData.auth_type === 'password' && (!hostData.user || !hostData.password)) {
        return { success: false, error: 'SSH with password requires username and password' };
      }

      if (hostData.auth_type === 'privateKey' && (!hostData.user || !hostData.private_key)) {
        return {
          success: false,
          error: 'SSH with key authentication requires username and private key',
        };
      }

      // Validate that either password or private_key is provided
      if (!hostData.password && !hostData.private_key) {
        return { success: false, error: 'SSH connections require either password or private key' };
      }
    }

    // Create the host
    const result = await hostDb.createHost(hostData);

    // Log the result
    console.log('[@action:hosts:createHost] Database result:', {
      success: result.success,
      error: result.error || null,
      hasData: !!result.data,
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to add host' };
    }

    // Revalidate for data-modifying operations
    revalidatePath('/[locale]/[tenant]/hosts', 'page');

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('[@action:hosts:createHost] Error:', error);
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

    // Process sensitive data for update
    const updatedData = { ...updates };

    // Handle auth type changes
    if ((updates as any).authType) {
      updatedData.auth_type = (updates as any).authType;
      delete (updatedData as any).authType;
    }

    // Handle password update if provided
    if (
      updatedData.password &&
      ((updatedData as any).auth_type === 'password' || updates.auth_type === 'password')
    ) {
      updatedData.password = encryptValue(updatedData.password);
      console.log('[@action:hosts:updateHost] Password encrypted for update');
    }

    // Handle private key update if provided
    if (
      (updatedData as any).privateKey &&
      ((updatedData as any).auth_type === 'privateKey' || updates.auth_type === 'privateKey')
    ) {
      updatedData.private_key = encryptValue((updatedData as any).privateKey);
      delete (updatedData as any).privateKey;
      console.log('[@action:hosts:updateHost] Private key encrypted for update');
    }

    // Call hostDb.updateHost with id and updates
    const result = await hostDb.updateHost(id, updatedData);
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Host not found or update failed' };
    }

    // Revalidate for data-modifying operations
    revalidatePath('/[locale]/[tenant]/hosts', 'page');

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('[@action:hosts:updateHost] Error:', error);
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
  authType?: 'password' | 'privateKey';
  password?: string;
  privateKey?: string;
  hostId?: string;
}): Promise<{ success: boolean; error?: string; message?: string; is_windows?: boolean }> {
  try {
    console.log('[@action:hosts:testConnection] Testing connection with auth type:', data.authType);

    // Test the connection with either password or private key
    const connectionData = {
      ...data,
      // Don't convert to database field names here - hostService handles that
    };

    // Test the connection
    const result = await hostService.testHostConnection(connectionData);

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
    console.error('[@action:hosts:testConnection] Error:', error);
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
  options?: { skipRevalidation?: boolean },
): Promise<{ success: boolean; error?: string; message?: string; is_windows?: boolean }> {
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
      // Determine which credentials to use based on auth_type
      let credentials;
      if (host.auth_type === 'privateKey' && host.private_key) {
        // For SSH key authentication
        console.log('[@action:hosts:testHostConnection] Testing connection with SSH key auth');

        // Decrypt the private key
        const decryptedKey = decryptValue(host.private_key);
        credentials = {
          type: host.type,
          ip: host.ip,
          port: host.port,
          username: host.user,
          authType: 'privateKey' as const,
          privateKey: decryptedKey,
          hostId: id,
        };
      } else {
        // Default to password authentication or when auth_type is not set
        console.log('[@action:hosts:testHostConnection] Testing connection with password auth');

        // Decrypt the password if it exists
        const decryptedPassword = host.password ? decryptValue(host.password) : '';
        credentials = {
          type: host.type,
          ip: host.ip,
          port: host.port,
          username: host.user,
          authType: 'password' as const,
          password: decryptedPassword,
          hostId: id,
        };
      }

      // Test the connection
      const testResult = await testConnection(credentials);

      // Only update host status if skipRevalidation is not true
      if (!options?.skipRevalidation) {
        await updateHost(id, {
          status: testResult.success ? 'connected' : 'failed',
          updated_at: new Date().toISOString(),
          is_windows: testResult.is_windows || host.is_windows,
        });
      }

      return {
        success: testResult.success,
        error: testResult.error,
        message: testResult.message,
        is_windows: testResult.is_windows,
      };
    } catch (error: any) {
      // Update the host status to failed if there was an error and skipRevalidation is not true
      if (!options?.skipRevalidation) {
        await updateHost(id, {
          status: 'failed',
          updated_at: new Date().toISOString(),
        });
      }

      console.error('[@action:hosts:testHostConnection] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to test connection',
      };
    }
  } catch (error: any) {
    console.error('[@action:hosts:testHostConnection] Error:', error);
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
 * Get a specific host by ID with decrypted credentials
 */
export async function getHostWithDecryptedCredentials(
  id: string,
): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    const result = await getHostById(id);
    if (!result.success || !result.data) {
      return result;
    }

    // Decrypt credentials for use
    const host = { ...result.data };

    if (host.password && host.auth_type === 'password') {
      host.password = decryptValue(host.password);
    }

    if (host.private_key && host.auth_type === 'privateKey') {
      (host as any).privateKey = decryptValue(host.private_key);
    }

    return { success: true, data: host };
  } catch (error: any) {
    console.error('[@action:hosts:getHostWithDecryptedCredentials] Error:', error);
    return { success: false, error: error.message || 'Failed to decrypt host credentials' };
  }
}
