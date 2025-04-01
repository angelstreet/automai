/**
 * Deployment Database Layer
 * Handles database operations for deployments
 */
import { createClient } from '@/lib/supabase/server';

// Types from deployment component type
import { Deployment, DeploymentStatus } from '@/types/component/deploymentComponentType';

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
 * Get all deployments for a tenant
 */
export async function getDeployments(tenantId: string): Promise<DbResponse<Deployment[]>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get deployments' };
  }
}

/**
 * Get a deployment by ID
 */
export async function getDeploymentById(id: string): Promise<DbResponse<Deployment>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get deployment' };
  }
}

/**
 * Create a new deployment
 */
export async function createDeployment(deployment: Partial<Deployment>): Promise<DbResponse<Deployment>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('deployments')
      .insert([deployment])
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create deployment' };
  }
}

/**
 * Update a deployment
 */
export async function updateDeployment(id: string, deployment: Partial<Deployment>): Promise<DbResponse<Deployment>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('deployments')
      .update(deployment)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update deployment' };
  }
}

/**
 * Update deployment status
 */
export async function updateDeploymentStatus(id: string, status: DeploymentStatus): Promise<DbResponse<Deployment>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('deployments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update deployment status' };
  }
}

/**
 * Delete a deployment
 */
export async function deleteDeployment(id: string): Promise<DbResponse<null>> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('deployments')
      .delete()
      .eq('id', id);
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete deployment' };
  }
}

// Default export for all deployment database operations
const deploymentDb = {
  getDeployments,
  getDeploymentById,
  createDeployment,
  updateDeployment,
  updateDeploymentStatus,
  deleteDeployment
};

export default deploymentDb;