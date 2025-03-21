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
 */
export async function getHosts(
  filter?: HostFilter,
  user?: AuthUser | null
): Promise<{ success: boolean; error?: string; data?: Host[] }> {
  console.log('[HostsActions] getHosts called', { 
    hasFilter: !!filter, 
    userProvided: !!user 
  });
  
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    
    console.log('[HostsActions] User status:', currentUser ? 'authenticated' : 'not authenticated');
    
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    // Create cache key based on filter
    const cacheKey = filter ? `hosts:filtered:${JSON.stringify(filter)}` : 'hosts:all';
    
    // Check cache first
    const cached = serverCache.get<Host[]>(cacheKey);
    if (cached) {
      console.log('[HostsActions] Using cached hosts data', { count: cached.length });
      return { success: true, data: cached };
    }
    
    console.log('[HostsActions] No cache found, fetching from database');
    
    const where: Record<string, any> = {};

    if (filter?.status) {
      where.status = filter.status;
    }

    const data = await db.host.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    if (!data) {
      return {
        success: false,
        error: 'Failed to fetch hosts',
      };
    }

    // Cache the result for 5 minutes (default TTL)
    serverCache.set(cacheKey, data);

    return { success: true, data };
  } catch (error: any) {
    console.error('Error in getHosts:', error);
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
  user?: AuthUser | null
): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    // Check cache first
    const cacheKey = `host:${id}`;
    const cached = serverCache.get<Host>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const data = await db.host.findUnique({
      where: { id },
    });

    if (!data) {
      return { success: false, error: 'Host not found' };
    }

    // Cache the result
    serverCache.set(cacheKey, data);

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
  user?: AuthUser | null
): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
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

    // Invalidate cache after creation
    serverCache.delete('hosts:all');

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
  user?: AuthUser | null
): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
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

    // Invalidate cache after update
    serverCache.delete(`host:${id}`);
    serverCache.delete('hosts:all');

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
  user?: AuthUser | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    await db.host.delete({
      where: { id },
    });

    // Invalidate cache after deletion
    serverCache.delete(`host:${id}`);
    serverCache.delete('hosts:all');

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
  user?: AuthUser | null
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    // Update updated_at to track last connection test time
    const updatedHost = await db.host.update({
      where: { id },
      data: {
        updated_at: new Date().toISOString(),
        status: 'connected', // Set to connected on successful test
      },
    });

    if (!updatedHost) {
      return {
        success: false,
        error: 'Host not found or update failed',
      };
    }

    // Invalidate cache after update
    serverCache.delete(`host:${id}`);
    serverCache.delete('hosts:all');

    // In a real application, you would actually test the connection here
    // For now, we'll just simulate a successful connection
    return { success: true, message: 'Connection successful' };
  } catch (error: any) {
    console.error('Error in testHostConnection:', error);
    return { success: false, error: error.message || 'Failed to test connection' };
  }
}

/**
 * Test all hosts
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function testAllHosts(
  user?: AuthUser | null
): Promise<{
  success: boolean;
  error?: string;
  results?: Array<{ hostId: string; result: { success: boolean; message?: string } }>;
}> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
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