'use server';

import { cookies } from 'next/headers';
import { Redis } from '@upstash/redis';

import { createJobConfiguration } from '@/lib/db/jobsConfigurationDb';
import { runJob } from '@/lib/db/jobsRunDb';
import { JobConfiguration } from '@/types/component/jobConfigurationComponentType';

// Initialize Redis client using environment variables
// Works both in Vercel and locally when .env.local has the credentials
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Queue name for jobs
const JOBS_QUEUE = 'jobs_queue';

export interface JobFormData {
  name: string;
  description?: string;
  repository_id?: string;
  branch?: string;
  team_id: string;
  creator_id: string;
  tenant_id: string;
  scripts_path: string[];
  parameters?: string[];
  host_ids: string[];
  environmentVars?: Record<string, string>;
  schedule?: {
    type?: string;
    cronExpression?: string;
    repeatCount?: number;
  };
  is_active?: boolean;
  job_type: string;
  config?: Record<string, any>;
  autoStart?: boolean;
}

/**
 * Generate the job configuration JSON from form data
 * This creates a standardized format for the worker to execute
 */
function generateJobConfigJson(formData: JobFormData, hostDetails?: any[]): Record<string, any> {
  console.log('[@action:jobsAction:generateJobConfigJson] Generating job config JSON');

  // Create the base configuration
  const config: Record<string, any> = {
    name: formData.name,
    job_type: formData.job_type,
    repository_id: formData.repository_id || null,
    branch: formData.branch || 'main',

    // Steps to execute (based on scripts_path)
    steps: Array.isArray(formData.scripts_path)
      ? formData.scripts_path.map((script, index) => {
          const parameters = formData.parameters?.[index] || '';
          return {
            run: `${script} ${parameters}`.trim(),
          };
        })
      : [],

    // Environment variables
    env: formData.environmentVars || {},

    // Inputs (for variable substitution)
    inputs: {},

    // Schedule information
    schedule: formData.schedule?.cronExpression || null,

    // Host information
    hosts: Array.isArray(formData.host_ids)
      ? formData.host_ids.map((hostId) => {
          // If we have host details, include them
          const hostDetail = hostDetails?.find((h) => h.id === hostId);

          return {
            id: hostId,
            name: hostDetail?.name || 'Unknown Host',
            ip: hostDetail?.ip || '',
            os: hostDetail?.os || 'linux',
          };
        })
      : [],

    // Execution configuration
    execution: {
      parallel: false, // Default to sequential execution
      timeout: 3600, // Default timeout in seconds (1 hour)
      retry: {
        attempts: 0,
        delay: 60, // Delay between retries in seconds
      },
    },

    // Created timestamp for reference
    created_at: new Date().toISOString(),
  };

  return config;
}

/**
 * Creates a job configuration and optionally runs the job
 */
export async function createJob(formData: JobFormData, hostDetails?: any[]) {
  try {
    console.log('[@action:jobsAction:createJob] Creating job with name:', formData.name);

    // Ensure formData fields have valid defaults to prevent undefined errors
    const safeFormData = {
      ...formData,
      name: formData.name || 'Unnamed Job',
      team_id: formData.team_id || '',
      creator_id: formData.creator_id || '',
      tenant_id: formData.tenant_id || '',
      scripts_path: Array.isArray(formData.scripts_path) ? formData.scripts_path : [],
      host_ids: Array.isArray(formData.host_ids) ? formData.host_ids : [],
      job_type: formData.job_type || 'deployment',
    };

    const cookieStore = await cookies();

    // Generate the job configuration JSON
    const configJson = generateJobConfigJson(safeFormData, hostDetails);

    // Prepare job configuration data
    const jobConfig: Partial<JobConfiguration> = {
      name: safeFormData.name,
      description: safeFormData.description || null,
      team_id: safeFormData.team_id,
      creator_id: safeFormData.creator_id,
      tenant_id: safeFormData.tenant_id,
      repository_id: safeFormData.repository_id || null,
      branch: safeFormData.branch || null,

      // Scripts and hosts
      scripts_path: safeFormData.scripts_path,
      scripts_parameters: safeFormData.parameters || [],
      host_ids: safeFormData.host_ids,

      // Environment variables
      environment_vars: safeFormData.environmentVars || {},

      // Schedule
      schedule_type: safeFormData.schedule?.type || null,
      cron_expression: safeFormData.schedule?.cronExpression || null,
      repeat_count: safeFormData.schedule?.repeatCount || null,

      // Status
      is_active: safeFormData.is_active !== undefined ? safeFormData.is_active : true,

      // Job type and config
      job_type: safeFormData.job_type,
      config: configJson, // Use the generated JSON configuration

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

    // If autoStart is true, queue the job for execution
    if (formData.autoStart) {
      console.log('[@action:jobsAction:createJob] Auto-starting job run');
      const jobRunResult = await queueJobForExecution(
        jobConfigResult.data.id,
        formData.creator_id,
        null, // No override parameters for auto-start
        cookieStore,
      );

      if (!jobRunResult.success) {
        console.error(
          '[@action:jobsAction:createJob] Failed to queue job run:',
          jobRunResult.error,
        );
        // Don't throw an error here, just log it. The configuration was created successfully.
      } else {
        console.log(
          '[@action:jobsAction:createJob] Job queued successfully:',
          jobRunResult.data.job_run_id,
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
export async function updateJob(id: string, formData: Partial<JobFormData>, hostDetails?: any[]) {
  try {
    console.log(`[@action:jobsAction:updateJob] Updating job: ${id}`);
    const cookieStore = await cookies();

    const { updateJobConfiguration, getJobConfigById } = await import(
      '@/lib/db/jobsConfigurationDb'
    );

    // First, get the existing job config
    const existingJobConfig = await getJobConfigById(id, cookieStore);
    if (!existingJobConfig.success) {
      throw new Error(`Failed to get existing job config: ${existingJobConfig.error}`);
    }

    // Prepare job configuration update data
    const jobConfig: Partial<JobConfiguration> = {};

    // Only include fields that are provided in the formData
    if (formData.name !== undefined) jobConfig.name = formData.name;
    if (formData.description !== undefined) jobConfig.description = formData.description;
    if (formData.repository_id !== undefined) jobConfig.repository_id = formData.repository_id;
    if (formData.branch !== undefined) jobConfig.branch = formData.branch;
    if (formData.team_id !== undefined) jobConfig.team_id = formData.team_id;
    if (formData.scripts_path !== undefined) jobConfig.scripts_path = formData.scripts_path;
    if (formData.parameters !== undefined) jobConfig.scripts_parameters = formData.parameters;
    if (formData.host_ids !== undefined) jobConfig.host_ids = formData.host_ids;
    if (formData.environmentVars !== undefined)
      jobConfig.environment_vars = formData.environmentVars;

    // Schedule
    if (formData.schedule !== undefined) {
      if (formData.schedule.type !== undefined) jobConfig.schedule_type = formData.schedule.type;
      jobConfig.cron_expression = formData.schedule.cronExpression || null;
      jobConfig.repeat_count = formData.schedule.repeatCount || null;
    }

    // Status
    if (formData.is_active !== undefined) jobConfig.is_active = formData.is_active;

    // Generate updated config JSON if any relevant fields changed
    if (
      formData.name !== undefined ||
      formData.repository_id !== undefined ||
      formData.branch !== undefined ||
      formData.scripts_path !== undefined ||
      formData.parameters !== undefined ||
      formData.host_ids !== undefined ||
      formData.environmentVars !== undefined ||
      formData.schedule !== undefined ||
      formData.job_type !== undefined
    ) {
      // Safely get existing values
      const existingScriptsPath = Array.isArray(existingJobConfig.data.scripts_path)
        ? existingJobConfig.data.scripts_path
        : [];

      const existingHostIds = Array.isArray(existingJobConfig.data.host_ids)
        ? existingJobConfig.data.host_ids
        : [];

      // Merge with existing data to create a complete form data object
      const completeFormData: JobFormData = {
        name: formData.name || existingJobConfig.data.name || 'Unnamed Job',
        description: formData.description || existingJobConfig.data.description || undefined,
        repository_id: formData.repository_id || existingJobConfig.data.repository_id || undefined,
        branch: formData.branch || existingJobConfig.data.branch || undefined,
        team_id: formData.team_id || existingJobConfig.data.team_id || '',
        creator_id: existingJobConfig.data.creator_id || '',
        tenant_id: existingJobConfig.data.tenant_id || '',

        // Ensure arrays are properly handled
        scripts_path: Array.isArray(formData.scripts_path)
          ? formData.scripts_path
          : existingScriptsPath,

        parameters: formData.parameters || existingJobConfig.data.scripts_parameters || undefined,

        host_ids: Array.isArray(formData.host_ids) ? formData.host_ids : existingHostIds,

        environmentVars:
          formData.environmentVars || existingJobConfig.data.environment_vars || undefined,
        schedule: {
          type: formData.schedule?.type || existingJobConfig.data.schedule_type || undefined,
          cronExpression:
            formData.schedule?.cronExpression ||
            existingJobConfig.data.cron_expression ||
            undefined,
          repeatCount:
            formData.schedule?.repeatCount || existingJobConfig.data.repeat_count || undefined,
        },
        is_active:
          formData.is_active !== undefined ? formData.is_active : existingJobConfig.data.is_active,
        job_type: formData.job_type || existingJobConfig.data.job_type || 'deployment',
      };

      // Generate the updated config JSON
      jobConfig.config = generateJobConfigJson(completeFormData, hostDetails);
    }

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
export async function startJob(
  configId: string,
  userId: string,
  overrideParameters?: Record<string, any>,
) {
  try {
    console.log(`[@action:jobsAction:startJob] Starting job with config ID: ${configId}`);
    const cookieStore = await cookies();

    // Queue the job for execution
    const result = await queueJobForExecution(configId, userId, overrideParameters, cookieStore);

    if (!result.success) {
      throw new Error(`Failed to start job: ${result.error}`);
    }

    console.log(
      `[@action:jobsAction:startJob] Job started successfully: ${result.data.job_run_id}`,
    );

    return {
      success: true,
      data: result.data,
      message: 'Job queued successfully',
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

/**
 * Prepare a job configuration for pushing to Redis queue
 * This creates a standardized format for the worker to consume
 */
function prepareJobForQueue(
  jobConfig: JobConfiguration,
  overrideParameters?: Record<string, any>,
): Record<string, any> {
  console.log('[@action:jobsAction:prepareJobForQueue] Preparing job for queue');

  // Create the Redis job payload
  const queuePayload = {
    // Job identification
    job_id: jobConfig.id,
    config_id: jobConfig.id,
    team_id: jobConfig.team_id,
    tenant_id: jobConfig.tenant_id,

    // Job configuration (the detailed config we created)
    config: jobConfig.config,

    // Override parameters (useful for manual runs with different parameters)
    overrideParameters: overrideParameters || {},

    // Timestamps
    queued_at: new Date().toISOString(),
    priority: 1, // Default priority (1 = normal)
  };

  return queuePayload;
}

/**
 * Queue a job for execution by pushing to Redis
 */
export async function queueJobForExecution(
  configId: string,
  userId: string,
  overrideParameters?: Record<string, any>,
  cookieStore?: any,
) {
  try {
    console.log(`[@action:jobsAction:queueJobForExecution] Queueing job: ${configId}`);

    // First, get the job configuration
    const { getJobConfigById } = await import('@/lib/db/jobsConfigurationDb');
    const configResult = await getJobConfigById(configId, cookieStore);

    if (!configResult.success) {
      return { success: false, error: `Failed to get job configuration: ${configResult.error}` };
    }

    // Get the job run that we'll update with queued status
    const { runJob } = await import('@/lib/db/jobsRunDb');
    const jobRunResult = await runJob(configId, userId, cookieStore);

    if (!jobRunResult.success) {
      return { success: false, error: `Failed to create job run: ${jobRunResult.error}` };
    }

    // Prepare the job payload for Redis
    const queuePayload = prepareJobForQueue(configResult.data, overrideParameters);

    // Add job run ID to the payload
    queuePayload.job_run_id = jobRunResult.data.id;

    try {
      // Push to Redis queue using LPUSH (adds to the left/beginning of the list)
      console.log(
        `[@action:jobsAction:queueJobForExecution] Pushing to Redis queue: ${JOBS_QUEUE}`,
      );

      // Convert payload to JSON string for Redis
      const payloadString = JSON.stringify(queuePayload);

      // Push to Redis queue
      const redisResult = await redis.lpush(JOBS_QUEUE, payloadString);

      console.log(`[@action:jobsAction:queueJobForExecution] Redis push result:`, redisResult);

      // Update job run with queue information
      const { updateJobRun } = await import('@/lib/db/jobsRunDb');
      await updateJobRun(
        jobRunResult.data.id,
        {
          queued_at: new Date().toISOString(),
          execution_parameters: {
            queue: JOBS_QUEUE,
            priority: queuePayload.priority,
            override_parameters: overrideParameters || null,
          },
        },
        cookieStore,
      );

      return {
        success: true,
        data: {
          job_run_id: jobRunResult.data.id,
          queue_payload: queuePayload,
        },
        message: 'Job queued successfully',
      };
    } catch (redisError: any) {
      console.error('[@action:jobsAction:queueJobForExecution] Redis error:', {
        message: redisError.message,
        stack: redisError.stack,
      });

      // Even if Redis fails, we want to return the job run we created
      return {
        success: true,
        data: {
          job_run_id: jobRunResult.data.id,
          queue_error: redisError.message,
        },
        message: 'Job run created but failed to queue in Redis',
      };
    }
  } catch (error: any) {
    console.error('[@action:jobsAction:queueJobForExecution] Error:', {
      message: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message || 'Failed to queue job',
    };
  }
}
