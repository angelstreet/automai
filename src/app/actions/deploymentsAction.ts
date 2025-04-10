'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { getUserActiveTeam } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import {
  getDeployments as dbGetDeployments,
  getDeploymentById as dbGetDeploymentById,
  createDeployment as dbCreateDeployment,
  updateDeployment as dbUpdateDeployment,
  deleteDeployment as dbDeleteDeployment,
} from '@/lib/db/deploymentDb';
import { Deployment, DeploymentFormData } from '@/types/component/deploymentComponentType';
import { AuthUser, User } from '@/types/service/userServiceType';
/**
 * Get all deployments for the current user
 */
export const getDeployments = cache(
  async (
    user?: AuthUser | User | null,
  ): Promise<{ success: boolean; data?: Deployment[]; error?: string }> => {
    try {
      // Get current user if not provided
      if (!user) {
        user = await getUser();
      }

      if (!user) {
        console.error('[@action:deployments:getDeployments] User not authenticated');
        return { success: false, error: 'User not authenticated', data: [] };
      }

      // Get the user's active team ID
      const activeTeamResult = await getUserActiveTeam(user.id);
      if (!activeTeamResult || !activeTeamResult.id) {
        console.error('[@action:deployments:getDeployments] No active team found for user');
        return { success: false, error: 'No active team found', data: [] };
      }

      const teamId = activeTeamResult.id;
      console.log(`[@action:deployments:getDeployments] Fetching deployments for team: ${teamId}`);

      // Get cookie store once for all operations
      const cookieStore = await cookies();

      // Fetch deployments from the database
      const result = await dbGetDeployments(teamId, cookieStore);

      if (!result.success) {
        console.error(
          '[@action:deployments:getDeployments] Error fetching deployments:',
          result.error,
        );
        return { success: false, error: result.error, data: [] };
      }

      console.log(
        '[@action:deployments:getDeployments] Fetched deployments count:',
        result.data?.length || 0,
      );
      return { success: true, data: result.data || [] };
    } catch (error: any) {
      console.error('[@action:deployments:getDeployments] Error:', error);
      return { success: false, error: error.message, data: [] };
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

    // Fetch the deployment from the database
    const result = await dbGetDeploymentById(id, cookieStore);

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
      formData.selectedScripts?.map((scriptPath, _index) => {
        const scriptParam = formData.parameters?.find((p) => p.script_path === scriptPath);
        return scriptParam?.raw || '';
      }) || [];

    // Create deployment data
    const deploymentData: Partial<Deployment> = {
      name: formData.name,
      description: formData.description || '',
      repositoryId: formData.repository,
      scriptsPath: formData.selectedScripts || [],
      scriptsParameters: rawParameters,
      hostIds: formData.selectedHosts || [],
      status: 'pending',
      userId: user.id,
      tenantId: user.tenant_id,
      scheduleType: formData.schedule || 'now',
      scheduledTime: formData.scheduledTime || undefined,
      cronExpression: formData.cronExpression || undefined,
      repeatCount: formData.repeatCount || 0,
      environmentVars: formData.environmentVars || [],
    };

    console.log(
      '[@action:deployments:createDeployment] Creating deployment with data:',
      JSON.stringify(deploymentData, null, 2),
    );

    // Create the deployment
    const result = await dbCreateDeployment(deploymentData, cookieStore);

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

    // Map the form data to database format
    const dbData = {
      name: data.name,
      description: data.description,
      repository_id: data.repository,
      scripts_path: data.selectedScripts,
      scripts_parameters: data.parameters,
      host_ids: data.selectedHosts,
      schedule_type: data.schedule,
      scheduled_time: data.scheduledTime,
      cron_expression: data.cronExpression,
      repeat_count: data.repeatCount,
      environment_vars: data.environmentVars,
    };

    // Update the deployment in the database
    const result = await dbUpdateDeployment(id, dbData, cookieStore);

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

    // Get deployment details
    const deploymentResult = await dbGetDeploymentById(id, cookieStore);
    if (!deploymentResult.success || !deploymentResult.data) {
      console.error('[@action:deployments:deleteDeployment] Deployment not found');
      return false;
    }

    // Delete the deployment from the database
    const deleteResult = await dbDeleteDeployment(id, cookieStore);
    if (!deleteResult.success) {
      console.error(
        '[@action:deployments:deleteDeployment] Failed to delete deployment:',
        deleteResult.error,
      );
      return false;
    }

    // Revalidate the deployments page
    revalidatePath('/deployments');

    console.log('[@action:deployments:deleteDeployment] Deployment deleted successfully');
    return true;
  } catch (error) {
    console.error('[@action:deployments:deleteDeployment] Error deleting deployment:', error);
    return false;
  }
}
