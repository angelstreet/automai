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
        cicdProviderId: formData.cicdProviderId,
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

    // Find the CICD provider ID (try different possible property names)
    const cicdProviderId = formData.cicdProviderId;

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
        const providerConfig = providerResult.data;
        console.log('[@action:deploymentWizard:saveDeploymentConfiguration] Provider config:', {
          id: providerConfig.id,
          name: providerConfig.name,
          type: providerConfig.type,
          url: providerConfig.url,
          port: providerConfig.port,
          auth_type: providerConfig.auth_type,
          hasCredentials: !!providerConfig.credentials || !!providerConfig.config?.credentials,
        });

        // Ensure auth_type is set (fix for "Unsupported authentication type: undefined")
        if (!providerConfig.auth_type && providerConfig.config?.auth_type) {
          providerConfig.auth_type = providerConfig.config.auth_type;
          console.log(
            `[@action:deploymentWizard:saveDeploymentConfiguration] Using auth_type from config: ${providerConfig.auth_type}`,
          );
        }

        // Fall back to token authentication if auth_type is still undefined
        if (!providerConfig.auth_type) {
          providerConfig.auth_type = 'token';
          console.log(
            `[@action:deploymentWizard:saveDeploymentConfiguration] Using fallback auth_type: token`,
          );
        }

        // Ensure credentials are set
        if (!providerConfig.credentials && providerConfig.config?.credentials) {
          providerConfig.credentials = providerConfig.config.credentials;
          console.log(
            '[@action:deploymentWizard:saveDeploymentConfiguration] Using credentials from config',
          );
        }

        // Create a provider instance
        try {
          const provider = CICDProviderFactory.createProvider(providerConfig);

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
                type: 'text',
                description: 'Deployment name',
                defaultValue: formData.name,
              },
            ],
          };

          console.log(
            `[@action:deploymentWizard:saveDeploymentConfiguration] Calling Jenkins createJob API for ${jobName}`,
          );

          // Create the job in Jenkins
          const jobResult = await provider.createJob(jobName, pipelineConfig);

          if (!jobResult.success) {
            console.error(
              `[@action:deploymentWizard:saveDeploymentConfiguration] Failed to create Jenkins job: ${jobResult.error}`,
            );
            return { success: false, error: `Failed to create CICD job: ${jobResult.error}` };
          }

          console.log(
            `[@action:deploymentWizard:saveDeploymentConfiguration] Jenkins job created: ${jobResult.data}`,
          );

          // Save the job to the database
          const cicdJobData = {
            name: jobName,
            description: formData.description || '',
            provider_id: cicdProviderId,
            external_id: jobResult.data,
            parameters: pipelineConfig,
            team_id: user.teams?.[0]?.id,
            creator_id: user.id,
          };

          console.log(
            `[@action:deploymentWizard:saveDeploymentConfiguration] Saving CICD job to database`,
          );

          const dbJobResult = await createCICDJob({ data: cicdJobData }, cookieStore);

          if (!dbJobResult.success) {
            console.error(
              `[@action:deploymentWizard:saveDeploymentConfiguration] Failed to save CICD job to database: ${dbJobResult.error}`,
            );
            return { success: false, error: `Failed to save CICD job: ${dbJobResult.error}` };
          }

          cicdJobId = dbJobResult.data.id;
          console.log(
            `[@action:deploymentWizard:saveDeploymentConfiguration] CICD job saved with ID: ${cicdJobId}`,
          );
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
      } catch (error: any) {
        console.error(
          `[@action:deploymentWizard:saveDeploymentConfiguration] Error creating CICD job:`,
          error,
        );
        return { success: false, error: `Error creating CICD job: ${error.message}` };
      }
    }

    // Step 2: Create the deployment
    console.log(
      `[@action:deploymentWizard:saveDeploymentConfiguration] Creating deployment record`,
    );

    // Get the active team ID
    const selectedTeamCookie = cookieStore.get(`selected_team_${user.id}`)?.value;
    const teamId = selectedTeamCookie || user.teams?.[0]?.id;

    // Extract data from configuration if available
    const scriptIds = formData.configuration?.scriptIds || [];
    const hostIds = formData.configuration?.hostIds || [];
    const scriptParameters = formData.configuration?.parameters || {};

    // Prepare deployment data (removing fields that don't exist in the table)
    const deploymentData = {
      name: formData.name,
      description: formData.description || '',
      repository_id: formData.repositoryId,
      scripts_path: scriptIds, // Use the array of script IDs/paths
      scripts_parameters: scriptParameters, // Use script parameters
      host_ids: hostIds, // Use host IDs
      status: 'pending',
      scheduled_time: formData.scheduledTime || null, // Use the scheduledTime (timestamp) field
      schedule_type: formData.configuration?.schedule || formData.schedule || 'now',
      tenant_id: user.tenant_id,
      user_id: user.id,
      team_id: teamId,
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
        started_at: new Date().toISOString(),
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
