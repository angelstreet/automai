'use server';

import { revalidatePath } from 'next/cache';
import { AuthUser } from '@/types/user';
import { Deployment, DeploymentFormData, DeploymentStatus, Repository } from './types';
import repository, { Repository as DbRepository } from '@/lib/supabase/db-repositories/repository';
import { getUser } from '@/app/actions/user';
import { mapDeploymentToParameters } from './utils';

/**
 * Get all deployments for the current user
 * @param user The authenticated user
 * @returns Array of deployments
 */
export async function getDeployments(user: AuthUser | null): Promise<Deployment[]> {
  try {
    console.log('Actions layer: Fetching deployments for user:', user?.id);
    
    if (!user) {
      console.error('Actions layer: Cannot fetch deployments - user not authenticated');
      return [];
    }
    
    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    
    // Fetch deployments from the database
    const where = { tenant_id: user.tenant_id };
    console.log('Actions layer: Fetching deployments with where:', JSON.stringify(where));
    
    const result = await deploymentDb.findMany({ where });
    console.log('Actions layer: Raw result from database:', JSON.stringify(result, null, 2));
    
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
      if (deployments.length > 0) {
        console.log('Actions layer: First deployment sample:', JSON.stringify(deployments[0], null, 2));
      } else {
        console.log('Actions layer: No deployments found');
      }
      
      return deployments;
    }
    
    console.error('Actions layer: Unexpected result structure from database:', JSON.stringify(result));
    return [];
  } catch (error) {
    console.error('Error fetching deployments:', error);
    throw new Error('Failed to fetch deployments');
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
 * Get a specific deployment by ID
 * @param id Deployment ID
 * @returns Deployment object or null if not found
 */
export async function getDeploymentById(id: string): Promise<Deployment | null> {
  try {
    console.log(`Actions layer: Fetching deployment with ID: ${id}`);
    
    // Get the current user
    const user = await getUser();
    
    if (!user) {
      console.error('Actions layer: Cannot fetch deployment - user not authenticated');
      return null;
    }
    
    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    
    // Fetch deployment from the database
    const where = { id, tenant_id: user.tenant_id };
    console.log('Actions layer: Fetching deployment with where:', JSON.stringify(where));
    
    const result = await deploymentDb.findUnique({ where });
    console.log('Actions layer: Raw result from database:', JSON.stringify(result, null, 2));
    
    // Handle the result based on its structure
    if (result && typeof result === 'object') {
      if ('success' in result && result.success === false && 'error' in result && result.error) {
        console.error('Actions layer: Error fetching deployment:', result.error);
        return null;
      }
      
      let dbDeployment: any = null;
      
      if ('data' in result) {
        dbDeployment = result.data;
      } else if (!('success' in result)) {
        dbDeployment = result;
      }
      
      if (!dbDeployment) {
        console.log(`Actions layer: No deployment found with ID: ${id}`);
        return null;
      }
      
      // Map database result to Deployment type
      const deployment = mapDbDeploymentToDeployment(dbDeployment);
      console.log('Actions layer: Fetched deployment:', JSON.stringify(deployment, null, 2));
      
      return deployment;
    }
    
    console.error('Actions layer: Unexpected result structure from database:', JSON.stringify(result));
    return null;
  } catch (error) {
    console.error(`Error fetching deployment ${id}:`, error);
    throw new Error('Failed to fetch deployment');
  }
}

/**
 * Create a new deployment
 * @param formData Deployment form data
 * @returns Object with success status and optional deployment ID
 */
export async function createDeployment(
  formData: DeploymentFormData
): Promise<{ success: boolean; deploymentId?: string; error?: string }> {
  try {
    console.log('Actions layer: Creating deployment with form data:', JSON.stringify({
      name: formData.name,
      description: formData.description,
      repository: formData.repository,
      selectedScripts: formData.selectedScripts?.length,
      selectedHosts: formData.selectedHosts?.length,
      schedule: formData.schedule,
      jenkinsEnabled: formData.jenkinsConfig?.enabled
    }));

    // Get the current user
    const user = await getUser();
    
    if (!user) {
      console.error('Actions layer: Cannot create deployment - user not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    // Import the deployment and CICD database modules
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');

    // Extract script paths and parameters from the scriptMapping
    const scriptPaths: string[] = [];
    const scriptParameters: string[] = [];
    
    console.log('Actions layer: Raw parameters from form:', JSON.stringify(formData.parameters, null, 2));
    
    if (formData.scriptMapping) {
      Object.entries(formData.scriptMapping).forEach(([scriptId, scriptInfo]) => {
        if (scriptInfo && scriptInfo.path) {
          scriptPaths.push(scriptInfo.path);
          
          // Store parameters for this script path if they exist
          if (formData.parameters && formData.parameters[scriptId] && formData.parameters[scriptId].raw) {
            // Just use the raw parameter value as a string
            const rawParam = formData.parameters[scriptId].raw;
            console.log(`Actions layer: For script ${scriptId}, using raw parameter: "${rawParam}"`);
            scriptParameters.push(rawParam);
          } else {
            // Add an empty string if no parameters
            console.log(`Actions layer: No parameters for script ${scriptId}, using empty string`);
            scriptParameters.push('');
          }
        }
      });
    }

    console.log('Actions layer: Script paths:', scriptPaths);
    console.log('Actions layer: Script parameters:', scriptParameters);

    // Check if the selected hosts are valid UUIDs
    const isValidUUID = (id: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };
    
    const validHostIds = formData.selectedHosts?.filter(id => {
      const isValid = isValidUUID(id);
      if (!isValid) {
        console.warn(`Actions layer: Filtering out invalid host ID: ${id}`);
      }
      return isValid;
    }) || [];

    console.log('Actions layer: Valid host IDs:', validHostIds);

    // Map form data to database schema
    const deploymentData = {
      name: formData.name,
      description: formData.description || '',
      repository_id: formData.repository,
      scripts_path: scriptPaths,
      scripts_parameters: scriptParameters,
      host_ids: validHostIds,
      status: 'pending',
      schedule_type: formData.schedule,
      scheduled_time: formData.scheduledTime || null,
      cron_expression: formData.cronExpression || null,
      repeat_count: formData.repeatCount || 0,
      environment_vars: formData.environmentVars || [], 
      tenant_id: user.tenant_id,
      user_id: user.id
    };

    console.log('Actions layer: Final deployment data:', JSON.stringify(deploymentData, null, 2));
    console.log('Actions layer: Calling deployment.create with data');
    
    // Create the deployment in the database
    const createResult = await deploymentDb.create(deploymentData);
    
    if (!createResult.success) {
      console.error('Actions layer: Error creating deployment:', createResult.error);
      return { success: false, error: createResult.error };
    }
    
    const deploymentId = createResult.data.id;
    console.log(`Actions layer: Deployment created with ID: ${deploymentId}`);
    
    // If Jenkins integration is enabled, create a Jenkins job
    if (formData.jenkinsConfig?.enabled) {
      console.log('Actions layer: Jenkins integration enabled, creating Jenkins job');
      
      try {
        // Import the necessary modules
        const { getCICDProvider } = await import('@/lib/services/cicd');
        const { generateJenkinsPipelineXml } = await import('@/lib/services/cicd/xml-generators');
        
        // Get provider
        const providerId = formData.jenkinsConfig.providerId;
        if (!providerId) {
          console.error('Actions layer: No Jenkins provider ID specified');
          return { success: false, error: 'No Jenkins provider ID specified' };
        }
        
        const providerResult = await getCICDProvider(providerId, user.tenant_id);
        if (!providerResult.success) {
          console.error('Actions layer: Failed to get Jenkins provider:', providerResult.error);
          return { success: false, error: `Failed to get Jenkins provider: ${providerResult.error}` };
        }
        
        // Create job name and XML
        const provider = providerResult.data;
        const jobName = `deployment_${deploymentData.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
        const folderPath = 'trial/joachim_djibril'; // Fixed folder path
        
        // Generate Jenkins job XML
        const jobXml = generateJenkinsPipelineXml(
          deploymentData.name,
          deploymentData.repository_id,
          deploymentData.scripts_path,
          deploymentData.scripts_parameters,
          deploymentData.host_ids
        );
        
        console.log('Actions layer: Creating Jenkins job with XML:', jobXml);
        
        // Create the job in Jenkins
        const createResult = await provider.createJob(jobName, jobXml, folderPath);
        if (!createResult.success) {
          console.error('Actions layer: Failed to create Jenkins job:', createResult.error);
          return { success: false, error: `Failed to create Jenkins job: ${createResult.error}` };
        }
        
        // Get created job ID
        const jobId = createResult.data;
        
        // Store mapping in database for future reference
        await cicdDb.createCICDDeploymentMapping({
          deployment_id: deploymentId,
          provider_id: providerId,
          job_id: jobId,
          parameters: {
            repository_id: deploymentData.repository_id,
            host_ids: deploymentData.host_ids,
          }
        });
        
        console.log(`Actions layer: Jenkins job created successfully with ID: ${jobId}`);
        
        // Trigger the job
        const triggerResult = await provider.triggerJob(jobId);
        if (!triggerResult.success) {
          console.warn('Actions layer: Failed to trigger Jenkins job:', triggerResult.error);
          // Don't fail the deployment creation if trigger fails
        } else {
          console.log('Actions layer: Jenkins job triggered successfully');
        }
      } catch (error) {
        console.error('Actions layer: Error in Jenkins integration:', error);
        // Don't fail the deployment creation if Jenkins integration fails
      }
    }
    
    return { success: true, deploymentId };
  } catch (error) {
    console.error('Error creating deployment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create deployment' };
  }
}

/**
 * Abort a running deployment
 * @param id Deployment ID
 * @returns Object with success status
 */
export async function abortDeployment(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual API call to abort deployment
    // This is a stub implementation
    return { success: true };
  } catch (error) {
    console.error(`Error aborting deployment ${id}:`, error);
    return { success: false, error: 'Failed to abort deployment' };
  }
}

/**
 * Refresh deployment data
 * @param id Deployment ID
 * @returns Object with success status and optional updated deployment
 */
export async function refreshDeployment(
  id: string
): Promise<{ success: boolean; deployment?: Deployment; error?: string }> {
  try {
    console.log(`Actions layer: Refreshing deployment ${id}`);
    
    // Get the deployment
    const deployment = await getDeploymentById(id);
    
    if (!deployment) {
      console.error(`Actions layer: Deployment ${id} not found`);
      return { success: false, error: 'Deployment not found' };
    }
    
    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');
    
    // Check if this deployment has CI/CD integration
    const mappingResult = await cicdDb.getDeploymentCICDMapping({ deployment_id: id });
    
    if (mappingResult.success && mappingResult.data) {
      console.log(`Actions layer: Deployment ${id} has CI/CD integration, updating status`);
      
      // Update CI/CD status
      const statusResult = await updateDeploymentCICDStatus(id);
      
      if (!statusResult.success) {
        console.error(`Actions layer: Failed to update CI/CD status: ${statusResult.error}`);
        // Continue with regular refreshing even if CI/CD status update failed
      }
    }
    
    // Get the latest deployment data
    const refreshedDeployment = await getDeploymentById(id);
    
    return { 
      success: true, 
      deployment: refreshedDeployment || deployment
    };
  } catch (error: any) {
    console.error(`Error refreshing deployment ${id}:`, error);
    return { success: false, error: error.message || 'Failed to refresh deployment' };
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
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');
    
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
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');
    
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
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');
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
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');
    
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
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');
    
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
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');
    
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
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');
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
 * Delete a deployment
 * @param id Deployment ID to delete
 * @returns Object with success status and optional error message
 */
export async function deleteDeployment(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Actions layer: Deleting deployment ${id}`);
    
    // Get the current user
    const user = await getUser();
    
    if (!user) {
      console.error('Actions layer: Cannot delete deployment - user not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    
    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    
    // Delete the deployment from the database
    const result = await deploymentDb.delete({
      where: { id, tenant_id: user.tenant_id }
    });
    
    if (!result.success) {
      console.error('Actions layer: Error deleting deployment:', result.error);
      return { success: false, error: result.error || 'Failed to delete deployment' };
    }
    
    console.log('Actions layer: Deployment deleted successfully');
    
    // Revalidate the deployments list
    revalidatePath('/[locale]/[tenant]/deployment');
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting deployment:', error);
    return { success: false, error: error.message || 'Failed to delete deployment' };
  }
}

/**
 * Run an existing deployment
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
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');
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
    });
    
    return { success: true };
  } catch (error: any) {
    console.error(`Actions layer: Error running deployment:`, error);
    return { success: false, error: error.message || 'Failed to run deployment' };
  }
}