'use server';

import { cookies } from 'next/headers';

import { CICDService } from '@/lib/services/cicd/service';
import { CreateCICDJobParams } from '@/types-new/cicd-job';
import { CICDProviderConfig } from '@/types-new/cicd-provider';
import { CICDDeploymentFormData } from '@/types-new/deployment-types';

export async function createDeploymentWithCICD(formData: CICDDeploymentFormData) {
  // Add timeout for the entire operation
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Operation timed out after 30 seconds')), 30000),
  );

  try {
    const result = await Promise.race([
      (async () => {
        const cookieStore = await cookies();

        // Initialize CICD service with provider config
        const providerConfig: CICDProviderConfig = {
          id: formData.cicd_provider_id,
          type: 'jenkins', // We know it's Jenkins in this case
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
            branch: formData.configuration.branch,
          },
          scripts: formData.configuration.scriptIds.map((scriptId, index) => ({
            path: scriptId,
            type: 'shell',
            parameters: formData.configuration.parameters[index]
              ? [formData.configuration.parameters[index]]
              : undefined,
          })),
          hosts: formData.configuration.hostIds.map((id) => ({
            name: id,
            ip: '',
            username: '',
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
          const errorMessage = jobResult.error?.includes('timed out')
            ? 'Jenkins job creation timed out. The server might be busy or unavailable.'
            : `Failed to create Jenkins job: ${jobResult.error}`;
          throw new Error(errorMessage);
        }

        // Store Jenkins Job in DB
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

        if (!cicdJob.success) {
          throw new Error(`Failed to store CICD job: ${cicdJob.error}`);
        }

        // Create Deployment
        console.log(
          '[@action:deploymentWizard:createDeploymentWithCICD] Creating deployment record with data:',
          {
            name: formData.name,
            repository_id: formData.repository_id,
            team_id: formData.team_id,
            creator_id: formData.creator_id,
            cicd_provider_id: formData.cicd_provider_id,
            host_ids: formData.configuration.hostIds,
          },
        );
        const { createDeployment } = await import('@/lib/db/deploymentDb');
        const deployment = await createDeployment(
          {
            name: formData.name,
            description: formData.description || '',
            repository_id: formData.repository_id || null, // Make nullable
            team_id: formData.team_id,
            creator_id: formData.creator_id,
            tenant_id: formData.team_id.split('_')[0],
            status: 'pending',
            scripts_path: formData.configuration.scriptIds,
            host_ids:
              formData.configuration.hostIds.length > 0 ? formData.configuration.hostIds : null, // Make nullable
            environment_vars: formData.configuration.environmentVars || null,
            cicd_provider_id: formData.cicd_provider_id,
            schedule_type: 'now',
            scripts_parameters: formData.configuration.parameters || [],
          } as any,
          cookieStore,
        );

        if (!deployment.success) {
          throw new Error(`Failed to create deployment: ${deployment.error}`);
        }

        // Create Mapping
        const { createDeploymentCICDMapping } = await import('@/lib/db/cicdDb');
        const mapping = await createDeploymentCICDMapping(
          {
            deployment_id: deployment.data?.id,
            cicd_job_id: cicdJob.data?.id,
            parameters: formData.configuration,
          },
          cookieStore,
        );

        if (!mapping.success) {
          throw new Error(`Failed to create deployment-CICD mapping: ${mapping.error}`);
        }

        // Auto-start if needed
        if (formData.autoStart && jobResult.data?.id) {
          await cicdService.triggerJob(jobResult.data.id, formData.configuration.parameters);
        }

        return { success: true, data: deployment.data };
      })(),
      timeout,
    ]);

    return result as { success: true; data: any };
  } catch (error: any) {
    console.error('[@action:deploymentWizard:createDeploymentWithCICD] Error:', {
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message };
  }
}
