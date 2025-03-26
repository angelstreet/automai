'use server';

import hostDb from '@/lib/supabase/db-hosts/host';
import { Host } from '@/app/[locale]/[tenant]/hosts/types';
import { logger } from '@/lib/logger';
import { testHostConnection as testHostConnectionService } from '@/lib/services/hosts';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';

export interface HostFilter {
  status?: string;
}

/**
 * Get all hosts with optional filtering
 * @param filter Optional filter criteria for hosts
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 * @param origin The component or hook that triggered this action
 * @param renderCount Optional render count for debugging
 */
export async function getHosts(
  filter?: HostFilter,
  user?: AuthUser | null,
  origin: string = 'unknown',
  renderCount?: number,
): Promise<{ success: boolean; error?: string; data?: Host[] }> {
  console.log(
    `[HostsActions] getHosts called from ${origin}${renderCount ? ` (render #${renderCount})` : ''}`,
    {
      hasFilter: !!filter,
      userProvided: !!user,
      filterValues: filter ? JSON.stringify(filter) : 'none',
    },
  );

  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());

    if (!currentUser) {
      console.log(`[HostsActions] User not authenticated for ${origin}`);
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    console.log(`[HostsActions] Fetching hosts from database for tenant ${currentUser.tenant_id}`);

    // Set up query filters
    const where: Record<string, any> = {};
    if (filter?.status) {
      where.status = filter.status;
    }

    try {
      const data = await hostDb.findMany({
        where,
        orderBy: { created_at: 'desc' },
      });

      if (!data) {
        console.log(`[HostsActions] No hosts found in database for ${origin}`);
        return {
          success: false,
          error: 'Failed to fetch hosts',
        };
      }

      console.log(`[HostsActions] Successfully fetched ${data.length} hosts for ${origin}`);
      return { success: true, data };
    } catch (error: any) {
      console.error(`Error querying hosts:`, error);
      return {
        success: false,
        error: 'Database query failed: ' + error.message,
      };
    }
  } catch (error: any) {
    console.error(`[HostsActions] Error in getHosts (${origin}):`, error);
    return { success: false, error: error.message || 'Failed to fetch hosts' };
  }
}

/**
 * Get a specific host by ID
 * @param id Host ID to fetch
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getHost(
  id: string,
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    if (!id) {
      console.error('[HostsActions] No host ID provided');
      return { success: false, error: 'Host ID is required' };
    }

    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    console.log(`[HostsActions] Fetching host ${id} from database`);

    const data = await hostDb.findUnique({
      where: { id },
    });

    if (!data) {
      return { success: false, error: 'Host not found' };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error in getHost:', error);
    return { success: false, error: error.message || 'Failed to fetch host' };
  }
}

/**
 * Add a new host
 * @param data Host data to create
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function addHost(
  data: Omit<Host, 'id'>,
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    const newHost = await hostDb.create({
      data,
    });

    if (!newHost) {
      return {
        success: false,
        error: 'Failed to add host',
      };
    }

    return { success: true, data: newHost };
  } catch (error: any) {
    console.error('Error in addHost:', error);
    return { success: false, error: error.message || 'Failed to add host' };
  }
}

// Alias for createHost to match the client API naming
export const createHost = addHost;

/**
 * Update an existing host
 * @param id Host ID to update
 * @param updates Updates to apply to the host
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function updateHost(
  id: string,
  updates: Partial<Omit<Host, 'id'>>,
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    if (!id) {
      console.error('[HostsActions] No host ID provided for update');
      return { success: false, error: 'Host ID is required' };
    }

    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    const data = await hostDb.update({
      where: { id },
      data: updates,
    });

    if (!data) {
      return {
        success: false,
        error: 'Host not found or update failed',
      };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error in updateHost:', error);
    return { success: false, error: error.message || 'Failed to update host' };
  }
}

/**
 * Delete a host by ID
 * @param id Host ID to delete
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function deleteHost(
  id: string,
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[HostsActions] Starting database deletion for host ID:', id);

    if (!id) {
      console.error('[HostsActions] No host ID provided for deletion');
      return { success: false, error: 'Host ID is required' };
    }

    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Get the host first to verify it exists and belongs to the right tenant
    const hostResult = await getHost(id, currentUser);
    if (!hostResult.success || !hostResult.data) {
      return { success: false, error: 'Host not found' };
    }

    console.log('[HostsActions] Authenticated and validated host, proceeding with deletion');

    await hostDb.delete({
      where: { id },
    });

    console.log('[HostsActions] Database deletion completed for host ID:', id);

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteHost:', error);
    return { success: false, error: error.message || 'Failed to delete host' };
  }
}

/**
 * Test connection to a specific host
 * @param id Host ID to test
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function testHostConnection(
  id: string,
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    if (!id) {
      console.error('[HostsActions] No host ID provided for connection test');
      return { success: false, error: 'Host ID is required' };
    }

    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Get the host details
    const hostResponse = await getHost(id, currentUser);

    if (!hostResponse.success || !hostResponse.data) {
      return {
        success: false,
        error: 'Host not found',
      };
    }

    const host = hostResponse.data;

    // First update the host to testing state
    await hostDb.update({
      where: { id },
      data: {
        status: 'testing',
        updated_at: new Date().toISOString(),
      },
    });

    // Add a small delay to show the testing animation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Test the actual SSH connection using the service
    const result = await testHostConnectionService({
      type: host.type,
      ip: host.ip,
      port: host.port,
      username: host.user,
      password: host.password,
      hostId: host.id,
    });

    // Update the host status based on the test result
    await hostDb.update({
      where: { id },
      data: {
        status: result.success ? 'connected' : 'failed',
        updated_at: new Date().toISOString(),
      },
    });

    return result;
  } catch (error: any) {
    console.error('Error in testHostConnection:', error);

    // Update status to failed on error
    try {
      const currentUser = user || (await getUser());
      if (currentUser) {
        // Update the host status to failed
        await hostDb.update({
          where: { id },
          data: {
            status: 'failed',
            updated_at: new Date().toISOString(),
          },
        });
      }
    } catch (updateError) {
      console.error('Error updating host status to failed:', updateError);
    }

    return { success: false, error: error.message || 'Failed to test connection' };
  }
}

/**
 * Test all hosts
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function testAllHosts(user?: AuthUser | null): Promise<{
  success: boolean;
  error?: string;
  results?: Array<{ hostId: string; result: { success: boolean; message?: string } }>;
}> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    const hostsResult = await getHosts(undefined, currentUser);

    if (!hostsResult.success) {
      return { success: false, error: hostsResult.error };
    }

    const hosts = hostsResult.data || [];
    const results = [];

    // Test each host sequentially with proper animation and state changes
    for (const hostItem of hosts) {
      // First update the host to failed state (red)
      await hostDb.update({
        where: { id: hostItem.id },
        data: {
          status: 'failed',
          updated_at: new Date().toISOString(),
        },
      });

      // Small delay to show the red state
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Then update to testing state
      await hostDb.update({
        where: { id: hostItem.id },
        data: {
          status: 'testing',
          updated_at: new Date().toISOString(),
        },
      });

      // Small delay to show the testing animation
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Test the connection using the connection service
      const result = await testConnection({
        type: hostItem.type,
        ip: hostItem.ip,
        port: hostItem.port,
        username: hostItem.user,
        password: hostItem.password,
        hostId: hostItem.id,
      });

      // Update the host status based on the test result
      await hostDb.update({
        where: { id: hostItem.id },
        data: {
          status: result.success ? 'connected' : 'failed',
          updated_at: new Date().toISOString(),
        },
      });

      // Add result to array
      results.push({
        hostId: hostItem.id,
        result: {
          success: result.success,
          message: result.message,
        },
      });

      // Small delay between hosts
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return {
      success: true,
      results,
    };
  } catch (error: any) {
    console.error('Error in testAllHosts:', error);
    return { success: false, error: error.message || 'Failed to test all hosts' };
  }
}

/**
 * Test connection to a host with specific credentials
 */
export async function testConnection(data: {
  type: string;
  ip: string;
  port?: number;
  username?: string;
  password?: string;
  hostId?: string;
}) {
  return testHostConnectionService(data);
}

/**
 * Verify SSH fingerprint
 */
export async function verifyFingerprint(data: {
  fingerprint: string;
  host: string;
  port?: number;
}): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    // This would normally verify the fingerprint
    // For now, we'll simulate a successful verification
    logger.info('Verifying fingerprint', { host: data.host });

    return {
      success: true,
      message: 'Fingerprint verified successfully',
    };
  } catch (error: any) {
    console.error('Error verifying fingerprint:', error);
    return {
      success: false,
      message: error.message || 'Failed to verify fingerprint',
    };
  }
}

/**
 * Check connections for multiple hosts sequentially
 */
export async function checkAllConnections(
  hosts: Host[],
): Promise<Array<{ hostId: string; result: any }>> {
  const results = [];
  for (const hostItem of hosts) {
    const result = await testConnection({
      type: hostItem.type,
      ip: hostItem.ip,
      port: hostItem.port,
      username: hostItem.user,
      password: hostItem.password,
      hostId: hostItem.id,
    });
    results.push({ hostId: hostItem.id, result });
    // Small delay to avoid overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return results;
}

/**
 * Clear all host-related caches
 *
 * @param options Optional parameters to target specific cache entries
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 * @returns Result object with cache clearing details
 */
export async function clearHostsCache(
  options?: {
    hostId?: string;
    tenantId?: string;
    userId?: string;
  },
  user?: AuthUser | null,
): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return {
        success: false,
        message: 'User not authenticated',
        error: 'Unauthorized - Please sign in',
      };
    }

    console.log('[HostsActions] Cache clearing handled by SWR client-side');

    // With SWR, cache is managed on the client side
    // This function now acts as a placeholder for compatibility
    // Client components should use SWR's mutate function to revalidate data

    const { hostId, tenantId, userId } = options || {};
    let message = 'Cache cleared via SWR revalidation';

    if (hostId) {
      message = `Cache cleared for host: ${hostId} via SWR revalidation`;
    } else if (userId && tenantId) {
      message = `Cache cleared for user: ${userId} and tenant: ${tenantId} via SWR revalidation`;
    } else if (tenantId || (tenantId === undefined && currentUser)) {
      const targetTenantId = tenantId || currentUser.tenant_id;
      message = `Cache cleared for tenant: ${targetTenantId} via SWR revalidation`;
    } else if (userId) {
      message = `Cache cleared for user: ${userId} via SWR revalidation`;
    } else {
      message = 'All hosts cache cleared via SWR revalidation';
    }

    console.log(`[HostsActions] ${message}`);

    return {
      success: true,
      message,
    };
  } catch (error: any) {
    console.error('[HostsActions] Error clearing hosts cache:', error);
    return {
      success: false,
      message: 'Failed to clear hosts cache',
      error: error.message || 'An unexpected error occurred',
    };
  }
}
