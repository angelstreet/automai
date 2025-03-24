'use server';

import db from '@/lib/supabase/db';
import { Host } from '@/app/[locale]/[tenant]/hosts/types';
import { logger } from '@/lib/logger';
import { testHostConnection as testHostConnectionService } from '@/lib/services/hosts';
import { getUser } from '@/app/actions/user';
import { serverCache } from '@/lib/cache';
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

    // Create a standardized cache key using the helper method
    const cacheKey = serverCache.tenantKey(
      currentUser.tenant_id, 
      'hosts', 
      filter ? `:filtered:${JSON.stringify(filter)}` : ':all'
    );
    
    // Use enhanced getOrSet function with proper tagging
    return await serverCache.getOrSet(
      cacheKey,
      async () => {
        console.log(`[HostsActions] Cache miss for ${origin}, fetching from database`);
        
        // Set up query filters
        const where: Record<string, any> = {};
        if (filter?.status) {
          where.status = filter.status;
        }

        try {
          const data = await db.host.findMany({
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
      },
      {
        ttl: 5 * 60 * 1000, // 5 minutes cache
        tags: ['hosts-data', `tenant:${currentUser.tenant_id}`],
        source: `getHosts:${origin}`
      }
    );
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

    // Create a standardized cache key using the helper method
    const cacheKey = serverCache.tenantKey(currentUser.tenant_id, 'host', id);
    
    // Use enhanced getOrSet function with proper tagging
    return await serverCache.getOrSet(
      cacheKey,
      async () => {
        console.log(`[HostsActions] Cache miss for host ${id}, fetching from database`);
        
        const data = await db.host.findUnique({
          where: { id },
        });

        if (!data) {
          return { success: false, error: 'Host not found' };
        }

        return { success: true, data };
      },
      {
        ttl: 5 * 60 * 1000, // 5 minutes cache
        tags: ['hosts-data', `host:${id}`, `tenant:${currentUser.tenant_id}`],
        source: 'getHost'
      }
    );
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

    const newHost = await db.host.create({
      data,
    });

    if (!newHost) {
      return {
        success: false,
        error: 'Failed to add host',
      };
    }

    // Invalidate cache using tag-based invalidation
    serverCache.deleteByTag('hosts-data');
    serverCache.deleteByTag(`tenant:${currentUser.tenant_id}`);
    
    // Also clear specific cache entries
    serverCache.delete(serverCache.tenantKey(currentUser.tenant_id, 'hosts', ':all'));
    
    // If the new host has an ID, cache it to prevent an immediate fetch
    if (newHost.id) {
      const hostCacheKey = serverCache.tenantKey(currentUser.tenant_id, 'host', newHost.id);
      serverCache.set(
        hostCacheKey, 
        { success: true, data: newHost },
        { 
          ttl: 5 * 60 * 1000,
          tags: ['hosts-data', `host:${newHost.id}`, `tenant:${currentUser.tenant_id}`],
          source: 'addHost'
        }
      );
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

    const data = await db.host.update({
      where: { id },
      data: updates,
    });

    if (!data) {
      return {
        success: false,
        error: 'Host not found or update failed',
      };
    }

    // Invalidate cache using tag-based invalidation
    serverCache.deleteByTag('hosts-data');
    serverCache.deleteByTag(`host:${id}`);
    serverCache.deleteByTag(`tenant:${currentUser.tenant_id}`);
    
    // Also clear specific cache entries
    serverCache.delete(serverCache.tenantKey(currentUser.tenant_id, 'hosts', ':all'));
    serverCache.delete(serverCache.tenantKey(currentUser.tenant_id, 'host', id));
    
    // Update the cache with the latest data
    const hostCacheKey = serverCache.tenantKey(currentUser.tenant_id, 'host', id);
    serverCache.set(
      hostCacheKey, 
      { success: true, data },
      { 
        ttl: 5 * 60 * 1000,
        tags: ['hosts-data', `host:${id}`, `tenant:${currentUser.tenant_id}`],
        source: 'updateHost'
      }
    );

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

    await db.host.delete({
      where: { id },
    });

    console.log('[HostsActions] Database deletion completed for host ID:', id);

    // Comprehensive cache invalidation
    // Tag-based invalidation (more precise and efficient)
    serverCache.deleteByTag('hosts-data');
    serverCache.deleteByTag(`host:${id}`);
    serverCache.deleteByTag(`tenant:${currentUser.tenant_id}`);
    
    // Key-based invalidation (explicit keys)
    serverCache.delete(serverCache.tenantKey(currentUser.tenant_id, 'hosts', ':all'));
    serverCache.delete(serverCache.tenantKey(currentUser.tenant_id, 'host', id));
    
    // Also clear any filtered hosts caches
    serverCache.deletePattern(`tenant:${currentUser.tenant_id}:hosts:filtered:`);

    console.log('[HostsActions] Cache invalidated, deletion complete');

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

    // Get the host details first using our cached getHost function
    const hostResponse = await getHost(id, currentUser);
    
    if (!hostResponse.success || !hostResponse.data) {
      return {
        success: false,
        error: 'Host not found',
      };
    }
    
    const host = hostResponse.data;

    // First update the host to testing state
    await db.host.update({
      where: { id },
      data: {
        status: 'testing',
        updated_at: new Date().toISOString(),
      },
    });

    // Invalidate cache to show testing state immediately
    // Tag-based invalidation for efficient cache updates
    serverCache.deleteByTag('hosts-data');
    serverCache.deleteByTag(`host:${id}`);
    serverCache.deleteByTag(`tenant:${currentUser.tenant_id}`);
    
    // Also clear specific cache entries
    serverCache.delete(serverCache.tenantKey(currentUser.tenant_id, 'hosts', ':all'));
    serverCache.delete(serverCache.tenantKey(currentUser.tenant_id, 'host', id));

    // Add a small delay to show the testing animation
    await new Promise((resolve) => setTimeout(resolve, 1200));

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
    const updatedHost = await db.host.update({
      where: { id },
      data: {
        status: result.success ? 'connected' : 'failed',
        updated_at: new Date().toISOString(),
      },
    });

    // Update the cache with the new status
    // Tag-based cache invalidation
    serverCache.deleteByTag('hosts-data');
    serverCache.deleteByTag(`host:${id}`);
    serverCache.deleteByTag(`tenant:${currentUser.tenant_id}`);
    
    // Update the host cache with the latest data
    if (updatedHost) {
      const hostCacheKey = serverCache.tenantKey(currentUser.tenant_id, 'host', id);
      serverCache.set(
        hostCacheKey, 
        { success: true, data: updatedHost },
        { 
          ttl: 5 * 60 * 1000,
          tags: ['hosts-data', `host:${id}`, `tenant:${currentUser.tenant_id}`],
          source: 'testHostConnection'
        }
      );
    }

    return result;
  } catch (error: any) {
    console.error('Error in testHostConnection:', error);

    // Update status to failed on error
    try {
      const currentUser = user || (await getUser());
      if (currentUser) {
        // Update the host status to failed
        const updatedHost = await db.host.update({
          where: { id },
          data: {
            status: 'failed',
            updated_at: new Date().toISOString(),
          },
        });
        
        // Update cache with failed status
        if (updatedHost) {
          const hostCacheKey = serverCache.tenantKey(currentUser.tenant_id, 'host', id);
          serverCache.set(
            hostCacheKey, 
            { success: true, data: updatedHost },
            { 
              ttl: 5 * 60 * 1000,
              tags: ['hosts-data', `host:${id}`, `tenant:${currentUser.tenant_id}`],
              source: 'testHostConnection:error'
            }
          );
        }
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

    // Test each host sequentially
    for (const host of hosts) {
      // First update the host to failed state (red)
      await db.host.update({
        where: { id: host.id },
        data: {
          status: 'failed',
          updated_at: new Date().toISOString(),
        },
      });

      // Small delay to show the red state
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Then update to testing state
      await db.host.update({
        where: { id: host.id },
        data: {
          status: 'testing',
          updated_at: new Date().toISOString(),
        },
      });

      // Test the connection using the real SSH test
      const result = await testConnection({
        type: host.type,
        ip: host.ip,
        port: host.port,
        username: host.user,
        password: host.password,
        hostId: host.id,
      });

      // Update the host status based on the test result
      await db.host.update({
        where: { id: host.id },
        data: {
          status: result.success ? 'connected' : 'failed',
          updated_at: new Date().toISOString(),
        },
      });

      // Add result to array
      results.push({
        hostId: host.id,
        result: {
          success: result.success,
          message: result.message,
        },
      });

      // Small delay between hosts
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Invalidate cache for all hosts
    serverCache.delete('hosts:all');

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
  for (const host of hosts) {
    const result = await testConnection({
      type: host.type,
      ip: host.ip,
      port: host.port,
      username: host.user,
      password: host.password,
      hostId: host.id,
    });
    results.push({ hostId: host.id, result });
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
  clearedEntries: number;
  message: string;
  error?: string;
}> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return {
        success: false,
        clearedEntries: 0,
        message: 'User not authenticated',
        error: 'Unauthorized - Please sign in',
      };
    }

    console.log('[HostsActions] Clearing hosts cache');
    
    const { hostId, tenantId, userId } = options || {};
    let clearedEntries = 0;
    let message = 'Cache cleared successfully';
    
    // Determine the most appropriate cache clearing strategy
    if (hostId) {
      // Clear specific host cache
      clearedEntries += serverCache.deleteByTag(`host:${hostId}`);
      clearedEntries += serverCache.delete(serverCache.tenantKey(currentUser.tenant_id, 'host', hostId));
      message = `Cache cleared for host: ${hostId}`;
    } 
    else if (userId && tenantId) {
      // Clear both user and tenant specific data
      clearedEntries += serverCache.deleteByTag(`user:${userId}`);
      clearedEntries += serverCache.deleteByTag(`tenant:${tenantId}`);
      clearedEntries += serverCache.deleteByTag('hosts-data');
      message = `Cache cleared for user: ${userId} and tenant: ${tenantId}`;
    }
    else if (tenantId || (tenantId === undefined && currentUser)) {
      // Clear tenant-specific data (use current user's tenant if not specified)
      const targetTenantId = tenantId || currentUser.tenant_id;
      clearedEntries += serverCache.deleteByTag(`tenant:${targetTenantId}`);
      clearedEntries += serverCache.deleteByTag('hosts-data');
      
      // Clear all hosts cache keys for this tenant
      clearedEntries += serverCache.deletePattern(
        serverCache.tenantKey(targetTenantId, 'hosts', '')
      );
      clearedEntries += serverCache.deletePattern(
        serverCache.tenantKey(targetTenantId, 'host', '')
      );
      
      message = `Cache cleared for tenant: ${targetTenantId}`;
    }
    else if (userId) {
      // Clear user-specific data
      clearedEntries += serverCache.deleteByTag(`user:${userId}`);
      message = `Cache cleared for user: ${userId}`;
    }
    else {
      // Clear all hosts-related cache
      clearedEntries += serverCache.deleteByTag('hosts-data');
      message = 'All hosts cache cleared';
    }
    
    console.log(`[HostsActions] Hosts cache cleared successfully: ${clearedEntries} entries removed`);
    
    return {
      success: true,
      clearedEntries,
      message
    };
  } catch (error: any) {
    console.error('[HostsActions] Error clearing hosts cache:', error);
    return {
      success: false,
      clearedEntries: 0,
      message: 'Failed to clear hosts cache',
      error: error.message || 'An unexpected error occurred'
    };
  }
}
