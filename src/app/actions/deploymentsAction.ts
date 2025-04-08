'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { getUserActiveTeam } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import cicdDb from '@/lib/db/cicdDb';
import {
  getDeployments as dbGetDeployments,
  getDeploymentById as dbGetDeploymentById,
  createDeployment as dbCreateDeployment,
  updateDeployment as dbUpdateDeployment,
  deleteDeployment as dbDeleteDeployment,
} from '@/lib/db/deploymentDb';
import { generateTriggerToken } from '@/lib/services/cicd/jenkinsPipeline';
import { CICDService } from '@/lib/services/cicd/service';
import {
  Deployment,
  DeploymentFormData,
  DeploymentStatus,
  DeploymentData,
} from '@/types/component/deploymentComponentType';
import { CICDProviderConfig } from '@/types/service/cicdServiceTypes';
import { AuthUser, User } from '@/types/service/userServiceType';

// Initialize CICD service
const cicdService = new CICDService();

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

    // Import dependencies
    const { getCICDProvider } = await import('@/lib/db/cicdDb');

    // Get CICD provider if specified
    let providerResult = null;
    if (formData.provider_id) {
      providerResult = await getCICDProvider({ where: { id: formData.provider_id } }, cookieStore);
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

    // Extract just the CICD provider ID from the deployment data
    const deployment = deploymentResult.data as { cicd_provider_id?: string };

    // If deployment has a CICD provider, try to delete the Jenkins job
    if (deployment.cicd_provider_id) {
      // Get CICD job mapping
      const cicdJob = await cicdDb.getCICDJobForDeployment(id, cookieStore);

      if (cicdJob) {
        // Delete the Jenkins job first
        const deleteResult = await cicdService.deleteProviderJob(
          deployment.cicd_provider_id,
          cicdJob.cicd_job_id,
          cookieStore,
        );

        if (!deleteResult.success) {
          console.error(
            '[@action:deployments:deleteDeployment] Failed to delete Jenkins job:',
            deleteResult.error,
          );
          // We continue with deployment deletion even if Jenkins job deletion fails
          // This is because the database cascade will clean up the mappings
        }
      }
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

/**
 * Run a deployment
 * @param deploymentId The ID of the deployment to run
 */
export async function runDeployment(
  deploymentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[@action:deployments:runDeployment] Starting deployment with ID: ${deploymentId}`);

    // Get cookie store
    const cookieStore = await cookies();

    // Get current user for tenant information
    const user = await getUser();
    if (!user) {
      console.error('[@action:deployments:runDeployment] User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    console.log(
      `[@action:deployments:runDeployment] Using tenant: ${user.tenant_name || 'unknown'}, user ID: ${user.id}`,
    );

    // Get deployment details
    const deploymentResult = await dbGetDeploymentById(deploymentId, cookieStore);
    if (!deploymentResult.success || !deploymentResult.data) {
      console.error('[@action:deployments:runDeployment] Deployment not found');
      return { success: false, error: 'Deployment not found' };
    }

    // Cast to DeploymentData to access additional properties
    const deployment = deploymentResult.data as unknown as DeploymentData;

    // Check if deployment has a CICD provider
    if (deployment.cicd_provider_id) {
      // Get the CICD job mapping
      const mappingResult = await cicdDb.getCICDDeploymentMapping(
        { where: { deployment_id: deploymentId } },
        cookieStore,
      );

      console.log(
        `[@action:deployments:runDeployment] CICD mapping result:`,
        JSON.stringify(mappingResult, null, 2),
      );

      // Get the internal job ID from the mapping
      const internalJobId = mappingResult.data?.cicd_job_id;

      // Now get the external job ID (actual Jenkins job name) from the CICD jobs table
      const jobResult = await cicdDb.getCICDJob({ where: { id: internalJobId } }, cookieStore);

      if (!jobResult.success || !jobResult.data) {
        console.error('[@action:deployments:runDeployment] Failed to get CICD job details');
        return { success: false, error: 'Failed to get CICD job details' };
      }

      console.log(`[@action:deployments:runDeployment] CICD job details:`, {
        id: jobResult.data.id,
        name: jobResult.data.name,
        external_id: jobResult.data.external_id,
      });

      // Use the external_id which is the actual Jenkins job name
      const jobId = jobResult.data.external_id;

      // Get provider details with credentials
      const { getCICDProvider } = await import('@/lib/db/cicdDb');

      const providerResult = await getCICDProvider(
        { where: { id: deployment.cicd_provider_id } },
        cookieStore,
      );

      if (!providerResult.success || !providerResult.data) {
        console.error('[@action:deployments:runDeployment] Failed to get CICD provider details');
        return { success: false, error: 'Failed to get CICD provider details' };
      }

      // Get provider configuration
      let providerConfig = providerResult.data as unknown as CICDProviderConfig;

      // Ensure port and credentials are included properly for Jenkins providers
      if (providerConfig.type.toLowerCase() === 'jenkins') {
        // Check if provider has a port configuration
        const port =
          (providerResult.data as any).port || (providerResult.data as any).config?.port || 8080; // Default to 8080 for Jenkins

        console.log(`[@action:deployments:runDeployment] Found port ${port} for Jenkins provider`);

        // Extract credentials from provider
        const username =
          (providerResult.data as any).username ||
          (providerResult.data as any).config?.credentials?.username ||
          (providerResult.data as any).credentials?.username ||
          'joachim_djibril'; // Default username from logs

        const token =
          (providerResult.data as any).token ||
          (providerResult.data as any).config?.credentials?.token ||
          (providerResult.data as any).credentials?.token ||
          ''; // Token from provider

        // Make sure providerConfig has all the necessary properties
        providerConfig = {
          ...providerConfig,
          port: port,
          auth_type: 'token', // Ensure auth_type is set
          credentials: {
            ...(providerConfig.credentials || {}),
            username: username,
            token: token,
          },
        };

        console.log(`[@action:deployments:runDeployment] Extracted credentials:`, {
          username: username,
          hasToken: !!token,
        });
      }

      console.log(`[@action:deployments:runDeployment] Provider config:`, {
        id: providerConfig.id,
        name: providerConfig.name,
        type: providerConfig.type,
        url: providerConfig.url,
        auth_type: providerConfig.auth_type,
        hasCredentials: !!providerConfig.credentials,
        hasUsername: !!providerConfig.credentials?.username,
        hasToken: !!providerConfig.credentials?.token,
        port: (providerConfig as any).port,
      });

      // Extract deployment parameters from the deployment
      const deploymentParameters = deployment.scriptParameters || {};

      // Trigger the CICD job
      console.log(`[@action:deployments:runDeployment] Triggering job: ${jobId}`);

      // Build full URL with port for logging (just for display purposes)
      const port = (providerConfig as any).port;
      const baseUrl = providerConfig.url;
      const displayUrl =
        port && !baseUrl.includes(':' + port)
          ? `${baseUrl}:${port}/job/${jobId}/build`
          : `${baseUrl}/job/${jobId}/build`;

      // Create a provider instance directly to have more control over the request
      const { CICDProviderFactory } = await import('@/lib/services/cicd/providerFactory');

      console.log(
        `[@action:deployments:runDeployment] Full Jenkins URL that will be called: ${displayUrl}`,
      );

      // Log the exact config we're sending to the provider factory
      console.log('[@action:deployments:runDeployment] Creating provider with config:', {
        ...providerConfig,
        credentials: {
          username: providerConfig.credentials?.username,
          hasToken: !!providerConfig.credentials?.token,
        },
      });

      try {
        // Create a provider instance directly
        const provider = CICDProviderFactory.createProvider(providerConfig);

        // Get tenant name from user data for Jenkins folder path
        const tenantName = user.tenant_name || 'trial';

        // Get username from provider credentials
        const jenkinsUsername = providerConfig.credentials?.username;

        // Create the Jenkins folder path, ensuring we have both parts
        const jenkinsFolder = jenkinsUsername ? `${tenantName}/${jenkinsUsername}` : tenantName;

        console.log(
          `[@action:deployments:runDeployment] Using tenant name: ${tenantName}, username: ${jenkinsUsername || 'not found'}`,
        );
        console.log(
          `[@action:deployments:runDeployment] Final Jenkins folder path: ${jenkinsFolder}`,
        );

        console.log(
          `[@action:deployments:runDeployment] Using Jenkins folder path: ${jenkinsFolder}`,
        );

        // Trigger the job directly using the provider with folder path
        const triggerResult = await provider.triggerJob(jobId, deploymentParameters, jenkinsFolder);

        if (!triggerResult.success) {
          console.error(
            '[@action:deployments:runDeployment] Failed to trigger CICD job:',
            triggerResult.error,
          );

          // Check for common error types and provide more helpful messages
          const errorMessage = triggerResult.error || 'Unknown error';
          if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
            console.error('[@action:deployments:runDeployment] 403 Forbidden error detected');
            return {
              success: false,
              error: `Authentication failed (403 Forbidden). Check Jenkins credentials and make sure the user has permission to trigger jobs.`,
            };
          } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            console.error('[@action:deployments:runDeployment] 401 Unauthorized error detected');
            return {
              success: false,
              error: `Authentication failed (401 Unauthorized). Invalid username or token/password.`,
            };
          }

          return { success: false, error: `Failed to trigger CICD job: ${triggerResult.error}` };
        }
      } catch (error: any) {
        console.error('[@action:deployments:runDeployment] Exception when triggering job:', error);
        return {
          success: false,
          error: `Error triggering Jenkins job: ${error.message}`,
        };
      }
    }

    // Update deployment status to running
    const updateData: Partial<Deployment> = {
      status: 'running' as DeploymentStatus,
      startedAt: new Date().toISOString(),
    };

    // Update the deployment in the database
    const updateResult = await dbUpdateDeployment(deploymentId, updateData, cookieStore);

    if (!updateResult.success) {
      console.error(
        `[@action:deployments:runDeployment] Failed to update status: ${updateResult.error || 'Unknown error'}`,
      );
      return { success: false, error: updateResult.error || 'Failed to update deployment status' };
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
 * Get remote trigger token for a deployment
 * @param deploymentId The ID of the deployment to get token for
 * @param deploymentName The name of the deployment (required if deployment not found)
 */
export async function getDeploymentTriggerToken(
  deploymentId: string,
  deploymentName?: string,
): Promise<{
  success: boolean;
  token?: string;
  triggerUrl?: string;
  error?: string;
}> {
  try {
    console.log(
      `[@action:deployments:getDeploymentTriggerToken] Getting token for deployment: ${deploymentId}`,
    );

    // Get cookie store
    const cookieStore = await cookies();

    let name = deploymentName;

    // If no name provided, try to get deployment details
    if (!name) {
      const deploymentResult = await dbGetDeploymentById(deploymentId, cookieStore);
      if (!deploymentResult.success || !deploymentResult.data) {
        return {
          success: false,
          error: 'Deployment not found and no name provided',
        };
      }
      name = deploymentResult.data.name;
    }

    // Use the PipelineGenerator utility to create a consistent token
    const token = generateTriggerToken(name);

    // Get CICD job mapping to construct the trigger URL
    const cicdJob = await cicdDb.getCICDJobForDeployment(deploymentId, cookieStore);

    // Construct a basic trigger URL pattern (this is a template, actual URL depends on provider config)
    let triggerUrl = '';

    if (cicdJob) {
      // Extract provider information
      const deployment = (await dbGetDeploymentById(deploymentId, cookieStore)) as unknown as {
        data?: { cicd_provider_id?: string };
      };
      if (deployment?.data?.cicd_provider_id) {
        const providerResult = await cicdDb.getCICDProvider(
          { where: { id: deployment.data.cicd_provider_id } },
          cookieStore,
        );

        if (providerResult.success && providerResult.data) {
          const baseUrl = providerResult.data.url;
          const port = (providerResult.data as any).port || '';

          // Include port if specified and not already in URL
          const baseUrlWithPort =
            port && !baseUrl.includes(':' + port) ? `${baseUrl}:${port}` : baseUrl;

          // Get user information from the system
          const user = await getUser();

          // Extract tenant name from user data
          const tenantName = user?.tenant_name || '';

          // Extract username from provider credentials
          const jenkinsUsername =
            providerResult.data?.credentials?.username ||
            (providerResult.data as any)?.config?.credentials?.username ||
            '';

          // Build the trigger URL with the correct folder structure
          // Format: http://server:port/job/tenantName/job/username/job/jobName/build?token=token
          triggerUrl = `${baseUrlWithPort}/job/${tenantName}/job/${jenkinsUsername}/job/${cicdJob.cicd_job_id}/build?token=${token}`;

          console.log(
            `[@action:deployments:getDeploymentTriggerToken] Generated trigger URL: ${triggerUrl}`,
          );
        }
      }
    }

    return {
      success: true,
      token,
      triggerUrl,
    };
  } catch (error: any) {
    console.error('[@action:deployments:getDeploymentTriggerToken] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate trigger token',
    };
  }
}