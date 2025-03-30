'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { getUser } from '@/app/actions/user';
import { CICDPipelineConfig } from '@/lib/services/cicd/interfaces';
import { AuthUser, User } from '@/types/user';

import {
  Deployment,
  DeploymentFormData,
  DeploymentStatus,
} from '../[locale]/[tenant]/deployment/types';

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
    completedAt: dbDeployment.completed_at,
  };
}

/**
 * Get all deployments for the current user
 */
export async function getDeployments(user?: AuthUser | User | null): Promise<Deployment[]> {
  try {
    // Get current user if not provided
    if (!user) {
      user = await getUser();
    }

    if (!user) {
      console.error('Actions layer: Cannot fetch deployments - user not authenticated');
      return [];
    }

    console.log('Fetching deployments for tenant:', user.tenant_id);

    // Get cookie store once for all operations
    const cookieStore = await cookies();

    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');

    // Fetch deployments from the database
    const where = { tenant_id: user.tenant_id };
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
    console.error('Error in getDeployments:', error);
    return [];
  }
}

/**
 * Get a specific deployment by ID
 * @param id Deployment ID
 * @returns Deployment object or null if not found
 */
export async function getDeploymentById(id: string): Promise<Deployment | null> {
  try {
    // Make sure we have an actual ID
    if (!id) {
      console.error('Actions layer: Cannot fetch deployment - ID is required');
      return null;
    }

    // Get user for tenant isolation
    const user = await getUser();

    if (!user) {
      console.error('Actions layer: Cannot fetch deployment - user not authenticated');
      return null;
    }

    console.log(`Fetching deployment with ID: ${id}`);

    // Get cookie store once for all operations
    const cookieStore = await cookies();

    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');

    // Fetch the deployment from the database
    const result = await deploymentDb.findUnique(id, cookieStore);

    // Handle the result
    if (!result) {
      return null;
    }

    return mapDbDeploymentToDeployment(result);
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
export async function createDeployment(formData: DeploymentFormData): Promise<{
  success: boolean;
  deploymentId?: string;
  error?: string;
}> {
  try {
    console.log('🚀 [DEPLOYMENT_CREATE] Starting deployment creation process');

    // Ensure we have a valid user
    const user = await getUser();
    if (!user || !user.tenant_id) {
      console.error('❌ [DEPLOYMENT_CREATE] No authenticated user found');
      return { success: false, error: 'User not authenticated' };
    }

    // Get cookie store once for all operations
    const cookieStore = await cookies();

    // Get the active team ID
    const selectedTeamCookie = cookieStore.get(`selected_team_${user.id}`)?.value;
    const teamId = selectedTeamCookie || user.teams?.[0]?.id;

    if (!teamId) {
      console.error('❌ [DEPLOYMENT_CREATE] No team available for deployment creation');
      return {
        success: false,
        error: 'No team available for deployment creation',
      };
    }

    // Extract raw parameters from formData
    const rawParameters =
      formData.selectedScripts?.map((scriptPath, index) => {
        const scriptParam = formData.parameters?.find((p) => p.script_path === scriptPath);
        return scriptParam?.raw || '';
      }) || [];

    // 1. Create CICD job with provider reference
    console.log('🔄 [CICD_JOB] Starting CICD job creation');
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');

    // Get the provider first to validate it exists and is configured
    const providerResult = await cicdDb.getCICDProvider(
      {
        where: { id: formData.provider_id },
      },
      cookieStore,
    );

    if (!providerResult.success || !providerResult.data) {
      console.error('❌ [CICD_JOB] Provider not found or not configured:', providerResult.error);
      // Create deployment with failed status
      const failedDeploymentData = {
        name: formData.name,
        description: formData.description || '',
        repository_id: formData.repository,
        scripts_path: formData.selectedScripts || [],
        scripts_parameters: rawParameters,
        host_ids: formData.selectedHosts || [],
        status: 'failed' as DeploymentStatus,
        team_id: teamId, // Explicitly add team_id
        creator_id: user.id, // Explicitly add creator_id
        user_id: user.id,
        tenant_id: user.tenant_id,
        schedule_type: formData.schedule || 'now',
        scheduled_time: formData.scheduledTime || null,
        cron_expression: formData.cronExpression || null,
        repeat_count: formData.repeatCount || 0,
        environment_vars: formData.environmentVars || [],
      };

      const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
      const failedResult = await deploymentDb.create({ data: failedDeploymentData }, cookieStore);

      return {
        success: false,
        error: `Failed to create CICD job: ${providerResult.error || 'Provider not found'}`,
        deploymentId: failedResult?.data?.id,
      };
    }

    // Initialize the Jenkins provider
    const { getCICDProvider } = await import('@/lib/services/cicd');
    const provider = await getCICDProvider(formData.provider_id, user.tenant_id);

    if (!provider.success || !provider.data) {
      console.error('❌ [CICD_JOB] Failed to initialize provider:', provider.error);
      // Create deployment with failed status
      const failedDeploymentData = {
        name: formData.name,
        description: formData.description || '',
        repository_id: formData.repository,
        scripts_path: formData.selectedScripts || [],
        scripts_parameters: rawParameters,
        host_ids: formData.selectedHosts || [],
        status: 'failed' as DeploymentStatus,
        team_id: teamId, // Explicitly add team_id
        creator_id: user.id, // Explicitly add creator_id
        user_id: user.id,
        tenant_id: user.tenant_id,
        schedule_type: formData.schedule || 'now',
        scheduled_time: formData.scheduledTime || null,
        cron_expression: formData.cronExpression || null,
        repeat_count: formData.repeatCount || 0,
        environment_vars: formData.environmentVars || [],
      };

      const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
      const failedResult = await deploymentDb.create({ data: failedDeploymentData }, cookieStore);

      return {
        success: false,
        error: `Failed to initialize provider: ${provider.error}`,
        deploymentId: failedResult?.data?.id,
      };
    }

    // Create the pipeline configuration
    const pipelineConfig: CICDPipelineConfig = {
      name: formData.name,
      description: formData.description || formData.name,
      repository: {
        id: formData.repository,
      },
      stages: [
        {
          name: 'Deploy Scripts',
          steps:
            formData.selectedScripts?.map((scriptPath, index) => ({
              type: scriptPath.endsWith('.py') ? 'script' : 'command',
              script: scriptPath,
              command: scriptPath,
              parameters: formData.parameters?.[index]?.raw
                ? {
                    args: formData.parameters[index].raw,
                  }
                : undefined,
            })) || [],
        },
      ],
      parameters:
        formData.parameters?.map((param: { script_path: string; raw: string }) => ({
          name: param.script_path,
          type: 'text' as const,
          description: `Parameters for script: ${param.script_path}`,
          defaultValue: param.raw || '',
        })) || [],
      triggers:
        formData.schedule_type === 'cron'
          ? [
              {
                type: 'schedule' as const,
                config: {
                  schedule: formData.cronExpression,
                },
              },
            ]
          : [],
    };

    // Create the actual Jenkins job
    const jobName = `deployment-${Date.now()}`;
    const createJobResult = await provider.data.createJob(jobName, pipelineConfig);

    if (!createJobResult.success) {
      console.error('❌ [CICD_JOB] Failed to create Jenkins job:', createJobResult.error);
      // Create deployment with failed status
      const failedDeploymentData = {
        name: formData.name,
        description: formData.description || '',
        repository_id: formData.repository,
        scripts_path: formData.selectedScripts || [],
        scripts_parameters: rawParameters,
        host_ids: formData.selectedHosts || [],
        status: 'failed' as DeploymentStatus,
        team_id: teamId, // Explicitly add team_id
        creator_id: user.id, // Explicitly add creator_id
        user_id: user.id,
        tenant_id: user.tenant_id,
        schedule_type: formData.schedule || 'now',
        scheduled_time: formData.scheduledTime || null,
        cron_expression: formData.cronExpression || null,
        repeat_count: formData.repeatCount || 0,
        environment_vars: formData.environmentVars || [],
      };

      const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
      const failedResult = await deploymentDb.create({ data: failedDeploymentData }, cookieStore);

      return {
        success: false,
        error: `Failed to create Jenkins job: ${createJobResult.error}`,
        deploymentId: failedResult?.data?.id,
      };
    }

    // Create CICD job record in database
    const cicdResult = await cicdDb.createCICDJob(
      {
        data: {
          provider_id: formData.provider_id,
          external_id: jobName,
          name: `${formData.name} Job`,
          description: formData.description || 'Deployment job',
          parameters: rawParameters,
        },
      },
      cookieStore,
    );

    if (!cicdResult.success) {
      console.error('❌ [CICD_JOB] Failed to create CICD job record:', cicdResult.error);
      // Try to clean up the Jenkins job since we couldn't record it
      await provider.data.deleteJob(jobName);

      // Create deployment with failed status
      const failedDeploymentData = {
        name: formData.name,
        description: formData.description || '',
        repository_id: formData.repository,
        scripts_path: formData.selectedScripts || [],
        scripts_parameters: rawParameters,
        host_ids: formData.selectedHosts || [],
        status: 'failed' as DeploymentStatus,
        team_id: teamId, // Explicitly add team_id
        creator_id: user.id, // Explicitly add creator_id
        user_id: user.id,
        tenant_id: user.tenant_id,
        schedule_type: formData.schedule || 'now',
        scheduled_time: formData.scheduledTime || null,
        cron_expression: formData.cronExpression || null,
        repeat_count: formData.repeatCount || 0,
        environment_vars: formData.environmentVars || [],
      };

      const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
      const failedResult = await deploymentDb.create({ data: failedDeploymentData }, cookieStore);

      return {
        success: false,
        error: `Failed to create CICD job record: ${cicdResult.error}`,
        deploymentId: failedResult?.data?.id,
      };
    }
    console.log('📊 [CICD_JOB] CICD job creation result:', JSON.stringify(cicdResult, null, 2));

    // 2. Create deployment with CICD job reference
    const deploymentData = {
      name: formData.name,
      description: formData.description || '',
      repository_id: formData.repository,
      scripts_path: formData.selectedScripts || [],
      scripts_parameters: rawParameters,
      host_ids: formData.selectedHosts || [],
      status: 'pending' as DeploymentStatus,
      team_id: teamId, // Explicitly add team_id
      creator_id: user.id, // Explicitly add creator_id
      user_id: user.id,
      tenant_id: user.tenant_id,
      schedule_type: formData.schedule || 'now',
      scheduled_time: formData.scheduledTime || null,
      cron_expression: formData.cronExpression || null,
      repeat_count: formData.repeatCount || 0,
      environment_vars: formData.environmentVars || [],
    };

    console.log(
      '📦 [DEPLOYMENT_CREATE] Creating deployment with data:',
      JSON.stringify(deploymentData, null, 2),
    );
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    const result = await deploymentDb.create({ data: deploymentData }, cookieStore);

    if (!result || (result && 'success' in result && !result.success)) {
      console.error('❌ [DEPLOYMENT_CREATE] Failed to create deployment:', result?.error);
      return { success: false, error: result?.error || 'Failed to create deployment' };
    }
    console.log(
      '📊 [DEPLOYMENT_CREATE] Deployment creation result:',
      JSON.stringify(result, null, 2),
    );

    // 3. Create mapping between deployment and CICD job
    if (result.data?.id && cicdResult.id) {
      console.log('🔗 [MAPPING] Creating deployment-CICD mapping...');
      const mappingResult = await cicdDb.createDeploymentCICDMapping(
        {
          deployment_id: result.data.id,
          job_id: cicdResult.id,
          parameters: rawParameters,
        },
        cookieStore,
      );
      console.log('📊 [MAPPING] Mapping creation result:', JSON.stringify(mappingResult, null, 2));
    } else {
      console.warn(
        '⚠️ [MAPPING] Missing IDs for mapping, deployment_id:',
        result?.data?.id,
        'job_id:',
        cicdResult?.id,
      );
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');

    if (result.data) {
      const newDeployment = mapDbDeploymentToDeployment(result.data);
      console.log('✅ [DEPLOYMENT_CREATE] Successfully created deployment:', newDeployment.id);

      return {
        success: true,
        deploymentId: newDeployment.id,
      };
    }

    return { success: false, error: 'Failed to create deployment - no data returned' };
  } catch (error: any) {
    console.error('❌ [DEPLOYMENT_CREATE] Error creating deployment:', error);
    return { success: false, error: error.message || 'Failed to create deployment' };
  }
}

/**
 * Update a deployment by ID
 * @param id Deployment ID
 * @param data Updated deployment data
 * @returns Updated deployment or null if not found/error
 */
export async function updateDeployment(
  id: string,
  data: Partial<DeploymentFormData>,
): Promise<Deployment | null> {
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
      scripts_path: data.selectedScripts,
      scripts_parameters: data.parameters,
      host_ids: data.selectedHosts,
      status: data.status,
      schedule_type: data.schedule,
      scheduled_time: data.scheduledTime,
      cron_expression: data.cronExpression,
      repeat_count: data.repeatCount,
      environment_vars: data.environmentVars,
    };

    // Update the deployment in the database
    const result = await deploymentDb.update(id, dbData, cookieStore);

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');

    // Handle the result
    if (!result || (result && 'success' in result && !result.success)) {
      return null;
    }

    // If successful and we have data, map to Deployment type
    const updatedDeployment = result.data ? mapDbDeploymentToDeployment(result.data) : null;

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

    // Get the user for tenant information and proper cache invalidation
    const user = await getUser();
    if (!user) {
      console.error('Actions layer: Cannot delete deployment - user not authenticated');
      return false;
    }

    // Get cookie store
    const cookieStore = await cookies();
    console.log(`Actions layer: Cookie store obtained`);

    // Import the required database modules
    console.log(`Actions layer: Importing database modules...`);
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');
    console.log(`Actions layer: Database modules imported successfully`);

    // Get the deployment first (for tenant validation and to have its data for cache key generation)
    const deployment = await getDeploymentById(id);
    if (!deployment) {
      console.error(`Actions layer: Deployment with ID ${id} not found`);
      return false;
    }

    // Validate tenant (important security check)
    if (deployment.tenantId !== user.tenant_id) {
      console.error(`Actions layer: Deployment belongs to a different tenant`);
      return false;
    }

    // 1. Get the CICD mapping first to get job information
    console.log(`Actions layer: Getting CICD mapping for deployment ${id}`);
    const mappingResult = await cicdDb.getDeploymentCICDMappings(
      {
        where: { deployment_id: id },
      },
      cookieStore,
    );

    if (mappingResult.success && mappingResult.data && mappingResult.data.length > 0) {
      const mapping = mappingResult.data[0];

      // 2. Delete the job from Jenkins if it exists
      if (mapping.provider_id) {
        console.log(`Actions layer: Deleting Jenkins job for deployment ${id}`);
        const { getCICDProvider } = await import('@/lib/services/cicd');
        const providerResult = await getCICDProvider(mapping.provider_id, user.tenant_id);

        if (providerResult.success && providerResult.data) {
          const provider = providerResult.data;
          // Get the CICD job to get its external_id (Jenkins job name)
          const jobResult = await cicdDb.getCICDJob(
            {
              where: { id: mapping.job_id },
            },
            cookieStore,
          );

          if (jobResult.success && jobResult.data) {
            // Delete the job from Jenkins
            await provider.deleteJob(jobResult.data.external_id);
            console.log(`Actions layer: Deleted Jenkins job ${jobResult.data.external_id}`);
          }
        }
      }

      // 3. Delete the CICD job from database
      if (mapping.job_id) {
        console.log(`Actions layer: Deleting CICD job record ${mapping.job_id}`);
        await cicdDb.deleteCICDJob(
          {
            where: { id: mapping.job_id },
          },
          cookieStore,
        );
      }

      // 4. Delete the mapping
      console.log(`Actions layer: Deleting CICD mapping ${mapping.id}`);
      await cicdDb.deleteDeploymentCICDMapping(mapping.id, cookieStore);
    }

    // 5. Delete the deployment from the database
    console.log(`Actions layer: Deleting deployment record ${id}`);
    const result = await deploymentDb.delete(id, cookieStore);

    // Log detailed result for debugging
    console.log(`Actions layer: Delete deployment result:`, JSON.stringify(result, null, 2));

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');

    console.log(`Actions layer: Cache invalidation completed`);

    // Return success status with better validation
    const success =
      result && typeof result === 'object' && 'success' in result && result.success === true;
    if (success) {
      console.log(`Actions layer: Successfully deleted deployment with ID: ${id}`);
    } else {
      const errorMsg =
        result && typeof result === 'object' && 'error' in result ? result.error : 'Unknown error';
      console.error(
        `Actions layer: Failed to delete deployment with ID: ${id}. Error: ${errorMsg}`,
      );
    }

    console.log(`\n---------------------------------------`);
    console.log(`Actions layer: DELETION END - Result: ${success ? 'SUCCESS' : 'FAILURE'}`);
    console.log(`---------------------------------------`);
    return success;
  } catch (error) {
    console.error(`Actions layer: Error deleting deployment with ID ${id}:`, error);
    console.error(
      `Actions layer: Error details:`,
      error instanceof Error ? error.stack : JSON.stringify(error, null, 2),
    );
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
  error?: string;
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
      completed_at: new Date().toISOString(),
    };

    console.log(
      `Actions layer: Updating deployment ${id} with data:`,
      JSON.stringify(updateData, null, 2),
    );

    // Update the deployment in the database
    const result = await deploymentDb.update(id, updateData, cookieStore);

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');

    // Handle the result
    if (!result || (result && 'success' in result && !result.success)) {
      const errorMessage =
        result && 'error' in result ? result.error : 'Failed to abort deployment';
      console.error('Actions layer: Error aborting deployment:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }

    console.log(`Actions layer: Successfully aborted deployment with ID: ${id}`);
    return { success: true };
  } catch (error: any) {
    console.error(`Error aborting deployment ${id}:`, error);
    return {
      success: false,
      error: error.message || 'Failed to abort deployment',
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
  error?: string;
}> {
  try {
    console.log(`Actions layer: Refreshing deployment with ID: ${id}`);

    // Fetch updated deployment
    const deployment = await getDeploymentById(id);

    if (!deployment) {
      console.error(`Actions layer: Deployment with ID ${id} not found`);
      return {
        success: false,
        error: 'Deployment not found',
      };
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');

    return {
      success: true,
      deployment,
    };
  } catch (error: any) {
    console.error(`Error refreshing deployment ${id}:`, error);
    return {
      success: false,
      error: error.message || 'Failed to refresh deployment',
    };
  }
}

/**
 * Get scripts for a specific repository
 * @param repositoryId Repository ID
 * @returns Array of scripts
 */
export async function getScriptsForRepository(repositoryId: string): Promise<any[]> {
  try {
    console.log(`[Actions] Getting scripts for repository ${repositoryId}`);

    // Get user for tenant isolation
    const user = await getUser();
    if (!user) {
      console.error('[Actions] Cannot fetch scripts - user not authenticated');
      return [];
    }

    // Get the repository details first
    const { repository } = await import('@/lib/supabase/db-repositories');
    const repoResult = await repository.getRepository(repositoryId, user.profile_id);

    if (!repoResult.success || !repoResult.data) {
      console.error(`[Actions] Repository ${repositoryId} not found`);
      return [];
    }

    const repo = repoResult.data;

    // Get the git provider details
    const { gitProvider } = await import('@/lib/supabase/db-repositories');
    const providerResult = await gitProvider.getGitProviderById(repo.provider_id);

    if (!providerResult.success || !providerResult.data) {
      console.error(`[Actions] Provider not found for repository ${repositoryId}`);
      return [];
    }

    const provider = providerResult.data;

    // Get the appropriate git API based on provider type
    let contents: any[] = [];
    let rootContents: any[] = [];

    switch (provider.type) {
      case 'github': {
        const { listFiles } = await import('@/lib/github-api');
        try {
          contents = await listFiles(
            repo.owner,
            repo.name,
            'scripts',
            undefined,
            provider.access_token,
          );
        } catch (e) {
          console.log('[Actions] No scripts directory found, checking root');
        }
        rootContents = await listFiles(repo.owner, repo.name, '', undefined, provider.access_token);
        break;
      }
      case 'gitlab': {
        const { listFiles } = await import('@/lib/gitlab-api');
        try {
          contents = await listFiles(
            repo.owner,
            repo.name,
            'scripts',
            undefined,
            provider.access_token,
          );
        } catch (e) {
          console.log('[Actions] No scripts directory found, checking root');
        }
        rootContents = await listFiles(repo.owner, repo.name, '', undefined, provider.access_token);
        break;
      }
      case 'gitea': {
        const { listFiles } = await import('@/lib/gitea-api');
        try {
          contents = await listFiles(
            repo.owner,
            repo.name,
            'scripts',
            undefined,
            provider.access_token,
          );
        } catch (e) {
          console.log('[Actions] No scripts directory found, checking root');
        }
        rootContents = await listFiles(repo.owner, repo.name, '', undefined, provider.access_token);
        break;
      }
      default:
        console.error(`[Actions] Unsupported provider type: ${provider.type}`);
        return [];
    }

    // Filter for script files and combine both directories
    const scriptFiles = [...contents, ...rootContents].filter(
      (file) =>
        file.type === 'file' &&
        (file.path.endsWith('.sh') || file.path.endsWith('.py') || file.path.endsWith('.js')),
    );

    // Map to script objects
    return scriptFiles.map((file) => ({
      id: `${repositoryId}-${file.path}`,
      name: file.path.split('/').pop() || file.path,
      path: file.path,
      type: file.path.endsWith('.py')
        ? 'python'
        : file.path.endsWith('.js')
          ? 'javascript'
          : 'shell',
      parameters: [],
    }));
  } catch (error) {
    console.error('[Actions] Error getting scripts for repository:', error);
    return [];
  }
}

/**
 * Run a deployment
 * @param deploymentId The ID of the deployment to run
 */
export async function runDeployment(
  deploymentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🚀 [DEPLOYMENT_RUN] Starting deployment with ID: ${deploymentId}`);

    // Get current user
    const user = await getUser();
    if (!user) {
      console.error('❌ [DEPLOYMENT_RUN] User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    // Get cookie store once for all operations
    const cookieStore = await cookies();

    // Import dependencies
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');

    // Get the deployment details
    console.log(`🔍 [DEPLOYMENT_RUN] Fetching deployment details for ID: ${deploymentId}`);
    const deployment = await deploymentDb.findUnique(deploymentId, cookieStore);

    if (!deployment) {
      console.error(`❌ [DEPLOYMENT_RUN] Deployment with ID ${deploymentId} not found`);
      return { success: false, error: 'Deployment not found' };
    }

    // Update deployment status to running
    console.log(`⏳ [DEPLOYMENT_RUN] Updating deployment status to 'running'`);
    await deploymentDb.update(
      {
        where: { id: deploymentId },
        data: {
          status: 'running',
          started_at: new Date().toISOString(),
        },
      },
      cookieStore,
    );

    // Get CICD mapping if it exists
    const mappingResult = await cicdDb.getCICDDeploymentMapping({
      where: { deployment_id: deploymentId },
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
        console.log(`Actions layer: Triggering Jenkins job ${mapping.cicd_job_id}`);
        const result = await provider.triggerJob(mapping.cicd_job_id, mapping.parameters);

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
      console.log(
        `Actions layer: No CICD mapping found for deployment ${deploymentId}, running directly`,
      );
      // Here you would implement the direct execution flow if there's no Jenkins job
    }

    // Create a deployment run record
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
        parent_deployment_id: deploymentId,
      },
    });

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');

    return { success: true };
  } catch (error: any) {
    console.error('Error in runDeployment:', error);
    return { success: false, error: error.message || 'Failed to run deployment' };
  }
}

/**
 * Clear deployment-related cache by revalidating paths
 */
export async function clearDeploymentCache(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');

    console.log('Cache invalidation completed through path revalidation');

    return {
      success: true,
      message: 'Cache cleared via path revalidation',
    };
  } catch (error) {
    console.error('Error clearing deployment cache:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
