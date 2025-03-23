'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { AuthUser } from '@/types/user';
import { Deployment, DeploymentFormData, DeploymentStatus, Repository } from './types';
import repository, { Repository as DbRepository } from '@/lib/supabase/db-repositories/repository';
import { getUser } from '@/app/actions/user';
import { mapDeploymentToParameters } from './utils';
import { unstable_cache } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// Configure the deployment cache
const DEPLOYMENT_CACHE_TTL = 60; // 60 seconds

/**
 * Helper function to get deployments without caching
 * Used internally by the cached getDeployments function
 */
async function getDeploymentsInternal(tenantId: string, cookieStore: any): Promise<Deployment[]> {
  try {
    console.log('Actions layer: Fetching deployments for tenant:', tenantId);
    
    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    
    // Fetch deployments from the database
    const where = { tenant_id: tenantId };
    console.log('Actions layer: Fetching deployments with where:', JSON.stringify(where));
    
    const result = await deploymentDb.findMany({ where }, cookieStore);
    
    // Handle the result based on its structure
    if (result && typeof result === 'object') {
      if ('success' in result && result.success === false && 'error' in result) {
        console.error('Actions layer: Error fetching deployments:', result.error);
        return [];
      }
      
      let dbDeployments: any[] = [];
      
      if ('data' in result && Array.isArray(result.data)) {
        dbDeployments = result.data;
      } else if (Array.isArray(result)) {
        dbDeployments = result;
      }
      
      // Map database results to Deployment type
      const deployments: Deployment[] = dbDeployments.map(mapDbDeploymentToDeployment);
      
      console.log('Actions layer: Fetched deployments count:', deployments.length);
      
      return deployments;
    }
    
    console.error('Actions layer: Unexpected result structure from database');
    return [];
  } catch (error) {
    console.error('Error fetching deployments:', error);
    throw new Error('Failed to fetch deployments');
  }
}

/**
 * Get all deployments for the current user with caching
 * This wrapper function handles user authentication outside the cache
 */
export async function getDeployments(user?: AuthUser | null): Promise<Deployment[]> {
  try {
    // Get current user if not provided
    if (!user) {
      user = await getUser();
    }
    
    if (!user) {
      console.error('Actions layer: Cannot fetch deployments - user not authenticated');
      return [];
    }
    
    console.log('Actions layer: Fetching deployments for user:', user.id);
    
    // Get the cookie store outside the cached function
    const cookieStore = await cookies();
    
    // Create a cached version of getDeploymentsInternal for this specific tenant
    const getCachedDeploymentsForTenant = unstable_cache(
      async (tenantId: string) => getDeploymentsInternal(tenantId, cookieStore),
      [`deployments-list-by-tenant-${user.tenant_id}`],
      { 
        revalidate: DEPLOYMENT_CACHE_TTL,
        tags: ['deployments']
      }
    );
    
    // Use the cached function with just the tenant ID
    return await getCachedDeploymentsForTenant(user.tenant_id);
  } catch (error) {
    console.error('Error in getDeployments wrapper:', error);
    return [];
  }
}

// Define a function to map database deployment to Deployment type
function mapDbDeploymentToDeployment(dbDeployment: any): Deployment {
  return {
    id: dbDeployment.id,
    name: dbDeployment.name,
    description: dbDeployment.description,
    repositoryId: dbDeployment.repository_id,
    scriptsPath: dbDeployment.scripts_path || [],
    scriptsParameters: dbDeployment.scripts_parameters || [],
    hostIds: dbDeployment.host_ids || [],
    status: dbDeployment.status as DeploymentStatus,
    scheduleType: dbDeployment.schedule_type || 'now',
    scheduledTime: dbDeployment.scheduled_time,
    cronExpression: dbDeployment.cron_expression,
    repeatCount: dbDeployment.repeat_count,
    environmentVars: dbDeployment.environment_vars || [],
    tenantId: dbDeployment.tenant_id,
    userId: dbDeployment.user_id,
    createdAt: dbDeployment.created_at,
    startedAt: dbDeployment.started_at,
    completedAt: dbDeployment.completed_at
  };
}

/**
 * Get a specific deployment by ID with caching
 * @param id Deployment ID
 * @returns Deployment object or null if not found
 */
export async function getDeploymentById(id: string): Promise<Deployment | null> {
  try {
    console.log(`Actions layer: Fetching deployment with ID: ${id}`);
    
    // Get cookie store outside the cache
    const cookieStore = await cookies();
    
    // Create a cached function for this specific deployment ID
    const getCachedDeployment = unstable_cache(
      async (deploymentId: string) => {
        // Import the deployment database module
        const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
        
        // Fetch the deployment from the database
        const result = await deploymentDb.findUnique(deploymentId, cookieStore);
        
        // Handle the result
        if (!result) {
          return null;
        }
        
        return mapDbDeploymentToDeployment(result);
      },
      [`deployment-by-id-${id}`],
      { 
        revalidate: DEPLOYMENT_CACHE_TTL,
        tags: ['deployments', `deployment-${id}`]
      }
    );
    
    return await getCachedDeployment(id);
  } catch (error) {
    console.error(`Error fetching deployment with ID ${id}:`, error);
    return null;
  }
}

/**
 * Create a new deployment
 * @param formData Deployment form data
 * @returns Newly created deployment or null if failed
 */
export async function createDeployment(formData: DeploymentFormData): Promise<Deployment | null> {
  try {
    console.log('Actions layer: Creating deployment with form data:', JSON.stringify(formData, null, 2));
    
    // Get the current user
    const user = await getUser();
    
    if (!user) {
      console.error('Actions layer: Cannot create deployment - user not authenticated');
      return null;
    }
    
    // Get cookie store
    const cookieStore = await cookies();
    
    // Prepare deployment data
    const deploymentData = {
      name: formData.name,
      description: formData.description || '',
      repository_id: formData.repository,
      scripts_path: formData.selectedScripts || [],
      scripts_parameters: formData.parameters || [],
      host_ids: formData.selectedHosts || [],
      status: 'pending' as DeploymentStatus,
      user_id: user.id,
      tenant_id: user.tenant_id,
      schedule_type: formData.schedule || 'now',
      scheduled_time: formData.scheduledTime || null,
      cron_expression: formData.cronExpression || null,
      repeat_count: formData.repeatCount || 0,
      environment_vars: formData.environmentVars || []
    };
    
    console.log('Actions layer: Prepared deployment data:', JSON.stringify(deploymentData, null, 2));
    
    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    
    // Create the deployment in the database
    const result = await deploymentDb.create(deploymentData, cookieStore);
    console.log('Actions layer: Create deployment result:', JSON.stringify(result, null, 2));
    
    // Handle the result
    if (!result || (result && 'success' in result && !result.success)) {
      return null;
    }
    
    // Revalidate cache
    revalidatePath('/deployment', 'page');
    
    // If successful and we have data, map to Deployment type
    if (result.data) {
      return mapDbDeploymentToDeployment(result.data);
    }
    
    return null;
  } catch (error: any) {
    console.error('Error creating deployment:', error);
    return null;
  }
}

/**
 * Update a deployment by ID
 * @param id Deployment ID
 * @param data Updated deployment data
 * @returns Updated deployment or null if not found/error
 */
export async function updateDeployment(id: string, data: Partial<DeploymentFormData>): Promise<Deployment | null> {
  try {
    console.log(`Actions layer: Updating deployment with ID: ${id}`);
    
    // Get cookie store
    const cookieStore = await cookies();
    
    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    
    // Map the form data to database format
    const dbData = {
      name: data.name,
      description: data.description,
      repository_id: data.repository,
      scripts_path: data.scripts,
      scripts_parameters: data.parameters,
      host_ids: data.hosts,
      status: data.status,
      schedule_type: data.schedule,
      scheduled_time: data.scheduledTime,
      cron_expression: data.cronExpression,
      repeat_count: data.repeatCount,
      environment_vars: data.environmentVars
    };
    
    // Update the deployment in the database
    const result = await deploymentDb.update(id, dbData, cookieStore);
    
    // Revalidate cache
    revalidatePath('/deployment', 'page');
    
    // Handle the result
    if (!result || (result && 'success' in result && !result.success)) {
      return null;
    }
    
    // If successful and we have data, map to Deployment type
    const updatedDeployment = result.data 
      ? mapDbDeploymentToDeployment(result.data)
      : null;
    
    return updatedDeployment;
  } catch (error) {
    console.error(`Error updating deployment with ID ${id}:`, error);
    return null;
  }
}

/**
 * Delete a deployment by ID
 * @param id Deployment ID
 * @returns True if deleted successfully, false otherwise
 */
export async function deleteDeployment(id: string): Promise<boolean> {
  console.log(`\n---------------------------------------`);
  console.log(`Actions layer: DELETION START - Deployment ID: ${id}`);
  console.log(`---------------------------------------`);
  
  try {
    console.log(`Actions layer: Deleting deployment with ID: ${id}`);
    
    if (!id) {
      console.error('Actions layer: Cannot delete deployment - deployment ID is required');
      return false;
    }
    
    // Get cookie store
    const cookieStore = await cookies();
    console.log(`Actions layer: Cookie store obtained`);
    
    // Import the deployment database module
    console.log(`Actions layer: Importing database module...`);
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    console.log(`Actions layer: Database module imported successfully`);
    
    // Delete the deployment from the database
    console.log(`Actions layer: Calling database delete function for ID: ${id}`);
    const result = await deploymentDb.delete(id, cookieStore);
    
    // Log detailed result for debugging
    console.log(`Actions layer: Delete deployment result:`, JSON.stringify(result, null, 2));
    
    // Enhanced cache invalidation
    console.log(`Actions layer: Performing thorough cache invalidation...`);
    
    // Stronger cache invalidation by revalidating multiple paths
    revalidatePath(`/deployment`, 'page');
    revalidatePath(`/deployment/${id}`, 'page');
    revalidatePath(`/`, 'layout');
    
    // Tag-based revalidation if available in Next.js version
    try {
      revalidateTag('deployments');
      revalidateTag(`deployment-${id}`);
      console.log(`Actions layer: Tag-based cache invalidation completed`);
    } catch (e) {
      console.log(`Actions layer: Tag-based cache invalidation not available, skipping`);
    }
    
    console.log(`Actions layer: Cache invalidation completed`);
    
    // Return success status with better validation
    const success = result && typeof result === 'object' && 'success' in result && result.success === true;
    if (success) {
      console.log(`Actions layer: Successfully deleted deployment with ID: ${id}`);
    } else {
      const errorMsg = result && typeof result === 'object' && 'error' in result ? result.error : 'Unknown error';
      console.error(`Actions layer: Failed to delete deployment with ID: ${id}. Error: ${errorMsg}`);
    }
    
    console.log(`\n---------------------------------------`);
    console.log(`Actions layer: DELETION END - Result: ${success ? 'SUCCESS' : 'FAILURE'}`);
    console.log(`---------------------------------------`);
    return success;
  } catch (error) {
    console.error(`Actions layer: Error deleting deployment with ID ${id}:`, error);
    console.error(`Actions layer: Error details:`, error instanceof Error ? error.stack : JSON.stringify(error, null, 2));
    console.log(`\n---------------------------------------`);
    console.log(`Actions layer: DELETION END - Result: EXCEPTION`);
    console.log(`---------------------------------------`);
    return false;
  }
}

/**
 * Abort a running deployment
 * @param id Deployment ID
 * @returns Result with success status and error if applicable
 */
export async function abortDeployment(id: string): Promise<{ 
  success: boolean; 
  error?: string 
}> {
  try {
    console.log(`Actions layer: Aborting deployment with ID: ${id}`);
    
    // Get cookie store
    const cookieStore = await cookies();
    
    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    
    // Update the deployment status to aborted
    const updateData = {
      status: 'aborted' as DeploymentStatus,
      completed_at: new Date().toISOString()
    };
    
    console.log(`Actions layer: Updating deployment ${id} with data:`, JSON.stringify(updateData, null, 2));
    
    // Update the deployment in the database
    const result = await deploymentDb.update(id, updateData, cookieStore);
    
    // Revalidate cache
    revalidatePath('/deployment', 'page');
    
    // Handle the result
    if (!result || (result && 'success' in result && !result.success)) {
      const errorMessage = result && 'error' in result ? result.error : 'Failed to abort deployment';
      console.error('Actions layer: Error aborting deployment:', errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    }
    
    console.log(`Actions layer: Successfully aborted deployment with ID: ${id}`);
    return { success: true };
  } catch (error: any) {
    console.error(`Error aborting deployment ${id}:`, error);
    return { 
      success: false, 
      error: error.message || 'Failed to abort deployment' 
    };
  }
}

/**
 * Refresh a deployment's status
 * @param id Deployment ID
 * @returns Result with success status, deployment data, and error if applicable
 */
export async function refreshDeployment(id: string): Promise<{ 
  success: boolean; 
  deployment?: Deployment; 
  error?: string 
}> {
  try {
    console.log(`Actions layer: Refreshing deployment with ID: ${id}`);
    
    // Fetch updated deployment
    const deployment = await getDeploymentById(id);
    
    if (!deployment) {
      console.error(`Actions layer: Deployment with ID ${id} not found`);
      return { 
        success: false, 
        error: 'Deployment not found' 
      };
    }
    
    // Revalidate the cache for this specific deployment
    revalidatePath('/deployment', 'page');
    
    return { 
      success: true, 
      deployment 
    };
  } catch (error: any) {
    console.error(`Error refreshing deployment ${id}:`, error);
    return { 
      success: false, 
      error: error.message || 'Failed to refresh deployment' 
    };
  }
}

/**
 * Get scripts available for a repository
 * @param repositoryId Repository ID
 * @returns Array of scripts
 */
export async function getScriptsForRepository(repositoryId: string): Promise<any[]> {
  try {
    // TODO: Implement actual API call to fetch scripts
    // This is a stub implementation
    return [];
  } catch (error) {
    console.error(`Error fetching scripts for repository ${repositoryId}:`, error);
    throw new Error('Failed to fetch scripts');
  }
}

/**
 * Get available hosts for deployment
 * @returns Array of hosts
 */
export async function getAvailableHosts(): Promise<any[]> {
  try {
    // TODO: Implement actual API call to fetch hosts
    // This is a stub implementation
    return [];
  } catch (error) {
    console.error('Error fetching available hosts:', error);
    throw new Error('Failed to fetch hosts');
  }
}

/**
 * Get deployment status including CI/CD status
 * @param id Deployment ID
 * @returns Object with success status and optional status data
 */
export async function getDeploymentStatus(
  id: string
): Promise<{ success: boolean; deployment?: any; cicd?: any; error?: string }> {
  try {
    // TODO: Implement actual API call to fetch deployment status
    // This is a stub implementation
    return { success: true, deployment: {}, cicd: {} };
  } catch (error) {
    console.error(`Error fetching status for deployment ${id}:`, error);
    return { success: false, error: 'Failed to fetch deployment status' };
  }
}

/**
 * Get repositories for the current user
 * @param user Optional user data to avoid redundant auth calls
 * @returns List of repositories
 */
export async function getRepositories(user?: AuthUser | null): Promise<Repository[]> {
  try {
    // Get the current user if not provided
    const userData = user || await getUser();
    
    if (!userData) {
      console.error('Failed to get user data for repositories');
      return [];
    }
    
    // Get repositories from the database
    const { success, data, error } = await repository.getRepositories(userData.id);
    
    if (!success || error || !data) {
      console.error(`Error fetching repositories: ${error}`);
      return [];
    }
    
    // Map the database repositories to the Repository type
    return data.map((repo: DbRepository) => ({
      id: repo.id,
      name: repo.name,
      owner: repo.full_name && repo.full_name.includes('/') ? repo.full_name.split('/')[0] : 'Unknown',
      url: repo.url
    }));
  } catch (error) {
    console.error('Error in getRepositories:', error);
    return [];
  }
}

/**
 * Get CI/CD providers for the current tenant
 * @returns Object with providers array and optional error
 */
export async function getCICDProvidersAction(): Promise<{ providers: any[]; error?: string }> {
  try {
    console.log('Actions layer: Fetching CI/CD providers');
    
    // Get the current user
    const user = await getUser();
    
    if (!user) {
      console.error('Actions layer: Cannot fetch providers - user not authenticated');
      return { providers: [], error: 'User not authenticated' };
    }
    
    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');
    
    // Fetch providers from the database
    const result = await cicdDb.getCICDProvider({ tenant_id: user.tenant_id });
    
    if (!result.success) {
      console.error('Actions layer: Error fetching CI/CD providers:', result.error);
      return { providers: [], error: result.error };
    }
    
    // Format the providers data
    const providers = Array.isArray(result.data) ? result.data : [result.data].filter(Boolean);
    
    console.log(`Actions layer: Found ${providers.length} CI/CD providers`);
    
    return { providers };
  } catch (error: any) {
    console.error('Error fetching CI/CD providers:', error);
    return { providers: [], error: error.message || 'Failed to fetch CI/CD providers' };
  }
}

/**
 * Get default provider ID for the current tenant
 * @param tenantId Tenant ID
 * @returns Provider ID or null if none found
 */
export async function getDefaultProviderIdForTenant(tenantId: string): Promise<string | null> {
  try {
    console.log(`Actions layer: Getting default CI/CD provider for tenant ${tenantId}`);
    
    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');
    
    // Fetch providers from the database
    const result = await cicdDb.getCICDProvider({ tenant_id: tenantId });
    
    if (!result.success || !result.data) {
      console.error('Actions layer: Error getting default provider:', result.error);
      return null;
    }
    
    // Get the first provider as default
    const providers = Array.isArray(result.data) ? result.data : [result.data].filter(Boolean);
    
    if (providers.length === 0) {
      console.log('Actions layer: No CI/CD providers found for tenant');
      return null;
    }
    
    console.log(`Actions layer: Default provider ID: ${providers[0].id}`);
    return providers[0].id;
  } catch (error: any) {
    console.error('Error getting default CI/CD provider:', error);
    return null;
  }
}

/**
 * Get CI/CD jobs for a provider
 * @param providerId Provider ID
 * @returns Object with jobs array and optional error
 */
export async function getCICDJobsAction(providerId: string): Promise<{ jobs: any[]; error?: string }> {
  try {
    console.log(`Actions layer: Fetching CI/CD jobs for provider ${providerId}`);
    
    if (!providerId) {
      console.error('Actions layer: Cannot fetch jobs - provider ID not provided');
      return { jobs: [], error: 'Provider ID is required' };
    }
    
    // Get the current user
    const user = await getUser();
    
    if (!user) {
      console.error('Actions layer: Cannot fetch jobs - user not authenticated');
      return { jobs: [], error: 'User not authenticated' };
    }
    
    // Import the CI/CD service
    const { getCICDProvider } = await import('@/lib/services/cicd');
    
    // Get the provider instance
    const providerResult = await getCICDProvider(providerId, user.tenant_id);
    
    if (!providerResult.success || !providerResult.data) {
      console.error('Actions layer: Error getting CI/CD provider:', providerResult.error);
      return { jobs: [], error: providerResult.error };
    }
    
    // Get jobs from the provider
    const provider = providerResult.data;
    const jobsResult = await provider.getAvailableJobs();
    
    if (!jobsResult.success) {
      console.error('Actions layer: Error fetching jobs from provider:', jobsResult.error);
      return { jobs: [], error: jobsResult.error };
    }
    
    console.log(`Actions layer: Found ${jobsResult.data.length} CI/CD jobs`);
    
    return { jobs: jobsResult.data || [] };
  } catch (error: any) {
    console.error('Error fetching CI/CD jobs:', error);
    return { jobs: [], error: error.message || 'Failed to fetch CI/CD jobs' };
  }
}

/**
 * Get details for a specific CI/CD job
 * @param providerId Provider ID
 * @param jobId Job ID
 * @returns Object with job details and optional error
 */
export async function getCICDJobDetailsAction(providerId: string, jobId: string): Promise<{ jobDetails: any; error?: string }> {
  try {
    console.log(`Actions layer: Fetching CI/CD job details for provider ${providerId}, job ${jobId}`);
    
    if (!providerId || !jobId) {
      console.error('Actions layer: Cannot fetch job details - provider ID or job ID not provided');
      return { jobDetails: null, error: 'Provider ID and Job ID are required' };
    }
    
    // Get the current user
    const user = await getUser();
    
    if (!user) {
      console.error('Actions layer: Cannot fetch job details - user not authenticated');
      return { jobDetails: null, error: 'User not authenticated' };
    }
    
    // Import the CI/CD service
    const { getCICDProvider } = await import('@/lib/services/cicd');
    
    // Get the provider instance
    const providerResult = await getCICDProvider(providerId, user.tenant_id);
    
    if (!providerResult.success || !providerResult.data) {
      console.error('Actions layer: Error getting CI/CD provider:', providerResult.error);
      return { jobDetails: null, error: providerResult.error };
    }
    
    // Get job details from the provider
    const provider = providerResult.data;
    const jobResult = await provider.getJobDetails(jobId);
    
    if (!jobResult.success) {
      console.error('Actions layer: Error fetching job details from provider:', jobResult.error);
      return { jobDetails: null, error: jobResult.error };
    }
    
    console.log('Actions layer: Successfully fetched job details');
    
    return { 
      jobDetails: {
        job: jobResult.data,
        parameters: jobResult.data.parameters || []
      }
    };
  } catch (error: any) {
    console.error('Error fetching CI/CD job details:', error);
    return { jobDetails: null, error: error.message || 'Failed to fetch CI/CD job details' };
  }
}

/**
 * Update deployment status based on CI/CD job status
 * @param deploymentId Deployment ID
 * @returns Object with success status
 */
export async function updateDeploymentCICDStatus(
  deploymentId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    console.log(`Actions layer: Updating CI/CD status for deployment ${deploymentId}`);
    
    // Get the current user
    const user = await getUser();
    
    if (!user) {
      console.error('Actions layer: Cannot update status - user not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    
    // Get the deployment
    const deployment = await getDeploymentById(deploymentId);
    
    if (!deployment) {
      console.error(`Actions layer: Deployment ${deploymentId} not found`);
      return { success: false, error: 'Deployment not found' };
    }
    
    // Import the database modules
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    
    // Get the CI/CD mapping
    const mappingResult = await cicdDb.getDeploymentCICDMapping({ 
      deployment_id: deploymentId,
      tenant_id: user.tenant_id 
    });
    
    if (!mappingResult.success || !mappingResult.data) {
      console.error(`Actions layer: No CI/CD mapping found for deployment ${deploymentId}`);
      return { success: false, error: 'No CI/CD mapping found' };
    }
    
    const mapping = mappingResult.data;
    
    // Import the CI/CD service
    const { getCICDProvider } = await import('@/lib/services/cicd');
    
    // Get the provider
    const providerResult = await getCICDProvider(mapping.provider_id, user.tenant_id);
    
    if (!providerResult.success || !providerResult.data) {
      console.error(`Actions layer: Failed to get CI/CD provider ${mapping.provider_id}`);
      return { success: false, error: 'Failed to get CI/CD provider' };
    }
    
    const provider = providerResult.data;
    
    // Get the build status
    const buildResult = await provider.getBuildStatus(mapping.job_id, mapping.build_id);
    
    if (!buildResult.success) {
      console.error(`Actions layer: Failed to get build status: ${buildResult.error}`);
      return { success: false, error: buildResult.error };
    }
    
    const buildStatus = buildResult.data.status;
    console.log(`Actions layer: Current build status: ${buildStatus}`);
    
    // Map CI/CD status to deployment status
    let deploymentStatus: DeploymentStatus;
    switch (buildStatus) {
      case 'success':
        deploymentStatus = 'completed';
        break;
      case 'failure':
        deploymentStatus = 'failed';
        break;
      case 'running':
        deploymentStatus = 'running';
        break;
      case 'pending':
        deploymentStatus = 'pending';
        break;
      default:
        deploymentStatus = 'pending';
    }
    
    // Update the deployment status
    await deploymentDb.update({
      where: { id: deploymentId },
      data: { status: deploymentStatus }
    });
    
    // Update the CI/CD mapping status
    await cicdDb.updateDeploymentCICDMapping({
      where: { id: mapping.id },
      data: { status: buildStatus }
    });
    
    console.log(`Actions layer: Updated deployment status to ${deploymentStatus}`);
    
    return { 
      success: true, 
      status: deploymentStatus
    };
  } catch (error: any) {
    console.error(`Error updating CI/CD status for deployment ${deploymentId}:`, error);
    return { success: false, error: error.message || 'Failed to update deployment status' };
  }
}

/**
 * Create a new CI/CD provider
 * @param providerData Provider data to create
 * @returns Object with success status and optional provider ID
 */
export async function createCICDProviderAction(
  providerData: any
): Promise<{ success: boolean; providerId?: string; error?: string }> {
  try {
    console.log('Actions layer: Creating CI/CD provider:', JSON.stringify({
      name: providerData.name,
      type: providerData.type,
      url: providerData.url,
      auth_type: providerData.auth_type
    }));
    
    // Get the current user
    const user = await getUser();
    
    if (!user) {
      console.error('Actions layer: Cannot create CI/CD provider - user not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    
    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');
    
    // Map form data to database schema
    const dbProviderData = {
      name: providerData.name,
      type: providerData.type,
      url: providerData.url,
      config: {
        auth_type: providerData.auth_type,
        credentials: providerData.credentials,
        status: 'configured'
      },
      tenant_id: user.tenant_id
    };
    
    // Create the provider in the database
    const result = await cicdDb.createCICDProvider({ data: dbProviderData });
    
    if (!result.success) {
      console.error('Actions layer: Error creating CI/CD provider:', result.error);
      return { success: false, error: result.error || 'Failed to create CI/CD provider' };
    }
    
    console.log('Actions layer: CI/CD provider created with ID:', result.id);
    
    // Revalidate the CI/CD providers list
    revalidatePath('/[locale]/[tenant]/deployment/cicd');
    
    return { 
      success: true, 
      providerId: result.id 
    };
  } catch (error: any) {
    console.error('Error creating CI/CD provider:', error);
    return { success: false, error: error.message || 'Failed to create CI/CD provider' };
  }
}

/**
 * Update an existing CI/CD provider
 * @param providerData Provider data to update
 * @returns Object with success status
 */
export async function updateCICDProviderAction(
  providerData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Actions layer: Updating CI/CD provider:', JSON.stringify({
      id: providerData.id,
      name: providerData.name,
      type: providerData.type,
      url: providerData.url,
      auth_type: providerData.auth_type
    }));
    
    if (!providerData.id) {
      console.error('Actions layer: Cannot update CI/CD provider - provider ID is required');
      return { success: false, error: 'Provider ID is required' };
    }
    
    // Get the current user
    const user = await getUser();
    
    if (!user) {
      console.error('Actions layer: Cannot update CI/CD provider - user not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    
    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');
    
    // Get the existing provider data
    const existingProvider = await cicdDb.getCICDProvider({
      where: { id: providerData.id, tenant_id: user.tenant_id }
    });
    
    if (!existingProvider.success || !existingProvider.data) {
      console.error('Actions layer: Cannot update CI/CD provider - provider not found');
      return { success: false, error: 'Provider not found' };
    }
    
    // Map form data to database schema
    const dbProviderData = {
      name: providerData.name,
      type: providerData.type,
      url: providerData.url,
      config: {
        ...existingProvider.data.config,
        auth_type: providerData.auth_type,
        credentials: providerData.credentials || existingProvider.data.config.credentials
      }
    };
    
    // Update the provider in the database
    const result = await cicdDb.updateCICDProvider({
      where: { id: providerData.id, tenant_id: user.tenant_id },
      data: dbProviderData
    });
    
    if (!result.success) {
      console.error('Actions layer: Error updating CI/CD provider:', result.error);
      return { success: false, error: result.error || 'Failed to update CI/CD provider' };
    }
    
    console.log('Actions layer: CI/CD provider updated successfully');
    
    // Revalidate the CI/CD providers list
    revalidatePath('/[locale]/[tenant]/deployment/cicd');
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating CI/CD provider:', error);
    return { success: false, error: error.message || 'Failed to update CI/CD provider' };
  }
}

/**
 * Delete a CI/CD provider
 * @param providerId Provider ID to delete
 * @returns Object with success status
 */
export async function deleteCICDProviderAction(
  providerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Actions layer: Deleting CI/CD provider ${providerId}`);
    
    if (!providerId) {
      console.error('Actions layer: Cannot delete CI/CD provider - provider ID is required');
      return { success: false, error: 'Provider ID is required' };
    }
    
    // Get the current user
    const user = await getUser();
    
    if (!user) {
      console.error('Actions layer: Cannot delete CI/CD provider - user not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    
    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');
    
    // Check if there are any deployment mappings using jobs from this provider
    const mappings = await cicdDb.getDeploymentCICDMappings({});
    
    if (mappings.success && mappings.data) {
      const relatedMappings = mappings.data.filter(mapping => 
        mapping.cicd_jobs && mapping.cicd_jobs.provider_id === providerId
      );
      
      if (relatedMappings.length > 0) {
        console.error(`Actions layer: Cannot delete CI/CD provider - it is used by ${relatedMappings.length} deployments`);
        return { 
          success: false, 
          error: `Cannot delete provider - it is being used by ${relatedMappings.length} deployments`
        };
      }
    }
    
    // Delete the provider from the database
    const result = await cicdDb.deleteCICDProvider({
      where: { id: providerId, tenant_id: user.tenant_id }
    });
    
    if (!result.success) {
      console.error('Actions layer: Error deleting CI/CD provider:', result.error);
      return { success: false, error: result.error || 'Failed to delete CI/CD provider' };
    }
    
    console.log('Actions layer: CI/CD provider deleted successfully');
    
    // Revalidate the CI/CD providers list
    revalidatePath('/[locale]/[tenant]/deployment/cicd');
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting CI/CD provider:', error);
    return { success: false, error: error.message || 'Failed to delete CI/CD provider' };
  }
}

/**
 * Test connection to a CI/CD provider
 * @param providerData Provider data to test
 * @returns Object with success status
 */
export async function testCICDProviderAction(
  providerData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Actions layer: Testing CI/CD provider connection:', JSON.stringify({
      name: providerData.name,
      type: providerData.type,
      url: providerData.url,
      auth_type: providerData.auth_type
    }));
    
    // Get the current user
    const user = await getUser();
    
    if (!user) {
      console.error('Actions layer: Cannot test CI/CD provider - user not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    
    // Import the CI/CD service
    const { getCICDProvider, CICDProviderFactory } = await import('@/lib/services/cicd');
    
    // Create a temporary provider config for testing
    const providerConfig = {
      id: providerData.id || 'temp-id',
      type: providerData.type,
      name: providerData.name,
      url: providerData.url,
      config: {
        auth_type: providerData.auth_type,
        credentials: providerData.credentials,
        status: 'testing'
      }
    };
    
    // Try to create and initialize the provider
    try {
      const provider = CICDProviderFactory.createProvider(providerConfig);
      
      // Test connection by getting available jobs
      const jobsResult = await provider.getAvailableJobs();
      
      if (!jobsResult.success) {
        console.error('Actions layer: CI/CD provider connection test failed:', jobsResult.error);
        return { success: false, error: jobsResult.error || 'Failed to connect to CI/CD provider' };
      }
      
      console.log(`Actions layer: CI/CD provider connection test successful, found ${jobsResult.data.length} jobs`);
      
      return { success: true };
    } catch (error: any) {
      console.error('Actions layer: Error testing CI/CD provider connection:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to connect to CI/CD provider'
      };
    }
  } catch (error: any) {
    console.error('Error testing CI/CD provider connection:', error);
    return { success: false, error: error.message || 'Failed to test CI/CD provider connection' };
  }
}

/**
 * Sync CI/CD jobs for a provider
 * @param providerId Provider ID to sync jobs for
 * @returns Object with success status and job count
 */
export async function syncCICDJobsAction(
  providerId: string
): Promise<{ success: boolean; jobCount?: number; error?: string }> {
  try {
    console.log(`Actions layer: Syncing CI/CD jobs for provider ${providerId}`);
    
    if (!providerId) {
      console.error('Actions layer: Cannot sync CI/CD jobs - provider ID is required');
      return { success: false, error: 'Provider ID is required' };
    }
    
    // Get the current user
    const user = await getUser();
    
    if (!user) {
      console.error('Actions layer: Cannot sync CI/CD jobs - user not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    
    // Import the CI/CD database and service modules
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');
    const { getCICDProvider } = await import('@/lib/services/cicd');
    
    // Get the provider from the database
    const providerResult = await cicdDb.getCICDProvider({
      where: { id: providerId, tenant_id: user.tenant_id }
    });
    
    if (!providerResult.success || !providerResult.data) {
      console.error('Actions layer: Cannot sync CI/CD jobs - provider not found');
      return { success: false, error: 'Provider not found' };
    }
    
    // Get the provider service instance
    const serviceResult = await getCICDProvider(providerId, user.tenant_id);
    
    if (!serviceResult.success || !serviceResult.data) {
      console.error('Actions layer: Error getting CI/CD provider service:', serviceResult.error);
      return { success: false, error: serviceResult.error || 'Failed to get CI/CD provider service' };
    }
    
    const provider = serviceResult.data;
    
    // Get available jobs from the provider
    const jobsResult = await provider.getAvailableJobs();
    
    if (!jobsResult.success) {
      console.error('Actions layer: Error getting available jobs:', jobsResult.error);
      return { success: false, error: jobsResult.error || 'Failed to get available jobs' };
    }
    
    // Sync jobs to the database
    let syncedCount = 0;
    
    for (const job of jobsResult.data) {
      // Check if job already exists
      const existingJob = await cicdDb.getCICDJob({
        where: { 
          external_id: job.id,
          provider_id: providerId
        }
      });
      
      if (existingJob.success && existingJob.data) {
        // Update existing job
        // We don't actually need to update anything here as the job definition
        // doesn't change often, but we could add update logic if needed
        syncedCount++;
      } else {
        // Create new job
        const jobData = {
          provider_id: providerId,
          external_id: job.id,
          name: job.name,
          path: job.url,
          description: job.description,
          parameters: job.parameters
        };
        
        const createResult = await cicdDb.createCICDJob({ data: jobData });
        
        if (createResult.success) {
          syncedCount++;
        } else {
          console.error(`Actions layer: Error creating job ${job.name}:`, createResult.error);
        }
      }
    }
    
    console.log(`Actions layer: Synced ${syncedCount} jobs for provider ${providerId}`);
    
    // Revalidate the CI/CD jobs list
    revalidatePath('/[locale]/[tenant]/deployment/cicd');
    
    return { 
      success: true,
      jobCount: syncedCount
    };
  } catch (error: any) {
    console.error('Error syncing CI/CD jobs:', error);
    return { success: false, error: error.message || 'Failed to sync CI/CD jobs' };
  }
}

/**
 * Run a deployment
 * @param deploymentId Deployment ID to run
 * @returns Object with success status and optional error
 */
export async function runDeploymentAction(
  deploymentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Actions layer: Running deployment ${deploymentId}`);
    
    // Get user
    const user = await getUser();
    if (!user) {
      console.error('Actions layer: Cannot run deployment - user not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    
    // Get deployment details
    const deployment = await getDeploymentById(deploymentId);
    if (!deployment) {
      console.error(`Actions layer: Deployment ${deploymentId} not found`);
      return { success: false, error: 'Deployment not found' };
    }
    
    // Get CICD mapping if it exists
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');
    const mappingResult = await cicdDb.getCICDDeploymentMapping({
      where: { deployment_id: deploymentId }
    });
    
    // If there's a CICD mapping, trigger the Jenkins job
    if (mappingResult.success && mappingResult.data) {
      const mapping = mappingResult.data;
      
      console.log(`Actions layer: Found CICD mapping for deployment ${deploymentId}`);
      
      const { getCICDProvider } = await import('@/lib/services/cicd');
      const providerResult = await getCICDProvider(mapping.provider_id, user.tenant_id);
      
      if (providerResult.success) {
        const provider = providerResult.data;
        
        // Trigger the job
        console.log(`Actions layer: Triggering Jenkins job ${mapping.job_id}`);
        const result = await provider.triggerJob(mapping.job_id, mapping.parameters);
        
        if (!result.success) {
          console.error(`Actions layer: Failed to trigger Jenkins job: ${result.error}`);
          return { success: false, error: `Failed to trigger Jenkins job: ${result.error}` };
        }
        
        console.log(`Actions layer: Jenkins job triggered successfully`);
      } else {
        console.error(`Actions layer: Failed to get CICD provider: ${providerResult.error}`);
        return { success: false, error: `Failed to get CICD provider: ${providerResult.error}` };
      }
    } else {
      console.log(`Actions layer: No CICD mapping found for deployment ${deploymentId}, running directly`);
      // Here you would implement the direct execution flow if there's no Jenkins job
    }
    
    // Create a deployment run record
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    
    await deploymentDb.create({
      data: {
        name: `${deployment.name} (Run)`,
        description: deployment.description,
        repository_id: deployment.repositoryId,
        scripts_path: deployment.scriptsPath,
        scripts_parameters: deployment.scriptsParameters,
        host_ids: deployment.hostIds,
        status: 'pending',
        schedule_type: 'now',
        environment_vars: deployment.environmentVars || [],
        tenant_id: user.tenant_id,
        user_id: user.id,
        parent_deployment_id: deploymentId
      }
    });
    
    return { success: true };
  } catch (error: any) {
    console.error(`Actions layer: Error running deployment:`, error);
    return { success: false, error: error.message || 'Failed to run deployment' };
  }
}

/**
 * Test the Jenkins API directly using the provider credentials from the database
 */
export async function testJenkinsAPI(): Promise<ServerActionResult<any>> {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: 'Unauthorized access' };
    }
    
    console.log('Actions layer: Testing Jenkins API with authenticated user', user.id);
    
    // Get all Jenkins providers for the tenant
    const providers = await cicdDb.getCICDProviders({ where: { tenant_id: user.tenant_id } });
    
    if (!providers.success || !providers.data || providers.data.length === 0) {
      return { success: false, error: 'No Jenkins provider found' };
    }
    
    // Find the Jenkins provider (first one available)
    const jenkinsProvider = providers.data.find(p => p.type === 'jenkins');
    
    if (!jenkinsProvider) {
      return { success: false, error: 'No Jenkins provider found' };
    }
    
    console.log('Actions layer: Found Jenkins provider:', {
      id: jenkinsProvider.id,
      name: jenkinsProvider.name,
      url: jenkinsProvider.url,
      auth_type: jenkinsProvider.config.auth_type,
      credentials_available: {
        username: !!jenkinsProvider.config.credentials.username,
        token: !!jenkinsProvider.config.credentials.token,
      }
    });
    
    // Import the CICD provider
    const { getCICDProvider } = await import('@/lib/services/cicd');
    
    // Get the provider instance
    const providerResult = await getCICDProvider(jenkinsProvider.id, user.tenant_id);
    
    if (!providerResult.success || !providerResult.data) {
      return { success: false, error: providerResult.error || 'Failed to initialize Jenkins provider' };
    }
    
    const provider = providerResult.data;
    
    // Test the connection
    const testResult = await provider.testConnection();
    
    console.log('Actions layer: Jenkins connection test result:', testResult);
    
    if (!testResult.success) {
      return { success: false, error: `Connection test failed: ${testResult.error}` };
    }
    
    // Try to get a crumb
    const crumbResult = await provider['getCrumb']();
    
    console.log('Actions layer: Jenkins crumb result:', crumbResult);
    
    return { 
      success: true, 
      data: {
        connectionTest: testResult,
        crumbTest: crumbResult,
        provider: {
          id: jenkinsProvider.id,
          name: jenkinsProvider.name,
          url: jenkinsProvider.url,
          type: jenkinsProvider.type
        }
      }
    };
  } catch (error: any) {
    console.error('Actions layer: Error testing Jenkins API:', error);
    return { success: false, error: error.message || 'Error testing Jenkins API' };
  }
}