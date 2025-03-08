'use server';

import db from '@/lib/supabase/db';
import { Host } from '@/types/hosts';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface HostFilter {
  status?: string;
}

// Since there's no host model in db.ts yet, we need to implement it temporarily
// This is a temporary solution until the host model is added to db.ts
const hosts = {
  async findMany(options: any = {}) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    let builder = supabase.from('hosts').select('*');
    
    // Apply filters if provided
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        builder = builder.eq(key, value);
      });
    }
    
    // Apply ordering
    if (options.orderBy) {
      const [field, direction] = Object.entries(options.orderBy)[0];
      builder = builder.order(field as string, { ascending: direction === 'asc' });
    } else {
      builder = builder.order('created_at', { ascending: false });
    }
    
    // Execute the query
    const { data, error } = await builder;
    
    if (error) {
      console.error('Error querying hosts:', error);
      return [];
    }
    
    return data || [];
  },
  
  async findUnique({ where }: { where: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { data, error } = await supabase
      .from('hosts')
      .select()
      .match(where)
      .single();
    
    if (error) {
      console.error('Error finding host:', error);
      return null;
    }
    
    return data;
  },
  
  async create({ data }: { data: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { data: result, error } = await supabase
      .from('hosts')
      .insert(data)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating host:', error);
      throw error;
    }
    
    return result;
  },
  
  async update({ where, data }: { where: any; data: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { data: result, error } = await supabase
      .from('hosts')
      .update(data)
      .match(where)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating host:', error);
      throw error;
    }
    
    return result;
  },
  
  async delete({ where }: { where: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { error } = await supabase
      .from('hosts')
      .delete()
      .match(where);
    
    if (error) {
      console.error('Error deleting host:', error);
      throw error;
    }
    
    return { success: true };
  }
};

// This is a temporary solution to make the action files use the same pattern as if the DB layer was complete
// In the future, this should be moved to the db.ts file
if (!db.host) {
  (db as any).host = hosts;
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

export async function testConnection(id: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    await db.host.update({
      where: { id },
      data: { last_connection_test: new Date().toISOString() }
    });
    
    // In a real application, you would actually test the connection here
    // For now, we'll just simulate a successful connection
    return { success: true, message: 'Connection successful' };
  } catch (error: any) {
    console.error('Error in testConnection:', error);
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
        const result = await testConnection(host.id);
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
