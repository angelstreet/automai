'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { cache } from 'react';

import type { DeploymentFormData } from '@/app/[locale]/[tenant]/deployment/types';
import { getCICDProviders } from '@/app/actions/cicdAction';
import { getHosts } from '@/app/actions/hostsAction';
import { getRepositories } from '@/app/actions/repositoriesAction';
import { getUser } from '@/app/actions/userAction';
import { createDeployment as dbCreateDeployment, updateDeployment } from '@/lib/db/deploymentDb';
import { CICDService } from '@/lib/services/cicd/service';
import { DeploymentData } from '@/types-new/deployment-types';
import { CICDProvider, CICDProviderConfig } from '@/types-new/cicd-provider';
import { CICDJob, CreateCICDJobParams } from '@/types-new/cicd-job';
import { CICDProviderFactory } from '@/lib/services/cicd/factory';
import { CICDBuildStatus as DeploymentStatus } from '@/types-new/cicd-types';
import { generateJenkinsPipeline } from '@/lib/services/cicd/jenkinsPipeline';
import { cicdDb } from '@/lib/db/cicdDb';
import { deploymentDb } from '@/lib/db/deploymentDb';
import { CICDDeploymentFormData } from '@/types-new/deployment-types';
import { DbResponse } from '@/lib/utils/commonUtils';

/**
 * Fetches all data needed for the deployment wizard
 */
export const getDeploymentWizardData = cache(async () => {
  try {
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
    const cookieStore = await cookies();
    const user = await getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { getCICDProvider, createCICDJob, createDeploymentCICDMapping } = await import(
      '@/lib/db/cicdDb'
    );

    let cicdJobId = null;
    const cicdProviderId = formData.cicd_provider_id || formData.cicdProviderId;

    if (cicdProviderId) {
      const providerResult = await getCICDProvider({ where: { id: cicdProviderId } }, cookieStore);
      if (!providerResult.success || !providerResult.data) {
        return { success: false, error: 'CICD Provider not found' };
      }

      const cicdService = new CICDService();
      const jobResult = await cicdService.createJob({
        name: formData.name,
        description: formData.description || '',
        repository: {
          url: formData.repository || '',
          branch: formData.branch || 'main',
        },
        providerId: providerResult.data.id,
      });

      if (!jobResult.success) {
        return { success: false, error: jobResult.error };
      }

      cicdJobId = jobResult.data.id;
    }

    const deploymentData = {
      name: formData.name,
      description: formData.description || '',
      repository_id: formData.repositoryId,
      scripts_path: formData.configuration?.scriptIds || [],
      scripts_parameters: formData.configuration?.parameters || [],
      host_ids: formData.configuration?.hostIds || [],
      status: DeploymentStatus.PENDING,
      scheduled_time: formData.scheduledTime
        ? new Date(formData.scheduledTime).toISOString()
        : null,
      schedule_type: formData.configuration?.schedule || formData.schedule || 'now',
      cron_expression: formData.cronExpression || null,
      repeat_count: formData.repeatCount || null,
      tenant_id: user.tenant_id,
      user_id: user.id,
      team_id: user.teams?.[0]?.id, // Use first team if not specified
      creator_id: user.id,
      cicd_provider_id: cicdProviderId || null,
    };

    const result = await dbCreateDeployment(deploymentData, cookieStore);

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to create deployment' };
    }

    if (cicdJobId) {
      await createDeploymentCICDMapping(
        {
          deployment_id: result.data.id,
          cicd_job_id: cicdJobId,
          parameters: {},
        },
        cookieStore,
      );
    }

    revalidatePath('/[locale]/[tenant]/deployment', 'page');

    return {
      success: true,
      data: result.data,
    };
  } catch (error: any) {
    console.error('Error saving deployment configuration:', error);
    return {
      success: false,
      error: error.message || 'Failed to save deployment configuration',
    };
  }
}

/**
 * Starts a deployment
 */
export async function startDeployment(deploymentData: DeploymentData) {
  try {
    const { deployment, repository, host, script, config } = deploymentData;

    // Get provider from factory
    const provider = CICDProviderFactory.createProvider({
      type: 'jenkins', // TODO: Make this dynamic based on configuration
      baseUrl: process.env.JENKINS_URL || '',
      username: process.env.JENKINS_USER || '',
      token: process.env.JENKINS_TOKEN || '',
    } as CICDProviderConfig);

    if (!provider) {
      throw new Error('Failed to create CICD provider');
    }

    // Create CICD job
    const jobParams: CreateCICDJobParams = {
      name: deployment.name,
      description: deployment.description || '',
      provider_id: provider.id,
      repository: {
        url: repository.url,
        branch: repository.default_branch,
      },
      hosts: [
        {
          name: host.name,
          ip: host.ip,
          username: host.username,
          environment: host.environment,
        },
      ],
      scripts: [
        {
          path: script.path,
          type: script.type || 'shell',
          parameters: script.parameters,
        },
      ],
      timeout_seconds: config?.timeout_seconds || 3600,
      retry_count: config?.retry_count || 0,
      environment_variables: config?.environment_variables || {},
    };

    const job = await provider.createJob(jobParams);

    // Update deployment status
    await updateDeployment(deployment.id, {
      status: DeploymentStatus.RUNNING,
      startedAt: new Date().toISOString(),
    });

    return job;
  } catch (error) {
    console.error('Failed to start deployment:', error);
    await updateDeployment(deployment.id, {
      status: DeploymentStatus.FAILED,
      endedAt: new Date().toISOString(),
    });
    throw error;
  }
}

export async function createDeploymentWithCICD(
  data: CICDDeploymentFormData,
  cookieStore: any,
): Promise<DbResponse<any>> {
  try {
    console.log('[@action:deployment:createWithCICD] Creating deployment with CICD job');

    // 1. Create Jenkins Job First
    const cicdService = new CICDService();
    cicdService.initialize(data.provider);

    const jenkinsJobResult = await cicdService.createJob(data.name, {
      name: data.name,
      description: data.description,
      pipeline: generateJenkinsPipeline({
        name: data.name,
        repository: data.repository,
        scripts: data.configuration.scriptMapping,
        hosts: data.configuration.hostIds,
      }),
    });

    if (!jenkinsJobResult.success) {
      throw new Error(`Failed to create Jenkins job: ${jenkinsJobResult.error}`);
    }

    // 2. Store Jenkins Job in DB
    const cicdJob = await cicdDb.createCICDJob(
      {
        data: {
          provider_id: data.cicd_provider_id,
          external_id: jenkinsJobResult.data.id,
          job_url: jenkinsJobResult.data.url,
          name: data.name,
          parameters: data.configuration.parameters,
        },
      },
      cookieStore,
    );

    if (!cicdJob.success) {
      throw new Error(`Failed to store CICD job: ${cicdJob.error}`);
    }

    // 3. Create Deployment
    const deployment = await deploymentDb.createDeployment(
      {
        name: data.name,
        description: data.description,
        repository_id: data.repository_id,
        team_id: data.team_id,
        creator_id: data.creator_id,
      },
      cookieStore,
    );

    if (!deployment.success) {
      throw new Error(`Failed to create deployment: ${deployment.error}`);
    }

    // 4. Create Mapping
    const mapping = await cicdDb.createDeploymentCICDMapping(
      {
        deployment_id: deployment.data.id,
        cicd_job_id: cicdJob.data.id,
        parameters: data.configuration,
      },
      cookieStore,
    );

    if (!mapping.success) {
      throw new Error(`Failed to create deployment-CICD mapping: ${mapping.error}`);
    }

    // 5. Auto-start if needed
    if (data.autoStart) {
      await cicdService.triggerJob(jenkinsJobResult.data.id, data.configuration.parameters);
    }

    return { success: true, data: deployment.data };
  } catch (error: any) {
    console.error('[@action:deployment:createWithCICD] Error:', error);
    return { success: false, error: error.message };
  }
}
