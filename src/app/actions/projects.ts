'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export interface Project {
  id: string;
  name: string;
  description?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all projects for the current user
 */
export async function getProjects() {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized', data: null };
    }
    
    // Get projects for the current tenant
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('tenant_id', user.user_metadata?.tenant_id || 'default')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching projects:', error);
      return { success: false, error: error.message, data: null };
    }
    
    return { success: true, error: null, data };
  } catch (error: any) {
    console.error('Error in getProjects:', error);
    return { success: false, error: error.message || 'Failed to fetch projects', data: null };
  }
}

/**
 * Get a project by ID
 */
export async function getProject(id: string) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized', data: null };
    }
    
    // Get project by ID, ensuring tenant isolation
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', user.user_metadata?.tenant_id || 'default')
      .single();
    
    if (error) {
      console.error('Error fetching project:', error);
      return { success: false, error: error.message, data: null };
    }
    
    return { success: true, error: null, data };
  } catch (error: any) {
    console.error('Error in getProject:', error);
    return { success: false, error: error.message || 'Failed to fetch project', data: null };
  }
}

/**
 * Create a new project
 */
export async function createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized', data: null };
    }
    
    // Create project with tenant ID from user
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        ...projectData,
        tenant_id: user.user_metadata?.tenant_id || 'default'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating project:', error);
      return { success: false, error: error.message, data: null };
    }
    
    return { success: true, error: null, data };
  } catch (error: any) {
    console.error('Error in createProject:', error);
    return { success: false, error: error.message || 'Failed to create project', data: null };
  }
}

/**
 * Update an existing project
 */
export async function updateProject(id: string, projectData: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>>) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized', data: null };
    }
    
    // Update project, ensuring tenant isolation
    const { data, error } = await supabase
      .from('projects')
      .update(projectData)
      .eq('id', id)
      .eq('tenant_id', user.user_metadata?.tenant_id || 'default')
      .select()
      .single();
    
    if (error) {
      console.error('Error updating project:', error);
      return { success: false, error: error.message, data: null };
    }
    
    return { success: true, error: null, data };
  } catch (error: any) {
    console.error('Error in updateProject:', error);
    return { success: false, error: error.message || 'Failed to update project', data: null };
  }
}

/**
 * Delete a project
 */
export async function deleteProject(id: string) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Delete project, ensuring tenant isolation
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('tenant_id', user.user_metadata?.tenant_id || 'default');
    
    if (error) {
      console.error('Error deleting project:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error in deleteProject:', error);
    return { success: false, error: error.message || 'Failed to delete project' };
  }
} 