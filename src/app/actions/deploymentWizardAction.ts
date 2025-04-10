'use server';

import { cookies } from 'next/headers';

export async function createDeploymentWithCICD(formData: CICDDeploymentFormData) {
  try {
    // We no longer use a global timeout - we rely on the Jenkins provider's timeout mechanisms
    const cookieStore = await cookies();

    // Log tenant_name
    console.log('[@action:deploymentWizard] tenant_name:', formData.provider.config.tenant_name);

    // Create Deployment
    console.log('[@action:deploymentWizard:createDeploymentWithCICD] Creating deployment record');
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

    // Return the success response with the deployment data
    return { success: true, data: deployment.data };
  } catch (error: any) {
    console.error('[@action:deploymentWizard:createDeploymentWithCICD] Error:', {
      message: error.message,
      stack: error.stack,
    });

    // Provide a clearer error message for Jenkins-specific errors
    let errorMessage = error.message;
    if (error.message.includes('timed out')) {
      errorMessage =
        'Jenkins job creation timed out after 15 seconds. Please check your Jenkins server or try again later.';
    }

    return { success: false, error: errorMessage };
  }
}
