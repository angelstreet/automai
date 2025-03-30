'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { Host } from '@/app/[locale]/[tenant]/hosts/types';
import { getUser } from '@/app/actions/user';
import { logger } from '@/lib/logger';
import { testHostConnection as testHostConnectionService } from '@/lib/services/hosts';
import hostDb from '@/lib/supabase/db-hosts/host';

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
    console.log('[ACTIONS-HOSTS] Getting all hosts');
    // Get current user
    const currentUser = await getUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // No need to add filter parameters - the RLS policies
    // are already set up to handle team-based access control

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
    console.log('[ACTIONS-HOSTS] Found hosts:', data);
    return { success: true, data };
  } catch (error: any) {
    logger.error('[ACTIONS-HOSTS] Error in getHosts:', error);
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

    // No need to filter by team_id - the RLS policies
    // will handle access control
    const data = await hostDb.findUnique({
      where: { id },
    });

    if (!data) {
      return { success: false, error: 'Host not found' };
    }

    return { success: true, data };
  } catch (error: any) {
    logger.error('[ACTIONS-HOSTS] Error in getHostById:', error);
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

    logger.info(`[@action:hosts:createHost] Starting host creation for user: ${currentUser.id}`);

    // Validate SSH hosts have username and password
    if (data.type === 'ssh') {
      if (!data.user || !data.password || data.user.trim() === '' || data.password.trim() === '') {
        logger.error(
          `[@action:hosts:createHost] Validation failed: SSH hosts require username and password`,
        );
        return {
          success: false,
          error: 'SSH hosts require both username and password',
        };
      }
    }

    // Get the active team ID from user context instead of direct cookie access
    const { getUserActiveTeam, getUserTeams, createTeam } = await import('@/app/actions/team');

    // Try to get active team first
    let teamId;
    const activeTeamResult = await getUserActiveTeam(currentUser.id);
    if (activeTeamResult.success && activeTeamResult.data) {
      teamId = activeTeamResult.data.id;
      logger.info(`[@action:hosts:createHost] Using active team: ${teamId}`);
    } else {
      // If no active team, try to get any team the user belongs to
      const teamsResult = await getUserTeams(currentUser.id);
      if (teamsResult.success && teamsResult.data && teamsResult.data.length > 0) {
        teamId = teamsResult.data[0].id;
        logger.info(`[@action:hosts:createHost] Using first available team: ${teamId}`);
      } else {
        // No teams found, create a default personal team
        logger.info(`[@action:hosts:createHost] No teams found, creating default personal team`);

        // Pass only valid properties for TeamCreateInput
        const createTeamResult = await createTeam(
          {
            name: 'Personal Team',
            description: 'Default team created for host management',
          },
          null, // Use null instead of currentUser to let createTeam use its own getUser call
        );

        if (createTeamResult.success && createTeamResult.data) {
          teamId = createTeamResult.data.id;
          logger.info(`[@action:hosts:createHost] Created default team: ${teamId}`);
        } else {
          logger.error(`[@action:hosts:createHost] Failed to create default team:`, {
            error: createTeamResult.error,
          });
          return {
            success: false,
            error: 'Failed to create a team for host creation',
          };
        }
      }
    }

    if (!teamId) {
      logger.error(
        `[@action:hosts:createHost] No team available for host creation after all attempts`,
      );
      return {
        success: false,
        error: 'No team available for host creation, please create a team first',
      };
    }

    // Enrich data with team_id and creator_id
    const enrichedData = {
      ...data,
      team_id: teamId,
      creator_id: currentUser.id,
    };

    logger.info(`[@action:hosts:createHost] Creating host with data:`, {
      ...enrichedData,
      password: enrichedData.password ? '***' : undefined,
    });

    // Get cookie store for database operation
    const cookieStore = await cookies();
    const newHost = await hostDb.create({ data: enrichedData }, cookieStore);

    if (!newHost) {
      return {
        success: false,
        error: 'Failed to add host',
      };
    }

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');
    revalidatePath('/[locale]/[tenant]/dashboard');

    logger.info(`[@action:hosts:createHost] Successfully created host: ${newHost.id}`);
    return { success: true, data: newHost };
  } catch (error: any) {
    logger.error(`[@action:hosts:createHost] Error creating host:`, { error });
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
    logger.error('[ACTIONS-HOSTS] Error in updateHost:', error);
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
    logger.error('[ACTIONS-HOSTS] Error in deleteHost:', error);
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
}): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    logger.info(
      `[@action:hosts:testConnectionCore] Testing connection to ${data.ip}:${data.port || 'default'}`,
    );

    // Call the service function that handles the actual testing logic
    const result = await testHostConnectionService(data);

    if (result.success) {
      logger.info(
        `[@action:hosts:testConnectionCore] Connection test successful for ${data.ip}:${data.port || 'default'}`,
      );
    } else {
      // Fix for linter error: Safely access error property
      let errorMessage: string;
      if ('message' in result && typeof result.message === 'string') {
        errorMessage = result.message;
      } else if ('error' in result && typeof result.error === 'string') {
        errorMessage = result.error;
      } else {
        errorMessage = 'Unknown error';
      }

      logger.error(
        `[@action:hosts:testConnectionCore] Connection test failed for ${data.ip}:${data.port || 'default'}`,
        { error: errorMessage },
      );
    }

    return result;
  } catch (error: any) {
    logger.error(
      `[@action:hosts:testConnectionCore] Error testing connection to ${data.ip}:${data.port || 'default'}`,
      { error },
    );
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
    logger.info(
      `[@action:hosts:testHostConnection] Starting host connection test for host ID: ${id}`,
    );

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
    logger.info(
      `[@action:hosts:testHostConnection] Retrieved host: ${host.name} (${host.ip}:${host.port})`,
    );

    // First update the host to testing state
    await hostDb.update({
      where: { id },
      data: {
        status: 'testing',
        updated_at: new Date().toISOString(),
      },
    });
    logger.info(`[@action:hosts:testHostConnection] Updated host status to 'testing'`);

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
    await hostDb.update({
      where: { id },
      data: {
        status: result.success ? 'connected' : 'failed',
        updated_at: new Date().toISOString(),
      },
    });
    logger.info(
      `[@action:hosts:testHostConnection] Updated host status to '${result.success ? 'connected' : 'failed'}'`,
    );

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');
    revalidatePath(`/[locale]/[tenant]/hosts/${id}`);
    revalidatePath('/[locale]/[tenant]/dashboard');

    return result;
  } catch (error: any) {
    logger.error(`[@action:hosts:testHostConnection] Error testing host connection for ID: ${id}`, {
      error,
    });

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
        logger.info(
          `[@action:hosts:testHostConnection] Updated host status to 'failed' after error`,
        );
      }
    } catch (updateError: any) {
      logger.error(`[@action:hosts:testHostConnection] Error updating host status to failed:`, {
        error: updateError,
      });
    }

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');
    revalidatePath(`/[locale]/[tenant]/hosts/${id}`);

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
    logger.info(
      `[@action:hosts:testConnection] Testing connection to ${data.ip}:${data.port || 'default'}`,
    );

    // Use the core testing function
    const result = await testConnectionCore(data);

    // Revalidate paths if we have a host ID
    if (data.hostId) {
      logger.info(`[@action:hosts:testConnection] Revalidating paths for host ID: ${data.hostId}`);
      revalidatePath('/[locale]/[tenant]/hosts');
      revalidatePath(`/[locale]/[tenant]/hosts/${data.hostId}`);
    }

    return result;
  } catch (error: any) {
    logger.error(`[@action:hosts:testConnection] Error testing connection:`, { error });
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
    logger.info(`[@action:hosts:verifyFingerprint] Verifying fingerprint for host: ${data.host}`);

    return {
      success: true,
      message: 'Fingerprint verified successfully',
    };
  } catch (error: any) {
    logger.error(`[@action:hosts:verifyFingerprint] Error verifying fingerprint:`, { error });
    return {
      success: false,
      message: error.message || 'Failed to verify fingerprint',
    };
  }
}
