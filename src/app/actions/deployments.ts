'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

import { getUser } from '@/app/actions/user';
import { CICDPipelineConfig } from '@/lib/services/cicd/interfaces';
import { getCurrentUser } from '@/lib/session';
import { supabase } from '@/lib/supabase/browser-client';
import { checkPermission } from '@/lib/supabase/db-teams/permissions';
import { checkResourceLimit } from '@/lib/supabase/db-teams/resource-limits';
import { getUserActiveTeam } from '@/lib/supabase/db-teams/teams';
import { AuthUser } from '@/types/user';

import {
  Deployment,
  DeploymentFormData,
  DeploymentStatus,
} from '../[locale]/[tenant]/deployment/types';

// Generic server action result type
type ServerActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

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
 * Get deployments with team-based filtering
 */
export async function getDeployments(): Promise<ServerActionResult<Deployment[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get the user's active team
    const teamResult = await getUserActiveTeam(user.id);
    if (!teamResult.success || !teamResult.data) {
      return { success: false, error: 'Failed to get active team' };
    }

    // Check if user has permission to select deployments
    const canSelect = await checkPermission(user.id, teamResult.data.id, 'deployments', 'select');

    if (!canSelect) {
      return { success: false, error: 'Permission denied' };
    }

    // Fetch deployments for the active team
    const { data, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('team_id', teamResult.data.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data as Deployment[],
    };
  } catch (error) {
    console.error('Error fetching deployments:', error);
    return {
      success: false,
      error: 'Failed to fetch deployments',
    };
  }
}

/**
 * Get a single deployment by ID
 */
export async function getDeploymentById(id: string): Promise<ServerActionResult<Deployment>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Fetch deployment
    const { data, error } = await supabase.from('deployments').select('*').eq('id', id).single();

    if (error) throw error;

    const deployment = data as Deployment;

    // Check if user has permission to view this deployment
    const canSelect = await checkPermission(user.id, deployment.team_id, 'deployments', 'select');

    if (!canSelect) {
      return { success: false, error: 'Permission denied' };
    }

    return {
      success: true,
      data: deployment,
    };
  } catch (error) {
    console.error('Error fetching deployment:', error);
    return {
      success: false,
      error: 'Failed to fetch deployment',
    };
  }
}

/**
 * Create a new deployment
 */
export async function createDeployment(
  payload: DeploymentFormData,
): Promise<ServerActionResult<{ deploymentId?: string; error?: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get the user's active team
    const teamResult = await getUserActiveTeam(user.id);
    if (!teamResult.success || !teamResult.data) {
      return { success: false, error: 'Failed to get active team' };
    }

    // Check permission to create deployments
    const canInsert = await checkPermission(user.id, teamResult.data.id, 'deployments', 'insert');

    if (!canInsert) {
      return { success: false, error: 'Permission denied' };
    }

    // Check resource limit
    const limitCheck = await checkResourceLimit(payload.tenant_id, 'deployments');

    if (!limitCheck.success || !limitCheck.data) {
      return { success: false, error: 'Failed to check resource limits' };
    }

    if (!limitCheck.data.allowed) {
      return {
        success: false,
        error: `Resource limit reached: ${limitCheck.data.current}/${limitCheck.data.maximum === 'unlimited' ? 'unlimited' : limitCheck.data.maximum}`,
      };
    }

    // Create the deployment
    const deploymentId = uuidv4();
    const { data, error } = await supabase
      .from('deployments')
      .insert({
        id: deploymentId,
        ...payload,
        status: 'pending',
        user_id: user.id,
        creator_id: user.id, // Track who created this resource
        team_id: teamResult.data.id, // Assign to the active team
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      success: true,
      data: { deploymentId: data.id },
    };
  } catch (error) {
    console.error('Error creating deployment:', error);
    return {
      success: false,
      error: 'Failed to create deployment',
    };
  }
}

/**
 * Update a deployment
 */
export async function updateDeployment(
  id: string,
  payload: Partial<DeploymentFormData>,
): Promise<ServerActionResult<Deployment>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Fetch the deployment to get team_id and creator_id
    const { data: existingDeployment, error: fetchError } = await supabase
      .from('deployments')
      .select('team_id, creator_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Check if user has permission to update this deployment
    const canUpdate = await checkPermission(
      user.id,
      existingDeployment.team_id,
      'deployments',
      'update',
      existingDeployment.creator_id,
    );

    if (!canUpdate) {
      return { success: false, error: 'Permission denied' };
    }

    // Update the deployment
    const { data, error } = await supabase
      .from('deployments')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as Deployment,
    };
  } catch (error) {
    console.error('Error updating deployment:', error);
    return {
      success: false,
      error: 'Failed to update deployment',
    };
  }
}

/**
 * Delete a deployment
 */
export async function deleteDeployment(id: string): Promise<ServerActionResult<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Fetch the deployment to get team_id and creator_id
    const { data: existingDeployment, error: fetchError } = await supabase
      .from('deployments')
      .select('team_id, creator_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Check if user has permission to delete this deployment
    const canDelete = await checkPermission(
      user.id,
      existingDeployment.team_id,
      'deployments',
      'delete',
      existingDeployment.creator_id,
    );

    if (!canDelete) {
      return { success: false, error: 'Permission denied' };
    }

    // Delete the deployment
    const { error } = await supabase.from('deployments').delete().eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting deployment:', error);
    return {
      success: false,
      error: 'Failed to delete deployment',
    };
  }
}

/**
 * Execute a deployment (run it)
 */
export async function executeDeployment(id: string): Promise<ServerActionResult<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Fetch the deployment to get team_id
    const { data: existingDeployment, error: fetchError } = await supabase
      .from('deployments')
      .select('team_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Check if user has permission to execute deployments
    const canExecute = await checkPermission(
      user.id,
      existingDeployment.team_id,
      'deployments',
      'execute',
    );

    if (!canExecute) {
      return { success: false, error: 'Permission denied: You do not have execution rights' };
    }

    // Start the deployment
    const { error } = await supabase
      .from('deployments')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    // Here you would trigger the actual deployment job
    // This could be an RPC call to a function, a webhook, etc.

    return { success: true };
  } catch (error) {
    console.error('Error executing deployment:', error);
    return {
      success: false,
      error: 'Failed to execute deployment',
    };
  }
}

/**
 * Get all deployments for the current user
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

    console.log('Fetching deployments for tenant:', user.tenant_id);

    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');

    // Fetch deployments from the database
    const where = { tenant_id: user.tenant_id };
    const cookieStore = await cookies();
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
 * Fetch a single deployment by ID (legacy implementation)
 */
export async function fetchDeploymentById(id: string): Promise<Deployment | null> {
  try {
    const user = await getUser();
    if (!user) {
      console.error('Actions layer: Cannot fetch deployment - user not authenticated');
      return null;
    }

    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');

    // Fetch deployment from the database
    const cookieStore = await cookies();
    const result = await deploymentDb.findUnique({ id }, cookieStore);

    // Handle the result based on its structure
    if (result && typeof result === 'object') {
      if ('success' in result && result.success === false) {
        console.error('Actions layer: Error fetching deployment:', result.error);
        return null;
      }

      let dbDeployment: any = null;

      if ('data' in result) {
        dbDeployment = result.data;
      } else if (result && !('success' in result)) {
        dbDeployment = result;
      }

      if (!dbDeployment) {
        console.log('Actions layer: No deployment found with ID:', id);
        return null;
      }

      // Map database result to Deployment type
      return mapDbDeploymentToDeployment(dbDeployment);
    }

    console.error('Actions layer: Unexpected result structure from database');
    return null;
  } catch (error) {
    console.error('Error in fetchDeploymentById:', error);
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

    const cookieStore = await cookies();

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

    // Use the team-based getDeploymentById
    const deploymentResult = await getDeploymentById(id);
    if (!deploymentResult.success || !deploymentResult.data) {
      return { success: false, error: deploymentResult.error || 'Deployment not found' };
    }

    const deployment = deploymentResult.data;

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
 * @param deploymentId Deployment ID to run
 * @returns Object with success status and optional error
 */
export async function runDeployment(
  deploymentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Actions layer: Running deployment ${deploymentId}`);

    // Get user
    const user = await getUser();
    if (!user) {
      console.error('Actions layer: Cannot run deployment - user not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    // Use the team-based getDeploymentById
    const deploymentResult = await getDeploymentById(deploymentId);
    if (!deploymentResult.success || !deploymentResult.data) {
      return { success: false, error: deploymentResult.error || 'Deployment not found' };
    }

    const deployment = deploymentResult.data;

    // Get CICD mapping if it exists
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');
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
        parent_deployment_id: deploymentId,
      },
    });

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');

    return { success: true };
  } catch (error: any) {
    console.error(`Actions layer: Error running deployment:`, error);
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

/**
 * Get all deployments for a user without team filtering
 */
export async function getAllDeployments(user?: AuthUser | null): Promise<Deployment[]> {
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

    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');

    // Fetch deployments from the database
    const where = { tenant_id: user.tenant_id };
    const cookieStore = await cookies();
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
    console.error('Error in getAllDeployments:', error);
    return [];
  }
}
