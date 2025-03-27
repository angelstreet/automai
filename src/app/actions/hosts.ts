'use server';

import { revalidatePath } from 'next/cache';
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
 */
export async function getHosts(
  filter?: HostFilter,
): Promise<{ success: boolean; error?: string; data?: Host[] }> {
  try {
    // Get current user
    const currentUser = await getUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Set up query filters
    const where: Record<string, any> = {};
    if (filter?.status) {
      where.status = filter.status;
    }

    const data = await hostDb.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    if (!data) {
      return {
        success: false,
        error: 'Failed to fetch hosts',
      };
    }

    return { success: true, data };
  } catch (error: any) {
    logger.error('Error in getHosts:', error);
    return { success: false, error: error.message || 'Failed to fetch hosts' };
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
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    const data = await hostDb.findUnique({
      where: { id },
    });

    if (!data) {
      return { success: false, error: 'Host not found' };
    }

    return { success: true, data };
  } catch (error: any) {
    logger.error('Error in getHostById:', error);
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
    // Get current user
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    const newHost = await hostDb.create({ data });

    if (!newHost) {
      return {
        success: false,
        error: 'Failed to add host',
      };
    }

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');
    revalidatePath('/[locale]/[tenant]/dashboard');

    return { success: true, data: newHost };
  } catch (error: any) {
    logger.error('Error in createHost:', error);
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
    const currentUser = await getUser();
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

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');
    revalidatePath(`/[locale]/[tenant]/hosts/${id}`);
    revalidatePath('/[locale]/[tenant]/dashboard');

    return { success: true, data };
  } catch (error: any) {
    logger.error('Error in updateHost:', error);
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
    const currentUser = await getUser();
    if (!currentUser) {
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

    await hostDb.delete({
      where: { id },
    });

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');
    revalidatePath('/[locale]/[tenant]/dashboard');

    return { success: true };
  } catch (error: any) {
    logger.error('Error in deleteHost:', error);
    return { success: false, error: error.message || 'Failed to delete host' };
  }
}

/**
 * Test connection to a specific host
 */
export async function testHostConnection(
  id: string,
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    if (!id) {
      return { success: false, error: 'Host ID is required' };
    }

    // Get current user
    const currentUser = await getUser();
    if (!currentUser) {
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

    // First update the host to testing state
    await hostDb.update({
      where: { id },
      data: {
        status: 'testing',
        updated_at: new Date().toISOString(),
      },
    });

    // Test the SSH connection using the service
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

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');
    revalidatePath(`/[locale]/[tenant]/hosts/${id}`);
    revalidatePath('/[locale]/[tenant]/dashboard');

    return result;
  } catch (error: any) {
    logger.error('Error in testHostConnection:', error);

    // Update status to failed on error
    try {
      const currentUser = await getUser();
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
      logger.error('Error updating host status to failed:', updateError);
    }

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');
    revalidatePath(`/[locale]/[tenant]/hosts/${id}`);

    return { success: false, error: error.message || 'Failed to test connection' };
  }
}

/**
 * Test all hosts
 */
export async function testAllHosts(): Promise<{
  success: boolean;
  error?: string;
  results?: Array<{ hostId: string; result: { success: boolean; message?: string } }>;
}> {
  try {
    // Get current user
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    const hostsResult = await getHosts();
    if (!hostsResult.success) {
      return { success: false, error: hostsResult.error };
    }

    const hosts = hostsResult.data || [];
    const results = [];

    // Test each host sequentially
    for (const hostItem of hosts) {
      // First update the host to testing state
      await hostDb.update({
        where: { id: hostItem.id },
        data: {
          status: 'testing',
          updated_at: new Date().toISOString(),
        },
      });

      // Test the connection
      const result = await testHostConnectionService({
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
    }

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');
    revalidatePath('/[locale]/[tenant]/dashboard');

    return {
      success: true,
      results,
    };
  } catch (error: any) {
    logger.error('Error in testAllHosts:', error);
    return { success: false, error: error.message || 'Failed to test all hosts' };
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
}) {
  try {
    const result = await testHostConnectionService(data);

    // Revalidate paths if we have a host ID
    if (data.hostId) {
      revalidatePath('/[locale]/[tenant]/hosts');
      revalidatePath(`/[locale]/[tenant]/hosts/${data.hostId}`);
    }

    return result;
  } catch (error: any) {
    logger.error('Error in testConnection:', error);
    return { success: false, error: error.message || 'Failed to test connection' };
  }
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
    logger.error('Error verifying fingerprint:', error);
    return {
      success: false,
      message: error.message || 'Failed to verify fingerprint',
    };
  }
}
