/**
 * CICD Database Layer
 * Handles database operations for CI/CD providers and jobs
 */
import { createClient } from '@/lib/supabase/server';

// Types from CICD component type
import { 
  CICDProvider, 
  CICDJob, 
  CICDBuild,
  CICDProviderPayload 
} from '@/types/component/cicdComponentType';

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
 * Get all CI/CD providers for a tenant
 */
export async function getCICDProviders(tenantId: string): Promise<DbResponse<CICDProvider[]>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('cicd_providers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get CI/CD providers' };
  }
}

/**
 * Get a CI/CD provider by ID
 */
export async function getCICDProviderById(id: string): Promise<DbResponse<CICDProvider>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('cicd_providers')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get CI/CD provider' };
  }
}

/**
 * Create a new CI/CD provider
 */
export async function createCICDProvider(provider: CICDProviderPayload, userId: string, tenantId: string): Promise<DbResponse<CICDProvider>> {
  try {
    const supabase = createClient();
    
    const providerData = {
      ...provider,
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('cicd_providers')
      .insert([providerData])
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create CI/CD provider' };
  }
}

/**
 * Update a CI/CD provider
 */
export async function updateCICDProvider(id: string, provider: Partial<CICDProviderPayload>): Promise<DbResponse<CICDProvider>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('cicd_providers')
      .update({
        ...provider,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update CI/CD provider' };
  }
}

/**
 * Delete a CI/CD provider
 */
export async function deleteCICDProvider(id: string): Promise<DbResponse<null>> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('cicd_providers')
      .delete()
      .eq('id', id);
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete CI/CD provider' };
  }
}

/**
 * Get all CI/CD jobs for a provider
 */
export async function getCICDJobs(providerId: string): Promise<DbResponse<CICDJob[]>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('cicd_jobs')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get CI/CD jobs' };
  }
}

/**
 * Get a CI/CD job by ID
 */
export async function getCICDJobById(id: string): Promise<DbResponse<CICDJob>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('cicd_jobs')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get CI/CD job' };
  }
}

/**
 * Get builds for a CI/CD job
 */
export async function getCICDBuilds(jobId: string): Promise<DbResponse<CICDBuild[]>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('cicd_builds')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get CI/CD builds' };
  }
}

/**
 * Create a new CI/CD build
 */
export async function createCICDBuild(build: Partial<CICDBuild>): Promise<DbResponse<CICDBuild>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('cicd_builds')
      .insert([{
        ...build,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create CI/CD build' };
  }
}

/**
 * Update a CI/CD build
 */
export async function updateCICDBuild(id: string, build: Partial<CICDBuild>): Promise<DbResponse<CICDBuild>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('cicd_builds')
      .update({
        ...build,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update CI/CD build' };
  }
}

/**
 * Get a CICD provider with query options
 */
export async function getCICDProvider(options: { where: any }, cookieStore?: any): Promise<DbResponse<CICDProvider>> {
  try {
    const supabase = createClient(cookieStore);
    
    let query = supabase
      .from('cicd_providers')
      .select('*');
    
    // Apply where conditions if provided
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    const { data, error } = await query.single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get CICD provider' };
  }
}

/**
 * Create a CICD job
 */
export async function createCICDJob(options: { data: any }, cookieStore?: any): Promise<DbResponse<any>> {
  try {
    const supabase = createClient(cookieStore);
    
    const { data, error } = await supabase
      .from('cicd_jobs')
      .insert([{
        ...options.data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data, id: data.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create CICD job' };
  }
}

/**
 * Create a deployment-CICD mapping
 */
export async function createDeploymentCICDMapping(data: any, cookieStore?: any): Promise<DbResponse<any>> {
  try {
    const supabase = createClient(cookieStore);
    
    const { data: mappingData, error } = await supabase
      .from('deployment_cicd_mappings')
      .insert([{
        ...data,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: mappingData };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create deployment-CICD mapping' };
  }
}

/**
 * Get deployment-CICD mappings
 */
export async function getDeploymentCICDMappings(options: { where: any }, cookieStore?: any): Promise<DbResponse<any[]>> {
  try {
    const supabase = createClient(cookieStore);
    
    let query = supabase
      .from('deployment_cicd_mappings')
      .select('*');
    
    // Apply where conditions if provided
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    const { data, error } = await query;
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get deployment-CICD mappings' };
  }
}

/**
 * Get a CICD job
 */
export async function getCICDJob(options: { where: any }, cookieStore?: any): Promise<DbResponse<any>> {
  try {
    const supabase = createClient(cookieStore);
    
    let query = supabase
      .from('cicd_jobs')
      .select('*');
    
    // Apply where conditions if provided
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    const { data, error } = await query.single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get CICD job' };
  }
}

/**
 * Delete a CICD job
 */
export async function deleteCICDJob(options: { where: any }, cookieStore?: any): Promise<DbResponse<null>> {
  try {
    const supabase = createClient(cookieStore);
    
    let query = supabase
      .from('cicd_jobs')
      .delete();
    
    // Apply where conditions if provided
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    const { error } = await query;
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete CICD job' };
  }
}

/**
 * Delete a deployment-CICD mapping
 */
export async function deleteDeploymentCICDMapping(id: string, cookieStore?: any): Promise<DbResponse<null>> {
  try {
    const supabase = createClient(cookieStore);
    
    const { error } = await supabase
      .from('deployment_cicd_mappings')
      .delete()
      .eq('id', id);
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete deployment-CICD mapping' };
  }
}

/**
 * Get a deployment-CICD mapping
 */
export async function getCICDDeploymentMapping(options: { where: any }, cookieStore?: any): Promise<DbResponse<any>> {
  try {
    const supabase = createClient(cookieStore);
    
    let query = supabase
      .from('deployment_cicd_mappings')
      .select('*');
    
    // Apply where conditions if provided
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    const { data, error } = await query.single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - not an error for our purposes
        return { success: true, data: null };
      }
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get deployment-CICD mapping' };
  }
}

// Default export for all CICD database operations
const cicdDb = {
  getCICDProviders,
  getCICDProviderById,
  createCICDProvider,
  updateCICDProvider,
  deleteCICDProvider,
  getCICDJobs,
  getCICDJobById,
  getCICDBuilds,
  createCICDBuild,
  updateCICDBuild,
  // Add adapter methods
  getCICDProvider,
  createCICDJob,
  createDeploymentCICDMapping,
  getDeploymentCICDMappings, 
  getCICDJob,
  deleteCICDJob,
  deleteDeploymentCICDMapping,
  getCICDDeploymentMapping
};

export default cicdDb;