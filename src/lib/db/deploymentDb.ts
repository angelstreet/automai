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
export async function getDeployments(
  tenantId: string,
  cookieStore?: any,
): Promise<DbResponse<Deployment[]>> {
  try {
    const supabase = await createClient(cookieStore);

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
export async function getDeploymentById(
  id: string,
  cookieStore?: any,
): Promise<DbResponse<Deployment>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase.from('deployments').select('*').eq('id', id).single();

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
export async function createDeployment(
  deployment: Partial<Deployment>,
  cookieStore?: any,
): Promise<DbResponse<Deployment>> {
  try {
    const supabase = await createClient(cookieStore);

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
export async function updateDeployment(
  id: string,
  deployment: Partial<Deployment>,
  cookieStore?: any,
): Promise<DbResponse<Deployment>> {
  try {
    const supabase = await createClient(cookieStore);

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
export async function updateDeploymentStatus(
  id: string,
  status: DeploymentStatus,
  cookieStore?: any,
): Promise<DbResponse<Deployment>> {
  try {
    const supabase = await createClient(cookieStore);

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
export async function deleteDeployment(id: string, cookieStore?: any): Promise<DbResponse<null>> {
  try {
    const supabase = await createClient(cookieStore);

    const { error } = await supabase.from('deployments').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete deployment' };
  }
}

/**
 * Find many deployments based on criteria
 */
export async function findMany(
  options: { where?: any } = {},
  cookieStore?: any,
): Promise<DbResponse<Deployment[]>> {
  try {
    const supabase = await createClient(cookieStore);

    let query = supabase.from('deployments').select('*');

    // Apply where conditions if provided
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Order by created_at desc
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to find deployments', data: [] };
  }
}

/**
 * Find a unique deployment by ID
 */
export async function findUnique(id: string, cookieStore?: any): Promise<Deployment | null> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase.from('deployments').select('*').eq('id', id).single();

    if (error) {
      console.error('Error in findUnique:', error);
      return null;
    }

    return data;
  } catch (error: any) {
    console.error('Error in findUnique:', error);
    return null;
  }
}

/**
 * Create a deployment
 */
export async function create(
  options: { data: any },
  cookieStore?: any,
): Promise<DbResponse<Deployment>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('deployments')
      .insert([options.data])
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
export async function update(
  id: string,
  data: any,
  cookieStore?: any,
): Promise<DbResponse<Deployment>> {
  return updateDeployment(id, data, cookieStore);
}

/**
 * Delete a deployment
 */
export async function delete_(id: string, cookieStore?: any): Promise<DbResponse<null>> {
  return deleteDeployment(id, cookieStore);
}

/**
 * Run a deployment
 */
export async function runDeployment(
  id: string,
  userId: string,
  cookieStore?: any,
): Promise<DbResponse<any>> {
  try {
    const supabase = await createClient(cookieStore);

    // Create a deployment run record
    const { data, error } = await supabase
      .from('deployment_runs')
      .insert([
        {
          deployment_id: id,
          user_id: userId,
          status: 'running',
          started_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to run deployment' };
  }
}

// Default export for all deployment database operations
const deploymentDb = {
  getDeployments,
  getDeploymentById,
  createDeployment,
  updateDeployment,
  updateDeploymentStatus,
  deleteDeployment,
  // Add new adapter methods
  findMany,
  findUnique,
  create,
  update,
  delete: delete_,
};

export default deploymentDb;
