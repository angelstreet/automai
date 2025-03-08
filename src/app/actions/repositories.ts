'use server';

import { createClient } from '@/lib/supabase/client';
import { Repository } from '@/types/repositories';

export interface RepositoryFilter {
  providerId?: string;
}

export async function getRepositories(filter?: RepositoryFilter): Promise<Repository[]> {
  const supabase = createClient();
  let query = supabase.from('repositories').select('*');

  if (filter?.providerId) {
    query = query.eq('provider_id', filter.providerId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createRepository(data: Partial<Repository>): Promise<Repository> {
  const supabase = createClient();
  const { data: newRepo, error } = await supabase
    .from('repositories')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return newRepo;
}

export async function updateRepository(id: string, updates: Partial<Repository>): Promise<Repository> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('repositories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRepository(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('repositories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function syncRepository(id: string): Promise<Repository> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('repositories')
    .update({ last_synced: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
