/**
 * Repository Database Layer
 * Handles database operations for repositories
 */
import { createClient } from '@/lib/supabase/server';

// Types from repository component type
import { Repository } from '@/types/component/repositoryComponentType';

/**
 * Standard database response interface
 */
export interface DbResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string;
  count?: number;
}

/**
 * Get all repositories for a tenant
 */
export async function getRepositories(tenantId: string): Promise<DbResponse<Repository[]>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('tenant_id', tenantId);
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get repositories' };
  }
}

/**
 * Get a repository by ID
 */
export async function getRepositoryById(id: string): Promise<DbResponse<Repository>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get repository' };
  }
}

/**
 * Create a new repository
 */
export async function createRepository(repository: Partial<Repository>): Promise<DbResponse<Repository>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('repositories')
      .insert([repository])
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create repository' };
  }
}

/**
 * Update a repository
 */
export async function updateRepository(id: string, repository: Partial<Repository>): Promise<DbResponse<Repository>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('repositories')
      .update(repository)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update repository' };
  }
}

/**
 * Delete a repository
 */
export async function deleteRepository(id: string): Promise<DbResponse<null>> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('repositories')
      .delete()
      .eq('id', id);
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete repository' };
  }
}

// Default export for all repository database operations
const repositoryDb = {
  getRepositories,
  getRepositoryById,
  createRepository,
  updateRepository,
  deleteRepository
};

export default repositoryDb;