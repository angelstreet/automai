'use server';

import db from '@/lib/supabase/db';
import { Host } from '@/types/hosts';

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
    await db.host.update({
      where: { id },
      data: { last_connection_test: new Date().toISOString() }
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
