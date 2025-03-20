import { createBrowserClient } from '@supabase/ssr';

type CICDProviderType = 'jenkins' | 'github' | 'gitlab' | 'bitbucket' | 'azure_devops';
type CICDAuthType = 'token' | 'basic' | 'oauth';

interface CICDProviderConfig {
  auth_type: CICDAuthType;
  credentials: {
    username?: string;
    password?: string;
    token?: string;
    client_id?: string;
    client_secret?: string;
  };
  status?: 'configured' | 'error' | 'testing';
}

interface CICDProvider {
  id: string;
  name: string;
  type: CICDProviderType;
  url: string;
  config: CICDProviderConfig;
  tenant_id: string;
  created_at?: string;
  updated_at?: string;
}

interface CICDJob {
  id: string;
  provider_id: string;
  external_id: string;
  name: string;
  path?: string;
  description?: string;
  parameters?: any[];
  created_at?: string;
  updated_at?: string;
}

interface CICDDeploymentMapping {
  id: string;
  deployment_id: string;
  cicd_job_id: string;
  parameters?: Record<string, any>;
  build_number?: string;
  build_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface WhereClause {
  id?: string;
  tenant_id?: string;
  provider_id?: string;
  deployment_id?: string;
  external_id?: string;
}

interface CreateProviderParams {
  data: Omit<CICDProvider, 'id' | 'created_at' | 'updated_at'>;
}

interface UpdateProviderParams {
  where: WhereClause;
  data: Partial<Omit<CICDProvider, 'id' | 'created_at' | 'updated_at'>>;
}

interface CreateJobParams {
  data: Omit<CICDJob, 'id' | 'created_at' | 'updated_at'>;
}

interface UpdateJobParams {
  where: WhereClause;
  data: Partial<Omit<CICDJob, 'id' | 'created_at' | 'updated_at'>>;
}

interface DeleteParams {
  where: WhereClause;
}

interface GetParams {
  where?: WhereClause;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Create a new CI/CD provider
 */
async function createCICDProvider({ data }: CreateProviderParams): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Create provider with config object
    const { data: provider, error } = await supabase
      .from('cicd_providers')
      .insert({
        name: data.name,
        type: data.type,
        url: data.url,
        config: data.config,
        tenant_id: data.tenant_id
      })
      .select('id')
      .single();

    if (error) {
      console.error('DB layer: Error creating CI/CD provider:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      id: provider.id
    };
  } catch (error: any) {
    console.error('DB layer: Unexpected error creating CI/CD provider:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing CI/CD provider
 */
async function updateCICDProvider({ where, data }: UpdateProviderParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate required parameters
    if (!where.id) {
      return { success: false, error: 'Provider ID is required for update' };
    }

    // Build update object
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.type) updateData.type = data.type;
    if (data.url) updateData.url = data.url;
    if (data.config) updateData.config = data.config;
    
    // Add updated_at
    updateData.updated_at = new Date().toISOString();

    // Update provider
    const { error } = await supabase
      .from('cicd_providers')
      .update(updateData)
      .match({ id: where.id, tenant_id: where.tenant_id });

    if (error) {
      console.error('DB layer: Error updating CI/CD provider:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('DB layer: Unexpected error updating CI/CD provider:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a CI/CD provider
 */
async function deleteCICDProvider({ where }: DeleteParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate required parameters
    if (!where.id) {
      return { success: false, error: 'Provider ID is required for deletion' };
    }

    // Delete associated jobs first
    const { error: jobsError } = await supabase
      .from('cicd_jobs')
      .delete()
      .match({ provider_id: where.id });

    if (jobsError) {
      console.error('DB layer: Error deleting associated CI/CD jobs:', jobsError);
      return { success: false, error: jobsError.message };
    }

    // Delete provider
    const { error } = await supabase
      .from('cicd_providers')
      .delete()
      .match({ id: where.id, tenant_id: where.tenant_id });

    if (error) {
      console.error('DB layer: Error deleting CI/CD provider:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('DB layer: Unexpected error deleting CI/CD provider:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a single CI/CD provider by ID
 */
async function getCICDProvider({ where }: GetParams): Promise<{ 
  success: boolean; 
  data?: CICDProvider; 
  error?: string 
}> {
  try {
    // Validate required parameters
    if (!where?.id) {
      return { success: false, error: 'Provider ID is required' };
    }

    // Get provider
    const { data: provider, error } = await supabase
      .from('cicd_providers')
      .select('*')
      .match({ id: where.id, tenant_id: where.tenant_id })
      .single();

    if (error) {
      console.error('DB layer: Error getting CI/CD provider:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: provider as CICDProvider
    };
  } catch (error: any) {
    console.error('DB layer: Unexpected error getting CI/CD provider:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all CI/CD providers for a tenant
 */
async function getCICDProviders({ where }: GetParams = {}): Promise<{ 
  success: boolean; 
  data?: CICDProvider[]; 
  error?: string 
}> {
  try {
    // Build query
    let query = supabase
      .from('cicd_providers')
      .select('*');
    
    // Add tenant filter if provided
    if (where?.tenant_id) {
      query = query.eq('tenant_id', where.tenant_id);
    }

    // Execute query
    const { data: providers, error } = await query;

    if (error) {
      console.error('DB layer: Error getting CI/CD providers:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: providers as CICDProvider[]
    };
  } catch (error: any) {
    console.error('DB layer: Unexpected error getting CI/CD providers:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new CI/CD job
 */
async function createCICDJob({ data }: CreateJobParams): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Create job
    const { data: job, error } = await supabase
      .from('cicd_jobs')
      .insert({
        provider_id: data.provider_id,
        external_id: data.external_id,
        name: data.name,
        path: data.path,
        description: data.description,
        parameters: data.parameters
      })
      .select('id')
      .single();

    if (error) {
      console.error('DB layer: Error creating CI/CD job:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      id: job.id
    };
  } catch (error: any) {
    console.error('DB layer: Unexpected error creating CI/CD job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a single CI/CD job by ID
 */
async function getCICDJob({ where }: GetParams): Promise<{
  success: boolean;
  data?: CICDJob;
  error?: string
}> {
  try {
    // Validate required parameters
    if (!where?.id && !where?.external_id) {
      return { success: false, error: 'Job ID or external ID is required' };
    }

    // Build query
    let query = supabase
      .from('cicd_jobs')
      .select('*');
    
    if (where.id) {
      query = query.eq('id', where.id);
    } else if (where.external_id && where.provider_id) {
      query = query.eq('external_id', where.external_id).eq('provider_id', where.provider_id);
    }

    // Execute query
    const { data: job, error } = await query.single();

    if (error) {
      console.error('DB layer: Error getting CI/CD job:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: job as CICDJob
    };
  } catch (error: any) {
    console.error('DB layer: Unexpected error getting CI/CD job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all CI/CD jobs for a provider
 */
async function getCICDJobs({ where }: GetParams = {}): Promise<{
  success: boolean;
  data?: CICDJob[];
  error?: string
}> {
  try {
    // Build query
    let query = supabase
      .from('cicd_jobs')
      .select('*');
    
    // Add provider filter if provided
    if (where?.provider_id) {
      query = query.eq('provider_id', where.provider_id);
    }

    // Execute query
    const { data: jobs, error } = await query;

    if (error) {
      console.error('DB layer: Error getting CI/CD jobs:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: jobs as CICDJob[]
    };
  } catch (error: any) {
    console.error('DB layer: Unexpected error getting CI/CD jobs:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new deployment-CICD mapping
 */
async function createDeploymentCICDMapping(
  data: Omit<CICDDeploymentMapping, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: mapping, error } = await supabase
      .from('deployment_cicd_mappings')
      .insert({
        deployment_id: data.deployment_id,
        cicd_job_id: data.cicd_job_id,
        parameters: data.parameters,
        build_number: data.build_number,
        build_url: data.build_url
      })
      .select('id')
      .single();

    if (error) {
      console.error('DB layer: Error creating deployment CICD mapping:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      id: mapping.id
    };
  } catch (error: any) {
    console.error('DB layer: Unexpected error creating deployment CICD mapping:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a deployment-CICD mapping
 */
async function updateDeploymentCICDMapping(
  id: string,
  data: Partial<Omit<CICDDeploymentMapping, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Build update object
    const updateData: any = {};
    if (data.parameters) updateData.parameters = data.parameters;
    if (data.build_number) updateData.build_number = data.build_number;
    if (data.build_url) updateData.build_url = data.build_url;
    
    // Add updated_at
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('deployment_cicd_mappings')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('DB layer: Error updating deployment CICD mapping:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('DB layer: Unexpected error updating deployment CICD mapping:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get CICD mappings for a deployment
 */
async function getDeploymentCICDMappings({ 
  where
}: GetParams = {}): Promise<{ 
  success: boolean; 
  data?: CICDDeploymentMapping[]; 
  error?: string 
}> {
  try {
    // Build query
    let query = supabase
      .from('deployment_cicd_mappings')
      .select(`
        *,
        cicd_jobs (*)
      `);
    
    // Add deployment filter if provided
    if (where?.deployment_id) {
      query = query.eq('deployment_id', where.deployment_id);
    }

    // Execute query
    const { data: mappings, error } = await query;

    if (error) {
      console.error('DB layer: Error getting deployment CICD mappings:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: mappings as CICDDeploymentMapping[]
    };
  } catch (error: any) {
    console.error('DB layer: Unexpected error getting deployment CICD mappings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a deployment-CICD mapping
 */
async function deleteDeploymentCICDMapping(
  mapping_id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('deployment_cicd_mappings')
      .delete()
      .eq('id', mapping_id);

    if (error) {
      console.error('DB layer: Error deleting deployment CICD mapping:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('DB layer: Unexpected error deleting deployment CICD mapping:', error);
    return { success: false, error: error.message };
  }
}

export default {
  // Provider operations
  createCICDProvider,
  updateCICDProvider,
  deleteCICDProvider,
  getCICDProvider,
  getCICDProviders,
  
  // Job operations
  createCICDJob,
  getCICDJob,
  getCICDJobs,
  
  // Mapping operations
  createDeploymentCICDMapping,
  updateDeploymentCICDMapping,
  getDeploymentCICDMappings,
  deleteDeploymentCICDMapping
};