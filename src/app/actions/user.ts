'use server';

import { createClient } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';

export interface UserRole {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserRoleFilter {
  userId?: string;
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createUserRole(data: Partial<UserRole>): Promise<UserRole> {
  const supabase = createClient();
  const { data: newRole, error } = await supabase
    .from('user_roles')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return newRole;
}

export async function updateUserRole(id: string, updates: Partial<UserRole>): Promise<UserRole> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_roles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUserRole(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getCurrentUserRoles(): Promise<UserRole[]> {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) throw userError;
  if (!user) throw new Error('No user found');

  return getUserRoles(user.id);
}
