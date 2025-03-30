import { createClient } from '@/lib/supabase/server';

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

/**
 * Create a new CI/CD provider
 */
async function createCICDProvider(
  { data }: CreateProviderParams,
  cookieStore?: any,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:createCICDProvider] Creating new CI/CD provider');

    // Create provider with config object
    const { data: provider, error } = await supabase
      .from('cicd_providers')
      .insert({
        name: data.name,
        type: data.type,
        url: data.url,
        config: data.config,
        tenant_id: data.tenant_id,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[@db:cicd:createCICDProvider] Error creating CI/CD provider:', error);
      return { success: false, error: error.message };
    }

    console.log('[@db:cicd:createCICDProvider] CI/CD provider created with ID:', provider.id);

    return {
      success: true,
      id: provider.id,
    };
  } catch (error: any) {
    console.error('[@db:cicd:createCICDProvider] Unexpected error creating CI/CD provider:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing CI/CD provider
 */
async function updateCICDProvider(
  { where, data }: UpdateProviderParams,
  cookieStore?: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:updateCICDProvider] Updating CI/CD provider');

    // Build update query
    let query = supabase.from('cicd_providers').update({
      ...data,
      updated_at: new Date().toISOString(),
    });

    // Add where clauses
    if (where.id) {
      query = query.eq('id', where.id);
    }
    if (where.tenant_id) {
      query = query.eq('tenant_id', where.tenant_id);
    }

    // Execute query
    const { error } = await query;

    if (error) {
      console.error('[@db:cicd:updateCICDProvider] Error updating CI/CD provider:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[@db:cicd:updateCICDProvider] Unexpected error updating CI/CD provider:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a CI/CD provider
 */
async function deleteCICDProvider(
  { where }: DeleteParams,
  cookieStore?: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:deleteCICDProvider] Deleting CI/CD provider');

    // Build delete query
    let query = supabase.from('cicd_providers').delete();

    // Add where clauses
    if (where.id) {
      query = query.eq('id', where.id);
    }
    if (where.tenant_id) {
      query = query.eq('tenant_id', where.tenant_id);
    }

    // Execute query
    const { error } = await query;

    if (error) {
      console.error('[@db:cicd:deleteCICDProvider] Error deleting CI/CD provider:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[@db:cicd:deleteCICDProvider] Unexpected error deleting CI/CD provider:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a specific CI/CD provider
 */
async function getCICDProvider(
  { where }: GetParams,
  cookieStore?: any,
): Promise<{
  success: boolean;
  data?: CICDProvider;
  error?: string;
}> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:getCICDProvider] Getting specific CI/CD provider');

    // Build query
    let query = supabase.from('cicd_providers').select('*');

    // Add where clauses
    if (where?.id) {
      query = query.eq('id', where.id);
    }
    if (where?.tenant_id) {
      query = query.eq('tenant_id', where.tenant_id);
    }

    // Execute query
    const { data: provider, error } = await query.single();

    if (error) {
      console.error('[@db:cicd:getCICDProvider] Error getting CI/CD provider:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: provider as CICDProvider,
    };
  } catch (error: any) {
    console.error('[@db:cicd:getCICDProvider] Unexpected error getting CI/CD provider:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all CI/CD providers
 */
async function getCICDProviders(
  { where }: GetParams = {},
  cookieStore?: any,
): Promise<{
  success: boolean;
  data?: CICDProvider[];
  error?: string;
}> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:getCICDProviders] Getting all CI/CD providers');

    // Build query
    let query = supabase.from('cicd_providers').select('*');

    // Add tenant filter if provided
    if (where?.tenant_id) {
      query = query.eq('tenant_id', where.tenant_id);
    }

    // Log the constructed query
    console.log(
      '[@db:cicd:getCICDProviders] Executing query on cicd_providers with tenant_id:',
      where?.tenant_id,
    );

    // Execute query
    const { data: providers, error } = await query;

    if (error) {
      console.error('[@db:cicd:getCICDProviders] Error getting CI/CD providers:', error);
      return { success: false, error: error.message };
    }

    console.log(
      '[@db:cicd:getCICDProviders] Retrieved CI/CD providers count:',
      providers?.length || 0,
    );

    return {
      success: true,
      data: providers as CICDProvider[],
    };
  } catch (error: any) {
    console.error('[@db:cicd:getCICDProviders] Unexpected error getting CI/CD providers:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new CI/CD job
 */
async function createCICDJob(
  { data }: CreateJobParams,
  cookieStore?: any,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:createCICDJob] Creating new CI/CD job');

    // Create job
    const { data: job, error } = await supabase
      .from('cicd_jobs')
      .insert({
        provider_id: data.provider_id,
        external_id: data.external_id,
        name: data.name,
        description: data.description,
        parameters: data.parameters,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[@db:cicd:createCICDJob] Error creating CI/CD job:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      id: job.id,
    };
  } catch (error: any) {
    console.error('[@db:cicd:createCICDJob] Unexpected error creating CI/CD job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a CI/CD job by ID or other criteria
 */
async function getCICDJob(
  { where }: GetParams = {},
  cookieStore?: any,
): Promise<{
  success: boolean;
  data?: CICDJob;
  error?: string;
}> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:getCICDJob] Getting specific CI/CD job');

    // Build query
    let query = supabase.from('cicd_jobs').select('*');

    // Add where clauses
    if (where?.id) {
      query = query.eq('id', where.id);
    }

    if (where?.provider_id) {
      query = query.eq('provider_id', where.provider_id);
    }

    if (where?.external_id) {
      query = query.eq('external_id', where.external_id);
    }

    // Execute query
    const { data: job, error } = await query.single();

    if (error) {
      console.error('[@db:cicd:getCICDJob] Error getting CI/CD job:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: job as CICDJob,
    };
  } catch (error: any) {
    console.error('[@db:cicd:getCICDJob] Unexpected error getting CI/CD job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get CI/CD jobs
 */
async function getCICDJobs(
  { where }: GetParams = {},
  cookieStore?: any,
): Promise<{
  success: boolean;
  data?: CICDJob[];
  error?: string;
}> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:getCICDJobs] Getting all CI/CD jobs');

    // Build query
    let query = supabase.from('cicd_jobs').select('*');

    // Add where clauses
    if (where?.provider_id) {
      query = query.eq('provider_id', where.provider_id);
    }

    // Execute query
    const { data: jobs, error } = await query;

    if (error) {
      console.error('[@db:cicd:getCICDJobs] Error getting CI/CD jobs:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: jobs as CICDJob[],
    };
  } catch (error: any) {
    console.error('[@db:cicd:getCICDJobs] Unexpected error getting CI/CD jobs:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a CI/CD job
 */
async function updateCICDJob(
  { where, data }: UpdateJobParams,
  cookieStore?: any,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:updateCICDJob] Updating CI/CD job');

    // Build query
    let query = supabase.from('cicd_jobs').update({
      ...data,
      updated_at: new Date().toISOString(),
    });

    // Add where clauses
    if (where.id) {
      query = query.eq('id', where.id);
    }

    // Execute query
    const { error } = await query;

    if (error) {
      console.error('[@db:cicd:updateCICDJob] Error updating CI/CD job:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[@db:cicd:updateCICDJob] Unexpected error updating CI/CD job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a CI/CD job
 */
async function deleteCICDJob(
  { where }: DeleteParams,
  cookieStore?: any,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:deleteCICDJob] Deleting CI/CD job');

    // Build query
    let query = supabase.from('cicd_jobs').delete();

    // Add where clauses
    if (where.id) {
      query = query.eq('id', where.id);
    }

    // Execute query
    const { error } = await query;

    if (error) {
      console.error('[@db:cicd:deleteCICDJob] Error deleting CI/CD job:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[@db:cicd:deleteCICDJob] Unexpected error deleting CI/CD job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a CI/CD deployment mapping
 */
async function createDeploymentCICDMapping(
  data: {
    deployment_id: string;
    job_id: string;
    parameters?: any;
    build_number?: number;
    build_url?: string;
  },
  cookieStore?: any,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:createDeploymentCICDMapping] Creating deployment CICD mapping');

    // Create mapping
    const { data: mapping, error } = await supabase
      .from('deployment_cicd_mappings')
      .insert({
        deployment_id: data.deployment_id,
        cicd_job_id: data.job_id,
        parameters: data.parameters || {},
        build_number: data.build_number,
        build_url: data.build_url,
      })
      .select('id')
      .single();

    if (error) {
      console.error(
        '[@db:cicd:createDeploymentCICDMapping] Error creating deployment CICD mapping:',
        error,
      );
      return { success: false, error: error.message };
    }

    return {
      success: true,
      id: mapping.id,
    };
  } catch (error: any) {
    console.error(
      '[@db:cicd:createDeploymentCICDMapping] Unexpected error creating deployment CICD mapping:',
      error,
    );
    return { success: false, error: error.message };
  }
}

/**
 * Update a CI/CD deployment mapping
 */
async function updateDeploymentCICDMapping(
  id: string,
  data: Partial<Omit<CICDDeploymentMapping, 'id' | 'created_at' | 'updated_at'>>,
  cookieStore?: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:updateDeploymentCICDMapping] Updating deployment CICD mapping');

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.build_number) updateData.build_number = data.build_number;
    if (data.build_url) updateData.build_url = data.build_url;
    if (data.parameters) updateData.parameters = data.parameters;

    // Update mapping
    const { error } = await supabase
      .from('deployment_cicd_mappings')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error(
        '[@db:cicd:updateDeploymentCICDMapping] Error updating deployment CICD mapping:',
        error,
      );
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error(
      '[@db:cicd:updateDeploymentCICDMapping] Unexpected error updating deployment CICD mapping:',
      error,
    );
    return { success: false, error: error.message };
  }
}

/**
 * Get CI/CD deployment mappings
 */
async function getDeploymentCICDMappings(
  {
    where = {},
  }: {
    where?: any;
  } = {},
  cookieStore?: any,
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:getDeploymentCICDMappings] Getting deployment CICD mappings');

    // Build query
    let query = supabase.from('deployment_cicd_mappings').select('*');

    // Add where clauses
    if (where.deployment_id) {
      query = query.eq('deployment_id', where.deployment_id);
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error(
        '[@db:cicd:getDeploymentCICDMappings] Error getting deployment CICD mappings:',
        error,
      );
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as any[],
    };
  } catch (error: any) {
    console.error(
      '[@db:cicd:getDeploymentCICDMappings] Unexpected error getting deployment CICD mappings:',
      error,
    );
    return { success: false, error: error.message };
  }
}

/**
 * Get a single CI/CD deployment mapping
 */
async function getCICDDeploymentMapping(
  {
    where = {},
  }: {
    where?: any;
  } = {},
  cookieStore?: any,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:getCICDDeploymentMapping] Getting specific CI/CD deployment mapping');

    // Build query
    let query = supabase.from('deployment_cicd_mappings').select('*');

    // Add where clauses
    if (where.deployment_id) {
      query = query.eq('deployment_id', where.deployment_id);
    }

    // Execute query and get single result
    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(
        '[@db:cicd:getCICDDeploymentMapping] Error getting CI/CD deployment mapping:',
        error,
      );
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error: any) {
    console.error(
      '[@db:cicd:getCICDDeploymentMapping] Unexpected error getting CI/CD deployment mapping:',
      error,
    );
    return { success: false, error: error.message };
  }
}

/**
 * Delete a CI/CD deployment mapping
 */
async function deleteDeploymentCICDMapping(
  mapping_id: string,
  cookieStore?: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create Supabase client with cookieStore
    const supabase = await createClient(cookieStore);

    console.log('[@db:cicd:deleteDeploymentCICDMapping] Deleting deployment CICD mapping');

    // Delete mapping
    const { error } = await supabase.from('deployment_cicd_mappings').delete().eq('id', mapping_id);

    if (error) {
      console.error(
        '[@db:cicd:deleteDeploymentCICDMapping] Error deleting deployment CICD mapping:',
        error,
      );
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error(
      '[@db:cicd:deleteDeploymentCICDMapping] Unexpected error deleting deployment CICD mapping:',
      error,
    );
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
  updateCICDJob,
  deleteCICDJob,

  // Mapping operations
  createDeploymentCICDMapping,
  updateDeploymentCICDMapping,
  getDeploymentCICDMappings,
  getCICDDeploymentMapping,
  deleteDeploymentCICDMapping,
};
