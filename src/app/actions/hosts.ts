'use server';

import { createClient } from '@/lib/supabase/client';
import { Host } from '@/types/hosts';

export interface HostFilter {
  status?: string;
}

export async function getHosts(filter?: HostFilter): Promise<Host[]> {
  const supabase = createClient();
  let query = supabase.from('hosts').select('*');

  if (filter?.status) {
    query = query.eq('status', filter.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function addHost(data: Omit<Host, 'id'>): Promise<Host> {
  const supabase = createClient();
  const { data: newHost, error } = await supabase
    .from('hosts')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return newHost;
}

export async function deleteHost(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('hosts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function testConnection(id: string): Promise<{ success: boolean; message?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('hosts')
    .update({ last_connection_test: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

export async function testAllHosts(): Promise<{ success: boolean; results: Array<{ id: string; success: boolean; message?: string }> }> {
  const hosts = await getHosts();
  const results = await Promise.all(
    hosts.map(async (host) => {
      const result = await testConnection(host.id);
      return { id: host.id, ...result };
    })
  );

  return {
    success: true,
    results
  };
}
