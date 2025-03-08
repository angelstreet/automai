import { createClient } from '@/lib/supabase/client';
import { GitProvider, GitProviderType } from '@/types/repositories';

export async function getGitProviders(): Promise<GitProvider[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('git_providers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function addGitProvider(provider: Omit<GitProvider, 'id'>): Promise<GitProvider> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('git_providers')
    .insert([provider])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGitProvider(id: string, updates: Partial<GitProvider>): Promise<GitProvider> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('git_providers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function refreshGitProvider(id: string): Promise<GitProvider> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('git_providers')
    .update({ last_synced: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
} 