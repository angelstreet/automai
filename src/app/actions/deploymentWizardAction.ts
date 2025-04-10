'use server';

import { cookies } from 'next/headers';

import { CICDDeploymentFormData, QueuedDeploymentFormData } from '@/types-new/deployment-types';

export async function createDeploymentWithQueue(formData: QueuedDeploymentFormData) {
  try {
    // We no longer use a global timeout - we rely on the Jenkins provider's timeout mechanisms
    const cookieStore = await cookies();

    // Log tenant_name
    console.log('[@action:deploymentWizard] tenant_name:', formData.provider.config.tenant_name);

    // Create Deployment
    console.log('[@action:deploymentWizard] Creating deployment record');
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

    // TODO: Push job to Upstash Redis queue for execution
    // This will be implemented as part of the new architecture
    console.log('[@action:deploymentWizard] Job will be queued for execution by worker');

    // Return the success response with the deployment data
    return { success: true, data: deployment.data };
  } catch (error: any) {
    console.error('[@action:deploymentWizard] Error:', {
      message: error.message,
      stack: error.stack,
    });

    return { success: false, error: error.message };
  }
}

// Keep the old function for backward compatibility during transition
export async function createDeploymentWithCICD(formData: CICDDeploymentFormData) {
  return createDeploymentWithQueue(formData);
}
