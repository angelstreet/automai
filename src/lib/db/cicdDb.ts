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
  updateCICDBuild
};

export default cicdDb;