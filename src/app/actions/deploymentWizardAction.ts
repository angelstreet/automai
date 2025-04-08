'use server';

import { cookies } from 'next/headers';

import { CICDService } from '@/lib/services/cicd/service';
import { CreateCICDJobParams } from '@/types-new/cicd-job';
import { CICDProviderType } from '@/types-new/cicd-types';
import { CICDDeploymentFormData } from '@/types-new/deployment-types';

/**
 * Creates a mapping of script IDs to their details
 */
export async function createScriptMapping(scriptIds: string[], scripts: any[]) {
  return scriptIds.reduce(
    (mapping, scriptId) => {
      const script = scripts.find((s) => s.id === scriptId);
      if (script) {
        mapping[scriptId] = {
          path: script.path || script.filename || script.id,
          type: script.type || 'shell',
          parameters: script.parameters || {},
        };
      }
      return mapping;
    },
    {} as Record<
      string,
      { path: string; type: 'shell' | 'python'; parameters: Record<string, any> }
    >,
  );
}

export async function createDeploymentWithCICD(formData: CICDDeploymentFormData) {
  // Initial data logging
  console.log('[@action:deploymentWizard:createDeploymentWithCICD] Starting with form data:', {
    name: formData.name,
    description: formData.description,
    repositoryId: formData.repository_id,
    cicd_provider_id: formData.cicd_provider_id,
    provider: {
      type: formData.provider.type,
      config: formData.provider.config,
    },
    configuration: {
      scriptIds: formData.configuration.scriptIds,
      hostIds: formData.configuration.hostIds,
      hasScriptMapping: !!formData.configuration.scriptMapping,
      hasEnvironmentVars: !!formData.configuration.environmentVars,
    },
  });

  try {
    const cookieStore = await cookies();

    // Initialize CICD service with provider config
    const providerConfig = {
      id: formData.cicd_provider_id,
      type: formData.provider.type as CICDProviderType,
      name: formData.configuration.name,
      url: formData.provider.config.url,
      auth_type: 'token',
      credentials: {
        token: formData.provider.config.token,
        username: formData.provider.config.username,
      },
    };

    const cicdService = new CICDService();
    await cicdService.initialize(providerConfig);

    // Create Jenkins job
    const jobParams: CreateCICDJobParams = {
      name: formData.configuration.name,
      description: formData.configuration.description,
      provider_id: formData.cicd_provider_id,
      repository: {
        url: formData.repository_id,
        branch: formData.repository.branch || 'main',
      },
      scripts: Object.entries(formData.configuration.scriptMapping).map(([id, script]) => ({
        path: script.path,
        type: script.type,
        parameters: script.parameters
          ? Object.entries(script.parameters).map(([key, value]) => `${key}=${value}`)
          : undefined,
      })),
      hosts: formData.configuration.hostIds.map((id) => ({
        name: id,
        ip: '', // Will be resolved by the provider
        username: '', // Will be resolved by the provider
        environment: 'production',
      })),
    };

    const jobResult = await cicdService.createJob(jobParams);

    console.log(
      '[@action:deploymentWizard:createDeploymentWithCICD] Jenkins job creation result:',
      {
        success: jobResult.success,
        error: jobResult.error,
        job_id: jobResult.data?.id,
      },
    );

    if (!jobResult.success) {
      throw new Error(`Failed to create Jenkins job: ${jobResult.error}`);
    }

    // 2. Store Jenkins Job in DB
    console.log('[@action:deploymentWizard:createDeploymentWithCICD] Storing job in database');
    const { createCICDJob } = await import('@/lib/db/cicdDb');
    const cicdJob = await createCICDJob(
      {
        data: {
          provider_id: formData.cicd_provider_id,
          external_id: jobResult.data?.id,
          name: formData.name,
          parameters: formData.configuration,
        },
      },
      cookieStore,
    );

    console.log('[@action:deploymentWizard:createDeploymentWithCICD] CICD job DB storage result:', {
      success: cicdJob.success,
      error: cicdJob.error,
      job_id: cicdJob.data?.id,
    });

    if (!cicdJob.success) {
      throw new Error(`Failed to store CICD job: ${cicdJob.error}`);
    }

    // 3. Create Deployment
    console.log('[@action:deploymentWizard:createDeploymentWithCICD] Creating deployment record');
    const { createDeployment } = await import('@/lib/db/deploymentDb');
    const deployment = await createDeployment(
      {
        name: formData.name,
        description: formData.description,
        repository_id: formData.repository_id,
        team_id: formData.team_id,
        creator_id: formData.creator_id,
      },
      cookieStore,
    );

    console.log('[@action:deploymentWizard:createDeploymentWithCICD] Deployment creation result:', {
      success: deployment.success,
      error: deployment.error,
      deployment_id: deployment.data?.id,
    });

    if (!deployment.success) {
      throw new Error(`Failed to create deployment: ${deployment.error}`);
    }

    // 4. Create Mapping
    console.log(
      '[@action:deploymentWizard:createDeploymentWithCICD] Creating deployment-CICD mapping',
    );
    const { createDeploymentCICDMapping } = await import('@/lib/db/cicdDb');
    const mapping = await createDeploymentCICDMapping(
      {
        deployment_id: deployment.data?.id,
        cicd_job_id: cicdJob.data?.id,
        parameters: formData.configuration,
      },
      cookieStore,
    );

    console.log('[@action:deploymentWizard:createDeploymentWithCICD] Mapping creation result:', {
      success: mapping.success,
      error: mapping.error,
    });

    if (!mapping.success) {
      throw new Error(`Failed to create deployment-CICD mapping: ${mapping.error}`);
    }

    // 5. Auto-start if needed
    if (formData.autoStart && jobResult.data?.id) {
      console.log('[@action:deploymentWizard:createDeploymentWithCICD] Auto-starting job');
      await cicdService.triggerJob(jobResult.data.id, formData.configuration.parameters);
    }

    console.log('[@action:deploymentWizard:createDeploymentWithCICD] Successfully completed');
    return { success: true, data: deployment.data };
  } catch (error: any) {
    console.error('[@action:deploymentWizard:createDeploymentWithCICD] Error:', {
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message };
  }
}
