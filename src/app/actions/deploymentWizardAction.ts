'use server';

import { cookies } from 'next/headers';

import { CICDService } from '@/lib/services/cicd/service';
import { CICDDeploymentFormData } from '@/types-new/deployment-types';

export async function createDeploymentWithCICD(formData: CICDDeploymentFormData) {
  // Initial data logging
  console.log('[@action:deploymentWizard:createDeploymentWithCICD] Starting with form data:', {
    name: formData.name,
    description: formData.description,
    repository_id: formData.repository_id,
    cicd_provider_id: formData.cicd_provider_id,
    provider: {
      type: formData.provider?.type,
      name: formData.provider?.name,
    },
    configuration: {
      scriptIds: formData.configuration.scriptIds,
      hostIds: formData.configuration.hostIds,
      hasScriptMapping: !!formData.configuration.scriptMapping,
      hasParameters: !!formData.configuration.parameters,
    },
  });

  try {
    const cookieStore = await cookies();

    // 1. Create Jenkins Job First
    console.log('[@action:deploymentWizard:createDeploymentWithCICD] Initializing CICD service');
    const cicdService = new CICDService();
    cicdService.initialize(formData.provider);

    // Log job creation parameters
    console.log('[@action:deploymentWizard:createDeploymentWithCICD] Creating Jenkins job with:', {
      name: formData.name,
      scripts_count: Object.keys(formData.configuration.scriptMapping || {}).length,
      hosts_count: formData.configuration.hostIds?.length,
      provider_type: formData.provider?.type,
    });

    const jenkinsJobResult = await cicdService.createJob({
      name: formData.name,
      description: formData.description,
      repository: {
        url: formData.repository_url,
        branch: formData.branch || 'main',
      },
      scripts: Object.values(formData.configuration.scriptMapping).map((script) => ({
        path: script.path,
        type: script.type,
        parameters: formData.configuration.parameters,
      })),
      hosts: formData.configuration.hostIds,
    });

    console.log(
      '[@action:deploymentWizard:createDeploymentWithCICD] Jenkins job creation result:',
      {
        success: jenkinsJobResult.success,
        error: jenkinsJobResult.error,
        job_id: jenkinsJobResult.data?.id,
      },
    );

    if (!jenkinsJobResult.success) {
      throw new Error(`Failed to create Jenkins job: ${jenkinsJobResult.error}`);
    }

    // 2. Store Jenkins Job in DB
    console.log('[@action:deploymentWizard:createDeploymentWithCICD] Storing job in database');
    const { createCICDJob } = await import('@/lib/db/cicdDb');
    const cicdJob = await createCICDJob(
      {
        data: {
          provider_id: formData.cicd_provider_id,
          external_id: jenkinsJobResult.data?.id,
          name: formData.name,
          parameters: formData.configuration.parameters,
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
    if (formData.autoStart && jenkinsJobResult.data?.id) {
      console.log('[@action:deploymentWizard:createDeploymentWithCICD] Auto-starting job');
      await cicdService.triggerJob(jenkinsJobResult.data.id, formData.configuration.parameters);
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
