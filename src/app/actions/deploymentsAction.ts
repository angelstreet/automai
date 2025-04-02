'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { getUser } from '@/app/actions/userAction';
import {
  Deployment,
  DeploymentFormData,
  DeploymentStatus,
} from '@/types/component/deploymentComponentType';
import { AuthUser, User } from '@/types/service/userServiceType';

// Define CICDPipelineConfig type
interface CICDPipelineConfig {
  name: string;
  description: string;
  repository: {
    id: string;
  };
  stages: Array<{
    name: string;
    steps: Array<{
      type: string;
      script: string;
      command: string;
      parameters?: {
        args: string;
      };
    }>;
  }>;
  parameters: Array<{
    name: string;
    type: 'text';
    description: string;
    defaultValue: string;
  }>;
  triggers: Array<{
    type: 'schedule';
    config: {
      schedule: string;
    };
  }>;
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
    completedAt: dbDeployment.completed_at,
  };
}

/**
 * Get all deployments for the current user
 */
export const getDeployments = cache(
  async (user?: AuthUser | User | null): Promise<Deployment[]> => {
    try {
      // Get current user if not provided
      if (!user) {
        user = await getUser();
      }

      if (!user) {
        console.error('[@action:deployments:getDeployments] User not authenticated');
        return [];
      }

      console.log(
        '[@action:deployments:getDeployments] Fetching deployments for tenant:',
        user.tenant_id,
      );

      // Get cookie store once for all operations
      const cookieStore = await cookies();

      // Import the deployment database module
      const { default: deploymentDb } = await import('@/lib/db/deploymentDb');

      // Fetch deployments from the database
      const result = await deploymentDb.getDeployments(user.tenant_id, cookieStore);

      if (!result.success || !result.data) {
        console.error(
          '[@action:deployments:getDeployments] Error fetching deployments:',
          result.error,
        );
        return [];
      }

      console.log(
        '[@action:deployments:getDeployments] Fetched deployments count:',
        result.data.length,
      );
      return result.data;
    } catch (error) {
      console.error('[@action:deployments:getDeployments] Error:', error);
      return [];
    }
  },
);

/**
 * Get a specific deployment by ID
 * @param id Deployment ID
 * @returns Deployment object or null if not found
 */
export const getDeploymentById = cache(async (id: string): Promise<Deployment | null> => {
  try {
    // Make sure we have an actual ID
    if (!id) {
      console.error('[@action:deployments:getDeploymentById] ID is required');
      return null;
    }

    // Get user for tenant isolation
    const user = await getUser();
    if (!user) {
      console.error('[@action:deployments:getDeploymentById] User not authenticated');
      return null;
    }

    console.log(`[@action:deployments:getDeploymentById] Fetching deployment with ID: ${id}`);

    // Get cookie store once for all operations
    const cookieStore = await cookies();

    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/db/deploymentDb');

    // Fetch the deployment from the database
    const result = await deploymentDb.getDeploymentById(id, cookieStore);

    if (!result.success || !result.data) {
      console.error(`[@action:deployments:getDeploymentById] Deployment not found: ${id}`);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error(
      `[@action:deployments:getDeploymentById] Error fetching deployment ${id}:`,
      error,
    );
    return null;
  }
});

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
    console.log('[@action:deployments:createDeployment] Starting deployment creation process');

    // Ensure we have a valid user
    const user = await getUser();
    if (!user || !user.tenant_id) {
      console.error('[@action:deployments:createDeployment] No authenticated user found');
      return { success: false, error: 'User not authenticated' };
    }

    // Get cookie store once for all operations
    const cookieStore = await cookies();

    // Get the active team ID
    const selectedTeamCookie = cookieStore.get(`selected_team_${user.id}`)?.value;
    const teamId = selectedTeamCookie || user.teams?.[0]?.id;

    if (!teamId) {
      console.error(
        '[@action:deployments:createDeployment] No team available for deployment creation',
      );
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

    // Import dependencies
    const { default: deploymentDb } = await import('@/lib/db/deploymentDb');
    const { default: cicdDb } = await import('@/lib/db/cicdDb');

    // Get CICD provider if specified
    let providerResult = null;
    if (formData.provider_id) {
      providerResult = await cicdDb.getCICDProvider(
        { where: { id: formData.provider_id } },
        cookieStore,
      );
    }

    // Create deployment data
    const deploymentData = {
      name: formData.name,
      description: formData.description || '',
      repository_id: formData.repository,
      scripts_path: formData.selectedScripts || [],
      scripts_parameters: rawParameters,
      host_ids: formData.selectedHosts || [],
      status:
        !providerResult || !providerResult.success ? 'failed' : ('pending' as DeploymentStatus),
      team_id: teamId,
      creator_id: user.id,
      user_id: user.id,
      tenant_id: user.tenant_id,
      schedule_type: formData.schedule || 'now',
      scheduled_time: formData.scheduledTime || null,
      cron_expression: formData.cronExpression || null,
      repeat_count: formData.repeatCount || 0,
      environment_vars: formData.environmentVars || [],
    };

    console.log(
      '[@action:deployments:createDeployment] Creating deployment with data:',
      JSON.stringify(deploymentData, null, 2),
    );

    // Create the deployment
    const result = await deploymentDb.createDeployment(deploymentData, cookieStore);

    if (!result.success || !result.data) {
      console.error(
        '[@action:deployments:createDeployment] Failed to create deployment:',
        result.error,
      );
      return { success: false, error: result.error || 'Failed to create deployment' };
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');

    console.log(
      '[@action:deployments:createDeployment] Successfully created deployment:',
      result.data.id,
    );
    return {
      success: true,
      deploymentId: result.data.id,
    };
  } catch (error: any) {
    console.error('[@action:deployments:createDeployment] Error creating deployment:', error);
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
    console.log(`[@action:deployments:updateDeployment] Updating deployment with ID: ${id}`);

    // Get cookie store
    const cookieStore = await cookies();

    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/db/deploymentDb');

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
    const result = await deploymentDb.updateDeployment(id, dbData, cookieStore);

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');

    if (!result.success || !result.data) {
      console.error(
        `[@action:deployments:updateDeployment] Update failed: ${result.error || 'Unknown error'}`,
      );
      return null;
    }

    return result.data;
  } catch (error) {
    console.error(
      `[@action:deployments:updateDeployment] Error updating deployment with ID ${id}:`,
      error,
    );
    return null;
  }
}

/**
 * Delete a deployment by ID
 * @param id Deployment ID
 * @returns True if deleted successfully, false otherwise
 */
export async function deleteDeployment(id: string): Promise<boolean> {
  try {
    console.log(`[@action:deployments:deleteDeployment] Deleting deployment with ID: ${id}`);

    if (!id) {
      console.error('[@action:deployments:deleteDeployment] Deployment ID is required');
      return false;
    }

    // Get the user for tenant information and proper cache invalidation
    const user = await getUser();
    if (!user) {
      console.error('[@action:deployments:deleteDeployment] User not authenticated');
      return false;
    }

    // Get cookie store
    const cookieStore = await cookies();

    // Import the required database modules
    const { default: deploymentDb } = await import('@/lib/db/deploymentDb');

    // Delete the deployment
    const result = await deploymentDb.deleteDeployment(id, cookieStore);

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');

    if (!result.success) {
      console.error(
        `[@action:deployments:deleteDeployment] Failed to delete deployment: ${result.error || 'Unknown error'}`,
      );
      return false;
    }

    console.log(`[@action:deployments:deleteDeployment] Successfully deleted deployment: ${id}`);
    return true;
  } catch (error) {
    console.error(`[@action:deployments:deleteDeployment] Error deleting deployment ${id}:`, error);
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
    console.log(`[@action:deployments:abortDeployment] Aborting deployment with ID: ${id}`);

    // Get cookie store
    const cookieStore = await cookies();

    // Import the deployment database module
    const { default: deploymentDb } = await import('@/lib/db/deploymentDb');

    // Update the deployment status to aborted
    const updateData = {
      status: 'aborted' as DeploymentStatus,
      completed_at: new Date().toISOString(),
    };

    // Update the deployment in the database
    const result = await deploymentDb.updateDeployment(id, updateData, cookieStore);

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');

    if (!result.success) {
      const errorMessage = result.error || 'Failed to abort deployment';
      console.error(`[@action:deployments:abortDeployment] Error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }

    console.log(`[@action:deployments:abortDeployment] Successfully aborted deployment: ${id}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[@action:deployments:abortDeployment] Error aborting deployment ${id}:`, error);
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
    console.log(`[@action:deployments:refreshDeployment] Refreshing deployment with ID: ${id}`);

    // Fetch updated deployment
    const deployment = await getDeploymentById(id);

    if (!deployment) {
      console.error(`[@action:deployments:refreshDeployment] Deployment not found: ${id}`);
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
    console.error(
      `[@action:deployments:refreshDeployment] Error refreshing deployment ${id}:`,
      error,
    );
    return {
      success: false,
      error: error.message || 'Failed to refresh deployment',
    };
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
    console.log(`[@action:deployments:runDeployment] Starting deployment with ID: ${deploymentId}`);

    // Get current user
    const user = await getUser();
    if (!user) {
      console.error('[@action:deployments:runDeployment] User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    // Get cookie store
    const cookieStore = await cookies();

    // Import dependencies
    const { default: deploymentDb } = await import('@/lib/db/deploymentDb');

    // Update deployment status to running
    const updateResult = await deploymentDb.updateDeployment(
      deploymentId,
      {
        status: 'running',
        started_at: new Date().toISOString(),
      },
      cookieStore,
    );

    if (!updateResult.success) {
      console.error(
        `[@action:deployments:runDeployment] Failed to update status: ${updateResult.error || 'Unknown error'}`,
      );
      return { success: false, error: updateResult.error || 'Failed to update deployment status' };
    }

    // Create a run record if needed using the deployment service
    const runDeploymentResult = await deploymentDb.runDeployment(
      deploymentId,
      user.id,
      cookieStore,
    );

    if (!runDeploymentResult.success) {
      console.error(
        `[@action:deployments:runDeployment] Failed to run deployment: ${runDeploymentResult.error || 'Unknown error'}`,
      );
      return { success: false, error: runDeploymentResult.error || 'Failed to run deployment' };
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');

    console.log(
      `[@action:deployments:runDeployment] Successfully started deployment: ${deploymentId}`,
    );
    return { success: true };
  } catch (error: any) {
    console.error('[@action:deployments:runDeployment] Error running deployment:', error);
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

    console.log('[@action:deployments:clearDeploymentCache] Cache cleared via path revalidation');
    return {
      success: true,
      message: 'Cache cleared via path revalidation',
    };
  } catch (error: any) {
    console.error('[@action:deployments:clearDeploymentCache] Error clearing cache:', error);
    return {
      success: false,
      message: error.message || 'Unknown error occurred',
    };
  }
}
