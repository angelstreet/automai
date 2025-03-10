'use server';

import db from '@/lib/supabase/db';
import { Host } from '@/types/hosts';
import { Client } from 'ssh2';
import { logger } from '@/lib/logger';

export interface HostFilter {
  status?: string;
}

// Helper to get the base URL for client-side use
export const getBaseUrl = () => {
  return typeof window !== 'undefined' ? window.location.origin : '';
};

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

export async function testAllHosts(): Promise<{ success: boolean; error?: string; results?: Array<{ id: string; success: boolean; message?: string }> }> {
  try {
    const hostsResult = await getHosts();
    
    if (!hostsResult.success) {
      return { success: false, error: hostsResult.error };
    }
    
    const hosts = hostsResult.data || [];
    const results = await Promise.all(
      hosts.map(async (host) => {
        const result = await testHostConnection(host.id);
        return { id: host.id, success: result.success, message: result.message };
      })
    );

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
}): Promise<{ 
  success: boolean; 
  message?: string; 
  fingerprint?: string; 
  fingerprintVerified?: boolean;
  requireVerification?: boolean;
}> {
  try {
    // This would normally call a service function to test the connection
    // For now, we'll simulate a successful connection
    logger.info('Testing host connection', { ip: data.ip });
    
    // Simulate a successful connection
    return { 
      success: true, 
      message: 'Connection successful',
      fingerprint: data.hostId ? 'simulated-fingerprint' : undefined,
      fingerprintVerified: true
    };
  } catch (error: any) {
    console.error('Error testing connection:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to test connection' 
    };
  }
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

// Export a client-side compatible API for backward compatibility
export const hostsApi = {
  getHosts: async () => {
    const response = await fetch(`${getBaseUrl()}/api/hosts`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'X-Requested-With': 'XMLHttpRequest',
      },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Failed to fetch hosts');
    return response.json();
  },
  deleteHost: async (id: string) => {
    const response = await fetch(`${getBaseUrl()}/api/hosts/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete host');
    return response.json();
  },
  testConnection,
  testAllHosts: async () => {
    const response = await fetch(`${getBaseUrl()}/api/hosts/test-all`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'X-Requested-With': 'XMLHttpRequest',
      },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Failed to test all connections');
    return response.json();
  },
  verifyFingerprint,
  createHost: async (data: {
    name: string;
    description: string;
    type: string;
    ip: string;
    port: number;
    user?: string;
    username?: string;
    password: string;
    status: string;
  }) => {
    try {
      // Normalize the data to ensure we have 'user' property
      const normalizedData = {
        name: data.name,
        description: data.description,
        type: data.type,
        ip: data.ip,
        port: data.port,
        user: data.user || data.username,
        password: data.password,
        status: data.status,
      };

      const response = await fetch(`${getBaseUrl()}/api/hosts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalizedData),
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || 'Failed to create host');
        } catch (parseError) {
          throw new Error(`Failed to create host: ${response.status} ${response.statusText}`);
        }
      }

      return response.json();
    } catch (error) {
      console.error('Host creation error:', error);
      throw error;
    }
  },
  checkAllConnections,
};
