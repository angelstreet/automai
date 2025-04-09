'use server';

import { cookies } from 'next/headers';

import { CICDService } from '@/lib/services/cicd/service';
import { CreateCICDJobParams } from '@/types-new/cicd-job';
import { CICDProviderConfig, CICDProviderType, CICDAuthType } from '@/types-new/cicd-types';
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

        // Log tenant_name
        console.log(
          '[@action:deploymentWizard] tenant_name:',
          formData.provider.config.tenant_name,
        );

        // Initialize CICD service with provider config
        const providerConfig: CICDProviderConfig = {
          id: formData.cicd_provider_id,
          tenant_name: formData.provider.config.tenant_name,
          type: formData.provider.type as CICDProviderType,
          name: formData.configuration.name,
          url: formData.provider.config.url,
          auth_type: 'basic_auth' as CICDAuthType,
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
              // Required fields
              provider_id: formData.cicd_provider_id,
              external_id: jobResult.data?.id,
              name: formData.name,
              team_id: formData.team_id,
              creator_id: formData.creator_id,

              // Optional fields
              description: formData.description || null,
              parameters: formData.configuration || null,

              // Timestamps
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          cookieStore,
        );

        if (!cicdJob.success) {
          throw new Error(`Failed to store CICD job: ${cicdJob.error}`);
        }

        // Create Deployment
        console.log(
          '[@action:deploymentWizard:createDeploymentWithCICD] Creating deployment record',
        );
        const { createDeployment } = await import('@/lib/db/deploymentDb');
        const deployment = await createDeployment(
          {
            // Required fields
            name: formData.name,
            tenant_id: formData.team_id.split('_')[0],
            team_id: formData.team_id,
            creator_id: formData.creator_id,
            status: 'pending',

            // Optional fields with proper defaults/nulls
            description: formData.description || null,
            repository_id: formData.repository_id || null,
            schedule_type: formData.configuration?.schedule?.enabled ? 'cron' : 'now',
            scheduled_time: null,
            scripts_path: formData.configuration.scriptIds || null,
            host_ids: formData.configuration.hostIds || null,
            environment_vars: formData.configuration.environmentVars || null,
            scripts_parameters: formData.configuration.parameters || null,
            cicd_provider_id: formData.cicd_provider_id || null,

            // Schedule related fields
            cron_expression: formData.configuration?.schedule?.cronExpression || null,
            repeat_count: formData.configuration?.schedule?.repeatCount || null,

            // Timestamps
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            started_at: null,
            completed_at: null,
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
            // Required references
            deployment_id: deployment.data?.id,
            cicd_job_id: cicdJob.data?.id,

            // Job details
            parameters: formData.configuration,
            build_number: null, // Will be set when the job runs
            build_url: null, // Will be set when the job runs

            // Timestamps
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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
