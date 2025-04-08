'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { cache } from 'react';

import type { DeploymentFormData } from '@/app/[locale]/[tenant]/deployment/types';
import { getCICDProviders } from '@/app/actions/cicdAction';
import { getHosts } from '@/app/actions/hostsAction';
import { getRepositories } from '@/app/actions/repositoriesAction';
import { getUser } from '@/app/actions/userAction';
import { createDeployment as dbCreateDeployment } from '@/lib/db/deploymentDb';

/**
 * Fetches all data needed for the deployment wizard
 */
export const getDeploymentWizardData = cache(async () => {
  try {
    // Fetch all required data in parallel
    const [repositoriesResult, hostsResult, cicdProvidersResult] = await Promise.all([
      getRepositories(),
      getHosts(),
      getCICDProviders(),
    ]);

    return {
      success: true,
      repositories: repositoriesResult.success ? repositoriesResult.data || [] : [],
      hosts: hostsResult.success ? hostsResult.data || [] : [],
      cicdProviders: cicdProvidersResult.success ? cicdProvidersResult.data || [] : [],
    };
  } catch (error: any) {
    console.error('Error fetching deployment wizard data:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch deployment data',
      repositories: [],
      hosts: [],
      cicdProviders: [],
    };
  }
});

/**
 * Saves a deployment configuration
 */
export async function saveDeploymentConfiguration(formData: DeploymentFormData) {
  try {
    // Detailed debug of the FULL formData object
    console.log(
      '[@action:deploymentWizard:saveDeploymentConfiguration] FULL formData structure:',
      JSON.stringify(formData, null, 2),
    );

    console.log(
      '[@action:deploymentWizard:saveDeploymentConfiguration] Starting process with form data:',
      {
        name: formData.name,
        repositoryId: formData.repositoryId,
        cicdProviderId: formData.cicd_provider_id || formData.cicdProviderId,
      },
    );

    // Validate required fields
    if (!formData.name || !formData.repositoryId) {
      console.error(
        '[@action:deploymentWizard:saveDeploymentConfiguration] Missing required fields',
      );
      return {
        success: false,
        error: 'Missing required fields',
      };
    }

    // Get the cookieStore
    const cookieStore = await cookies();

    // Get current user
    const user = await getUser();
    if (!user) {
      console.error(
        '[@action:deploymentWizard:saveDeploymentConfiguration] User not authenticated',
      );
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Import needed database functions
    const { getCICDProvider, createCICDJob, createDeploymentCICDMapping } = await import(
      '@/lib/db/cicdDb'
    );
    const { PipelineGenerator } = await import('@/lib/services/cicd/pipelineGenerator');
    const { CICDProviderFactory } = await import('@/lib/services/cicd/providerFactory');

    let cicdJobId = null;

    // Find the CICD provider ID (try all possible property names)
    const cicdProviderId =
      formData.cicd_provider_id || formData.cicdProviderId || formData.provider_id;
      
    // Get the active team ID (moved up from below since we need it for CICD job creation)
    const selectedTeamCookie = cookieStore.get(`selected_team_${user.id}`)?.value;
    const teamId = selectedTeamCookie || user.teams?.[0]?.id;

    // Step 1: Create CICD job if a provider is selected
    if (cicdProviderId) {
      console.log(
        `[@action:deploymentWizard:saveDeploymentConfiguration] Creating CICD job with provider: ${cicdProviderId}`,
      );

      try {
        // Get provider details
        const providerResult = await getCICDProvider(
          {
            where: { id: cicdProviderId },
          },
          cookieStore,
        );

        if (!providerResult.success || !providerResult.data) {
          console.error(
            `[@action:deploymentWizard:saveDeploymentConfiguration] Provider not found: ${cicdProviderId}`,
          );
          return { success: false, error: 'CICD Provider not found' };
        }

        // Log the provider configuration for debugging
        console.log('[@action:deploymentWizard:saveDeploymentConfiguration] Provider config:', {
          id: providerResult.data.id,
          name: providerResult.data.name,
          type: providerResult.data.type,
          url: providerResult.data.url,
          port: providerResult.data.port,
          auth_type: providerResult.data.config?.auth_type,
          hasCredentials: !!providerResult.data.config?.credentials,
        });

        // Ensure config is initialized
        if (!providerResult.data.config) {
          providerResult.data.config = {
            auth_type: 'token',
            credentials: {},
          };
        }

        console.log(
          '[@action:deploymentWizard:saveDeploymentConfiguration] Creating provider with config:',
          JSON.stringify(providerResult.data, null, 2),
        );

        const provider = CICDProviderFactory.createProvider(providerResult.data);

        if (!provider) {
          console.error(
            '[@action:deploymentWizard:saveDeploymentConfiguration] Failed to create provider instance',
          );
          return { success: false, error: 'Failed to create CICD provider instance' };
        }

        // Generate a unique job name
        const jobName = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

        // Define pipeline config
        const pipelineConfig = {
          name: jobName,
          description: formData.description || '',
          repository: {
            id: formData.repositoryId,
          },
          stages: [
            {
              name: 'Checkout',
              steps: [
                {
                  type: 'shell',
                  command: 'echo "Checking out repository"',
                  script: 'checkout.sh',
                },
              ],
            },
            {
              name: 'Deploy',
              steps: [
                {
                  type: 'shell',
                  command: 'echo "Deploying to hosts"',
                  script: 'deploy.sh',
                },
              ],
            },
          ],
          parameters: [
            {
              name: 'DEPLOYMENT_NAME',
              type: 'text' as const,
              description: 'Deployment name',
              defaultValue: formData.name,
            },
          ],
        };

        console.log(
          '[@action:deploymentWizard:saveDeploymentConfiguration] Creating Jenkins job with config:',
          JSON.stringify(pipelineConfig, null, 2),
        );

        // Add timeout handling for Jenkins job creation
        try {
          // Create a promise that rejects after 15 seconds
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('TIMEOUT: Jenkins job creation took too long (15s)'));
            }, 15000);
          });

          // Create the job with timeout
          const jobResult = await Promise.race([
            provider.createJob(jobName, pipelineConfig),
            timeoutPromise,
          ]);

          if (!jobResult.success) {
            const error = jobResult.error || 'Unknown error occurred';
            console.error(
              `[@action:deploymentWizard:saveDeploymentConfiguration] Failed to create Jenkins job: ${error}`,
            );
            return { success: false, error: `Failed to create CICD job: ${error}` };
          }

          console.log(
            `[@action:deploymentWizard:saveDeploymentConfiguration] Jenkins job created: ${jobResult.data}`,
          );
        } catch (error) {
          // Check if this is a timeout error
          if (error.message && error.message.includes('TIMEOUT')) {
            console.error(
              `[@action:deploymentWizard:saveDeploymentConfiguration] Jenkins job creation timed out after 15 seconds`,
            );
            return {
              success: false,
              error:
                'Jenkins job creation timed out after 15 seconds. Please check your Jenkins server configuration or try again later.',
            };
          }

          // Handle other errors
          console.error(
            `[@action:deploymentWizard:saveDeploymentConfiguration] Error creating Jenkins job: ${error.message}`,
          );
          return {
            success: false,
            error: `Error creating CICD job: ${error.message}`,
          };
        }

        // Prepare CICD job data using existing values - keep it simple with only required fields
        const cicdJobData = {
          name: jobName,
          provider_id: providerResult.data.id,
          job_path: jobName,
          parameters: pipelineConfig, // Store pipeline config in parameters field
          status: 'pending',
          // Omit any fields not defined in the database table
        };
        
        // Log the exact data we're sending to the database for debugging
        console.log(
          `[@action:deploymentWizard:saveDeploymentConfiguration] CICD job data for database:`,
          JSON.stringify(cicdJobData, null, 2)
        );
        
        try {
          const dbJobResult = await createCICDJob({ data: cicdJobData }, cookieStore);
          
          if (!dbJobResult.success) {
            console.error(
              `[@action:deploymentWizard:saveDeploymentConfiguration] Failed to save CICD job to database: ${dbJobResult.error}`,
            );
            return { success: false, error: `Failed to save CICD job: ${dbJobResult.error}` };
          }
          
          // Job was created successfully
          cicdJobId = dbJobResult.data.id;
          console.log(
            `[@action:deploymentWizard:saveDeploymentConfiguration] CICD job saved with ID: ${cicdJobId}`,
          );
        } catch (dbError: any) {
          // Better error handling for database operations
          console.error(
            `[@action:deploymentWizard:saveDeploymentConfiguration] Exception saving CICD job to database:`,
            dbError
          );
          return { 
            success: false, 
            error: `Database error saving CICD job: ${dbError.message || 'Unknown error'}` 
          };
        }
      } catch (providerError) {
        console.error(
          `[@action:deploymentWizard:saveDeploymentConfiguration] Error creating provider:`,
          providerError,
        );
        return {
          success: false,
          error: `Error creating CICD provider: ${providerError.message}`,
        };
      }
    }

    // Step 2: Create the deployment
    console.log(
      `[@action:deploymentWizard:saveDeploymentConfiguration] Creating deployment record`,
    );

    // Extract data from configuration if available
    const scriptIds = formData.configuration?.scriptIds || [];
    const hostIds = formData.configuration?.hostIds || [];
    // Convert script parameters to an array format if it's an object
    const scriptParameters = Array.isArray(formData.configuration?.parameters)
      ? formData.configuration?.parameters
      : formData.parameters || [];

    // Prepare deployment data (removing fields that don't exist in the table)
    const deploymentData = {
      name: formData.name,
      description: formData.description || '',
      repository_id: formData.repositoryId,
      scripts_path: scriptIds, // Use the array of script IDs/paths
      scripts_parameters: scriptParameters, // Use the array of script parameters
      host_ids: hostIds, // Use host IDs
      status: 'pending',
      scheduled_time: formData.scheduledTime
        ? new Date(formData.scheduledTime).toISOString()
        : null, // Ensure proper ISO timestamp
      schedule_type: formData.configuration?.schedule || formData.schedule || 'now',
      cron_expression: formData.cronExpression || formData.configuration?.cronExpression || null,
      repeat_count: formData.repeatCount || formData.configuration?.repeatCount || null,
      tenant_id: user.tenant_id,
      user_id: user.id,
      team_id: formData.team_id || teamId, // Use form data team_id first
      creator_id: formData.creator_id || user.id, // Use form data creator_id first
      cicd_provider_id: formData.cicd_provider_id || cicdProviderId || null, // Use form data cicd_provider_id first
    };

    console.log(
      `[@action:deploymentWizard:saveDeploymentConfiguration] Deployment data: `,
      JSON.stringify(deploymentData, null, 2),
    );

    // Create the deployment
    const result = await dbCreateDeployment(deploymentData, cookieStore);

    if (!result.success) {
      console.error(
        `[@action:deploymentWizard:saveDeploymentConfiguration] Failed to create deployment: ${result.error}`,
      );
      return {
        success: false,
        error: result.error || 'Failed to create deployment',
      };
    }

    const deploymentId = result.data.id;
    console.log(
      `[@action:deploymentWizard:saveDeploymentConfiguration] Deployment created with ID: ${deploymentId}`,
    );

    // Step 3: Create mapping between deployment and CICD job if applicable
    if (cicdJobId) {
      console.log(
        `[@action:deploymentWizard:saveDeploymentConfiguration] Creating deployment-CICD mapping`,
      );

      const mappingData = {
        deployment_id: deploymentId,
        cicd_job_id: cicdJobId,
        parameters: {},
      };

      const mappingResult = await createDeploymentCICDMapping(mappingData, cookieStore);

      if (!mappingResult.success) {
        console.error(
          `[@action:deploymentWizard:saveDeploymentConfiguration] Failed to create mapping: ${mappingResult.error}`,
        );
        // We continue anyway since the deployment was created
      } else {
        console.log(
          `[@action:deploymentWizard:saveDeploymentConfiguration] Mapping created with ID: ${mappingResult.data.id}`,
        );
      }
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');
    revalidatePath('/[locale]/[tenant]/dashboard');

    console.log(
      `[@action:deploymentWizard:saveDeploymentConfiguration] Process completed successfully`,
    );
    return {
      success: true,
      data: result.data,
    };
  } catch (error: any) {
    console.error('[@action:deploymentWizard:saveDeploymentConfiguration] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to save deployment configuration',
    };
  }
}

/**
 * Starts a deployment
 */
export async function startDeployment(deploymentId: string) {
  try {
    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Get cookieStore
    const cookieStore = await cookies();

    // Import the updateDeployment function
    const { updateDeployment } = await import('@/lib/db/deploymentDb');

    // Update deployment status
    const result = await updateDeployment(
      deploymentId,
      {
        status: 'running',
        startedAt: new Date().toISOString(),
      },
      cookieStore,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to start deployment',
      };
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');
    revalidatePath(`/[locale]/[tenant]/deployment/${deploymentId}`);

    return {
      success: true,
      data: result.data,
    };
  } catch (error: any) {
    console.error('Error starting deployment:', error);
    return {
      success: false,
      error: error.message || 'Failed to start deployment',
    };
  }
}
