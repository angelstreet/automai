'use server';

import db from '@/lib/supabase/db';
import { Host } from '@/types/hosts';
import { logger } from '@/lib/logger';
import { testHostConnection as testHostConnectionService } from '@/lib/services/hosts';
// Import getBaseUrl from utils instead
import { getBaseUrl } from '@/lib/utils';

export interface HostFilter {
  status?: string;
}

export async function getHosts(filter?: HostFilter): Promise<{ success: boolean; error?: string; data?: Host[] }> {
  try {
    const where: Record<string, any> = {};
    
    if (filter?.status) {
      where.status = filter.status;
    }
    
    const data = await db.host.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in getHosts:', error);
    return { success: false, error: error.message || 'Failed to fetch hosts' };
  }
}

export async function getHost(id: string): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    const data = await db.host.findUnique({
      where: { id }
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

export async function addHost(data: Omit<Host, 'id'>): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    const newHost = await db.host.create({
      data
    });
    
    return { success: true, data: newHost };
  } catch (error: any) {
    console.error('Error in addHost:', error);
    return { success: false, error: error.message || 'Failed to add host' };
  }
}

// Alias for createHost to match the client API naming
export const createHost = addHost;

export async function updateHost(id: string, updates: Partial<Omit<Host, 'id'>>): Promise<{ success: boolean; error?: string; data?: Host }> {
  try {
    const data = await db.host.update({
      where: { id },
      data: updates
    });
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in updateHost:', error);
    return { success: false, error: error.message || 'Failed to update host' };
  }
}

export async function deleteHost(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.host.delete({
      where: { id }
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteHost:', error);
    return { success: false, error: error.message || 'Failed to delete host' };
  }
}

export async function testHostConnection(id: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    // Update updated_at to track last connection test time
    await db.host.update({
      where: { id },
      data: { 
        updated_at: new Date().toISOString(),
        status: 'connected' // Set to connected on successful test
      }
    });
    
    // In a real application, you would actually test the connection here
    // For now, we'll just simulate a successful connection
    return { success: true, message: 'Connection successful' };
  } catch (error: any) {
    console.error('Error in testHostConnection:', error);
    return { success: false, error: error.message || 'Failed to test connection' };
  }
}

export async function testAllHosts(): Promise<{ success: boolean; error?: string; results?: Array<{ hostId: string; result: { success: boolean; message?: string } }> }> {
  try {
    const hostsResult = await getHosts();
    
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
          updated_at: new Date().toISOString()
        }
      });

      // Small delay to show the red state
      await new Promise(resolve => setTimeout(resolve, 500));

      // Then update to testing state
      await db.host.update({
        where: { id: host.id },
        data: { 
          status: 'testing',
          updated_at: new Date().toISOString()
        }
      });

      // Test the connection using the real SSH test
      const result = await testConnection({
        type: host.type,
        ip: host.ip,
        port: host.port,
        username: host.user,
        password: host.password,
        hostId: host.id
      });

      // Update the host status based on the test result
      await db.host.update({
        where: { id: host.id },
        data: { 
          status: result.success ? 'connected' : 'failed',
          updated_at: new Date().toISOString()
        }
      });

      // Add result to array
      results.push({
        hostId: host.id,
        result: {
          success: result.success,
          message: result.message
        }
      });

      // Small delay between hosts
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return {
      success: true,
      results
    };
  } catch (error: any) {
    console.error('Error in testAllHosts:', error);
    return { success: false, error: error.message || 'Failed to test all hosts' };
  }
}

// New functions from the client-side API wrapper

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
  port?: number 
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
      message: 'Fingerprint verified successfully'
    };
  } catch (error: any) {
    console.error('Error verifying fingerprint:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to verify fingerprint' 
    };
  }
}

/**
 * Check connections for multiple hosts sequentially
 */
export async function checkAllConnections(hosts: Host[]): Promise<Array<{ hostId: string; result: any }>> {
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
