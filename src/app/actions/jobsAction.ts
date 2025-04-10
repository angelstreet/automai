'use server';

import { cookies } from 'next/headers';

import { createJobConfiguration } from '@/lib/db/jobsConfigurationDb';
import { runJob } from '@/lib/db/jobsRunDb';
import { JobConfiguration } from '@/types/component/jobConfigurationComponentType';

export interface JobFormData {
  name: string;
  description?: string;
  repository_id?: string;
  repository_url?: string;
  branch?: string;
  team_id: string;
  creator_id: string;
  scriptIds: string[];
  parameters?: string[];
  hostIds: string[];
  environmentVars?: Record<string, string>;
  schedule?: {
    enabled: boolean;
    cronExpression?: string;
    repeatCount?: number;
  };
  notifications?: {
    enabled: boolean;
    onSuccess: boolean;
    onFailure: boolean;
  };
  autoStart?: boolean;
  job_type: string;
  config?: Record<string, any>;
}

/**
 * Creates a job configuration and optionally runs the job
 */
export async function createJob(formData: JobFormData) {
  try {
    console.log('[@action:jobsAction:createJob] Creating job with name:', formData.name);
    const cookieStore = await cookies();

    // Prepare job configuration data
    const jobConfig: Partial<JobConfiguration> = {
      name: formData.name,
      description: formData.description || null,
      team_id: formData.team_id,
      user_id: formData.creator_id,
      repository_id: formData.repository_id || null,
      repository_url: formData.repository_url || null,
      branch: formData.branch || 'main',

      // Scripts and hosts
      scripts: formData.scriptIds || [],
      scripts_parameters: formData.parameters || [],
      hosts: formData.hostIds || [],

      // Environment variables
      environment_vars: formData.environmentVars || {},

      // Schedule
      schedule_enabled: formData.schedule?.enabled || false,
      cron_expression: formData.schedule?.cronExpression || null,
      repeat_count: formData.schedule?.repeatCount || null,

      // Notifications
      notifications_enabled: formData.notifications?.enabled || false,
      notification_on_success: formData.notifications?.onSuccess || false,
      notification_on_failure: formData.notifications?.onFailure || false,

      // Job type and config
      job_type: formData.job_type || 'deployment',
      config: formData.config || {},

      // Creation timestamp
      created_at: new Date().toISOString(),
    };

    // Create the job configuration
    console.log('[@action:jobsAction:createJob] Creating job configuration in database');
    const jobConfigResult = await createJobConfiguration(jobConfig, cookieStore);

    if (!jobConfigResult.success) {
      throw new Error(`Failed to create job configuration: ${jobConfigResult.error}`);
    }

    console.log(
      '[@action:jobsAction:createJob] Job configuration created successfully:',
      jobConfigResult.data.id,
    );

    // If autoStart is true, run the job
    if (formData.autoStart) {
      console.log('[@action:jobsAction:createJob] Auto-starting job run');
      const jobRunResult = await runJob(jobConfigResult.data.id, formData.creator_id, cookieStore);

      if (!jobRunResult.success) {
        console.error(
          '[@action:jobsAction:createJob] Failed to start job run:',
          jobRunResult.error,
        );
        // Don't throw an error here, just log it. The configuration was created successfully.
      } else {
        console.log(
          '[@action:jobsAction:createJob] Job run started successfully:',
          jobRunResult.data.id,
        );
      }
    }

    // Return success with the job configuration data
    return {
      success: true,
      data: jobConfigResult.data,
      message: 'Job created successfully',
    };
  } catch (error: any) {
    console.error('[@action:jobsAction:createJob] Error:', {
      message: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message || 'Failed to create job',
    };
  }
}

/**
 * Updates an existing job configuration
 */
export async function updateJob(id: string, formData: Partial<JobFormData>) {
  try {
    console.log(`[@action:jobsAction:updateJob] Updating job: ${id}`);
    const cookieStore = await cookies();

    const { updateJobConfiguration } = await import('@/lib/db/jobsConfigurationDb');

    // Prepare job configuration update data
    const jobConfig: Partial<JobConfiguration> = {};

    // Only include fields that are provided in the formData
    if (formData.name !== undefined) jobConfig.name = formData.name;
    if (formData.description !== undefined) jobConfig.description = formData.description;
    if (formData.repository_id !== undefined) jobConfig.repository_id = formData.repository_id;
    if (formData.repository_url !== undefined) jobConfig.repository_url = formData.repository_url;
    if (formData.branch !== undefined) jobConfig.branch = formData.branch;
    if (formData.scriptIds !== undefined) jobConfig.scripts = formData.scriptIds;
    if (formData.parameters !== undefined) jobConfig.scripts_parameters = formData.parameters;
    if (formData.hostIds !== undefined) jobConfig.hosts = formData.hostIds;
    if (formData.environmentVars !== undefined)
      jobConfig.environment_vars = formData.environmentVars;

    // Schedule
    if (formData.schedule !== undefined) {
      jobConfig.schedule_enabled = formData.schedule.enabled;
      jobConfig.cron_expression = formData.schedule.cronExpression || null;
      jobConfig.repeat_count = formData.schedule.repeatCount || null;
    }

    // Notifications
    if (formData.notifications !== undefined) {
      jobConfig.notifications_enabled = formData.notifications.enabled;
      jobConfig.notification_on_success = formData.notifications.onSuccess;
      jobConfig.notification_on_failure = formData.notifications.onFailure;
    }

    // Config
    if (formData.config !== undefined) jobConfig.config = formData.config;

    // Update timestamp
    jobConfig.updated_at = new Date().toISOString();

    // Update the job configuration
    const result = await updateJobConfiguration(id, jobConfig, cookieStore);

    if (!result.success) {
      throw new Error(`Failed to update job: ${result.error}`);
    }

    console.log(`[@action:jobsAction:updateJob] Job updated successfully: ${id}`);

    return {
      success: true,
      data: result.data,
      message: 'Job updated successfully',
    };
  } catch (error: any) {
    console.error('[@action:jobsAction:updateJob] Error:', {
      message: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message || 'Failed to update job',
    };
  }
}

/**
 * Runs a job by its configuration ID
 */
export async function startJob(configId: string, userId: string) {
  try {
    console.log(`[@action:jobsAction:startJob] Starting job with config ID: ${configId}`);
    const cookieStore = await cookies();

    // Run the job
    const result = await runJob(configId, userId, cookieStore);

    if (!result.success) {
      throw new Error(`Failed to start job: ${result.error}`);
    }

    console.log(`[@action:jobsAction:startJob] Job started successfully: ${result.data.id}`);

    return {
      success: true,
      data: result.data,
      message: 'Job started successfully',
    };
  } catch (error: any) {
    console.error('[@action:jobsAction:startJob] Error:', {
      message: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message || 'Failed to start job',
    };
  }
}

/**
 * Deletes a job configuration
 */
export async function deleteJob(id: string) {
  try {
    console.log(`[@action:jobsAction:deleteJob] Deleting job: ${id}`);
    const cookieStore = await cookies();

    const { deleteJobConfiguration } = await import('@/lib/db/jobsConfigurationDb');
    const result = await deleteJobConfiguration(id, cookieStore);

    if (!result.success) {
      throw new Error(`Failed to delete job: ${result.error}`);
    }

    console.log(`[@action:jobsAction:deleteJob] Job deleted successfully: ${id}`);

    return {
      success: true,
      message: 'Job deleted successfully',
    };
  } catch (error: any) {
    console.error('[@action:jobsAction:deleteJob] Error:', {
      message: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message || 'Failed to delete job',
    };
  }
}
