'use server';

import { Redis } from '@upstash/redis';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { createJobConfiguration } from '@/lib/db/jobsConfigurationDb';
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
  scripts_path: string[];
  scripts_parameters?: string[];
  host_ids: string[];
  environment_vars?: Record<string, string>;
  cron_expression?: string;
  repeat_count?: number;
  is_active?: boolean;
  config: Record<string, any>;
  created_at?: string;
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
    repository_id: formData.repository_id || null,
    branch: formData.branch || 'main',

    // Steps to execute (based on scripts_path)
    scripts: Array.isArray(formData.scripts_path)
      ? formData.scripts_path.map((script, index) => {
          const parameters = formData.scripts_parameters?.[index] || '';
          return {
            run: `${script} ${parameters}`.trim(),
          };
        })
      : [],

    // Environment variables
    env: formData.environment_vars || {},

    // Inputs (for variable substitution)
    inputs: {},

    // Schedule information - Change "immediate" to "now"
    schedule: formData.cron_expression
      ? formData.cron_expression
      : formData.is_active
        ? 'now'
        : null,

    // Host information - Enhanced format with username, IP, and port separately
    hosts: Array.isArray(formData.host_ids)
      ? formData.host_ids.map((hostId) => {
          // If we have host details, include them
          const hostDetail = hostDetails?.find((h) => h.id === hostId);

          // Parse host details to get username and IP separately
          let username = 'root';
          let ip = '';
          let port = 22;
          let name = hostDetail?.name || 'Unknown Host';

          if (hostDetail?.ip) {
            ip = hostDetail.ip;
          }

          if (hostDetail?.username) {
            username = hostDetail.username;
          }

          if (hostDetail?.port) {
            port = parseInt(hostDetail.port) || 22;
          }

          return {
            id: hostId,
            name: name,
            username: username,
            ip: ip,
            port: port,
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
    created_at: formData.created_at || new Date().toISOString(),
  };

  return config;
}

/**
 * Creates a job configuration and optionally runs the job
 */
export async function createJob(formData: JobFormData, hostDetails?: any[]) {
  try {
    console.log('[@action:jobsAction:createJob] Creating job with name:', formData.name);

    // Log the full form data for debugging
    console.log('[@action:jobsAction:createJob] Form data:', formData);

    const cookieStore = await cookies();

    // Use the config field directly from formData if provided, otherwise generate it
    const configJson = formData.config || generateJobConfigJson(formData, hostDetails);

    // Prepare job configuration data
    const jobConfig: Partial<JobConfiguration> = {
      name: formData.name,
      description: formData.description || null,
      team_id: formData.team_id,
      creator_id: formData.creator_id,
      repository_id: formData.repository_id || null,
      branch: formData.branch || null,

      // Scripts and hosts
      scripts_path: formData.scripts_path || [],
      scripts_parameters: formData.scripts_parameters || [],
      host_ids: formData.host_ids || [],

      // Environment variables
      environment_vars: formData.environment_vars || {},

      // Schedule
      cron_expression: formData.cron_expression || null,
      repeat_count: formData.repeat_count || null,

      // Status
      is_active: formData.is_active !== undefined ? formData.is_active : true,

      // Config
      config: configJson,

      // Creation timestamp
      created_at: formData.created_at || new Date().toISOString(),
    };

    // Create the job configuration
    console.log('[@action:jobsAction:createJob] Creating job configuration in database');
    const jobConfigResult = await createJobConfiguration(jobConfig, cookieStore);

    if (!jobConfigResult.success || !jobConfigResult.data) {
      throw new Error(`Failed to create job configuration: ${jobConfigResult.error}`);
    }

    console.log(
      '[@action:jobsAction:createJob] Job configuration created successfully:',
      jobConfigResult.data.id,
    );

    // If is_active is true, queue the job for execution
    if (formData.is_active) {
      console.log('[@action:jobsAction:createJob] Auto-starting job run');
      const jobRunResult = await queueJobForExecution(
        jobConfigResult.data.id,
        formData.creator_id,
        {}, // Empty object instead of null for override parameters
        cookieStore,
      );

      if (!jobRunResult.success) {
        console.error('[@action:jobsAction:createJob] Failed to queue job:', jobRunResult.error);
        return {
          success: true,
          data: jobConfigResult.data,
          queueError: jobRunResult.error,
        };
      }

      return {
        success: true,
        data: jobConfigResult.data,
        jobRun: jobRunResult.data,
      };
    }

    // Return success with the job configuration data
    return {
      success: true,
      data: jobConfigResult.data,
    };
  } catch (error: any) {
    console.error('[@action:jobsAction:createJob] Error:', error.message);
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
    if (!existingJobConfig.success || !existingJobConfig.data) {
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
    if (formData.scripts_parameters !== undefined)
      jobConfig.scripts_parameters = formData.scripts_parameters;
    if (formData.host_ids !== undefined) jobConfig.host_ids = formData.host_ids;
    if (formData.environment_vars !== undefined)
      jobConfig.environment_vars = formData.environment_vars;

    // Schedule
    if (formData.cron_expression !== undefined)
      jobConfig.cron_expression = formData.cron_expression;
    if (formData.repeat_count !== undefined) jobConfig.repeat_count = formData.repeat_count;

    // Status
    if (formData.is_active !== undefined) jobConfig.is_active = formData.is_active;

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
      scripts_path: Array.isArray(formData.scripts_path)
        ? formData.scripts_path
        : existingScriptsPath,
      scripts_parameters:
        formData.scripts_parameters || existingJobConfig.data.scripts_parameters || [],
      host_ids: Array.isArray(formData.host_ids) ? formData.host_ids : existingHostIds,
      environment_vars: formData.environment_vars || existingJobConfig.data.environment_vars || {},
      cron_expression:
        formData.cron_expression || existingJobConfig.data.cron_expression || undefined,
      repeat_count: formData.repeat_count || existingJobConfig.data.repeat_count || undefined,
      is_active:
        formData.is_active !== undefined ? formData.is_active : existingJobConfig.data.is_active,
      config: generateJobConfigJson(completeFormData, hostDetails),
      created_at: existingJobConfig.data.created_at || new Date().toISOString(),
    };

    // Generate the updated config JSON
    jobConfig.config = generateJobConfigJson(completeFormData, hostDetails);

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
 * This simply pushes the job ID to Redis queue for the runner to process
 */
export async function startJob(
  configId: string,
  userId: string,
  overrideParameters?: Record<string, any>,
) {
  try {
    console.log(`[@action:jobsAction:startJob] Queueing job with config ID: "${configId}"`);

    if (!configId) {
      console.error('[@action:jobsAction:startJob] ERROR: No config ID provided');
      return {
        success: false,
        error: 'No job configuration ID provided',
      };
    }

    // First verify the job configuration exists
    const cookieStore = await cookies();
    const { getJobConfigById } = await import('@/lib/db/jobsConfigurationDb');
    const jobConfigResult = await getJobConfigById(configId, cookieStore);

    if (!jobConfigResult.success || !jobConfigResult.data) {
      console.error('[@action:jobsAction:startJob] ERROR: Job configuration not found:', configId);
      return {
        success: false,
        error: `Job configuration not found: ${jobConfigResult.error || ''}`,
      };
    }

    console.log(
      `[@action:jobsAction:startJob] Found valid job configuration: ${configId}, pushing to queue`,
    );

    // Simple job payload for the queue
    const queuePayload = {
      config_id: configId,
      timestamp: new Date().toISOString(),
      requested_by: userId || 'unknown',
    };

    // Convert payload to JSON string for Redis
    const payloadString = JSON.stringify(queuePayload);

    // Push to Redis queue
    console.log(`[@action:jobsAction:startJob] About to push job to Redis queue:`, {
      queue: JOBS_QUEUE,
      config_id: configId,
      payload_size: payloadString.length,
    });
    const redisResult = await redis.lpush(JOBS_QUEUE, payloadString);
    console.log(`[@action:jobsAction:startJob] Redis push result:`, redisResult);

    // Revalidate paths to refresh UI
    console.log(`[@action:jobsAction:startJob] Revalidating paths`);
    revalidatePath('/[locale]/[tenant]/deployment', 'page');

    return {
      success: true,
      data: {
        config_id: configId,
        queued: true,
      },
      message: 'Job queued successfully',
    };
  } catch (error: any) {
    console.error('[@action:jobsAction:startJob] CAUGHT ERROR:', {
      id: configId,
      userId,
      message: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message || 'Failed to queue job',
    };
  }
}

/**
 * Deletes a job configuration
 */
export async function deleteJob(id: string) {
  try {
    console.log(`[@action:jobsAction:deleteJob] START Deleting job with ID: "${id}"`);

    if (!id) {
      console.error('[@action:jobsAction:deleteJob] ERROR: No ID provided for deletion');
      return {
        success: false,
        error: 'No job ID provided for deletion',
      };
    }

    console.log(`[@action:jobsAction:deleteJob] Getting cookies for auth context`);
    const cookieStore = await cookies();

    console.log(`[@action:jobsAction:deleteJob] Importing deleteJobConfiguration function`);
    const { deleteJobConfiguration } = await import('@/lib/db/jobsConfigurationDb');

    console.log(`[@action:jobsAction:deleteJob] Calling deleteJobConfiguration with ID: "${id}"`);
    const result = await deleteJobConfiguration(id, cookieStore);
    console.log(`[@action:jobsAction:deleteJob] deleteJobConfiguration result:`, result);

    if (!result.success) {
      console.error(
        `[@action:jobsAction:deleteJob] ERROR: Delete operation failed: ${result.error}`,
      );
      throw new Error(`Failed to delete job: ${result.error}`);
    }

    // Revalidate deployment-related paths
    console.log(`[@action:jobsAction:deleteJob] Revalidating paths`);
    revalidatePath('/[locale]/[tenant]/deployment', 'page');

    console.log(
      `[@action:jobsAction:deleteJob] SUCCESS: Job deleted successfully with ID: "${id}"`,
    );

    return {
      success: true,
      message: 'Job deleted successfully',
    };
  } catch (error: any) {
    console.error('[@action:jobsAction:deleteJob] CAUGHT ERROR:', {
      id: id,
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
  jobConfig: JobConfiguration | null | undefined,
  overrideParameters?: Record<string, any>,
): Record<string, any> {
  console.log('[@action:jobsAction:prepareJobForQueue] Preparing job for queue');

  if (!jobConfig) {
    throw new Error('Cannot prepare queue payload: Job configuration is missing');
  }

  // Create the Redis job payload
  const queuePayload = {
    // Job identification
    job_id: jobConfig.id,
    config_id: jobConfig.id,
    team_id: jobConfig.team_id,

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

/**
 * Get all job configurations (replacements for deployments)
 */
export async function getAllJobs() {
  try {
    console.log('[@action:jobsAction:getAllJobs] Getting all job configurations');
    const cookieStore = await cookies();

    // Get current user
    const { getUser } = await import('@/app/actions/userAction');
    const user = await getUser();

    if (!user) {
      console.error('[@action:jobsAction:getAllJobs] User not authenticated');
      return { success: false, error: 'User not authenticated', data: [] };
    }

    // Get the user's active team ID
    const { getUserActiveTeam } = await import('@/app/actions/teamAction');
    const activeTeamResult = await getUserActiveTeam(user.id);
    if (!activeTeamResult || !activeTeamResult.id) {
      console.error('[@action:jobsAction:getAllJobs] No active team found for user');
      return { success: false, error: 'No active team found', data: [] };
    }

    const teamId = activeTeamResult.id;

    // Import getJobConfigsByTeamId only when needed
    const { getJobConfigsByTeamId } = await import('@/lib/db/jobsConfigurationDb');

    // Fetch job configurations from the database
    const result = await getJobConfigsByTeamId(teamId, cookieStore);

    if (!result.success) {
      console.error(
        '[@action:jobsAction:getAllJobs] Error fetching job configurations:',
        result.error,
      );
      return { success: false, error: result.error, data: [] };
    }

    console.log(
      '[@action:jobsAction:getAllJobs] Fetched configurations count:',
      result.data?.length || 0,
    );

    // Transform job configuration data to match expected deployment format with camelCase fields
    const transformedData =
      result.data?.map((config) => {
        // Get the latest run to determine status
        const latestRun =
          config.jobs_run && config.jobs_run.length > 0
            ? config.jobs_run.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              )[0]
            : null;

        return {
          id: config.id,
          name: config.name,
          description: config.description,
          repositoryId: config.repository_id || '',
          teamId: config.team_id,
          tenantId: config.tenant_id,
          status: latestRun?.status || 'pending',
          userId: config.creator_id,
          // Convert snake_case to camelCase for dates
          createdAt: config.created_at,
          updatedAt: config.updated_at,
          startedAt: latestRun?.started_at || null,
          completedAt: latestRun?.completed_at || null,
          scheduledTime: config.scheduled_time || null,
          scheduleType: config.schedule_type || 'now',
          // Additional fields if needed
          scriptsPath: Array.isArray(config.scripts_path) ? config.scripts_path : [],
          scriptsParameters: Array.isArray(config.scripts_parameters)
            ? config.scripts_parameters
            : [],
          hostIds: Array.isArray(config.host_ids) ? config.host_ids : [],
          cronExpression: config.cron_expression,
          repeatCount: config.repeat_count,
          environmentVars: config.environment_vars || [],
        };
      }) || [];

    return { success: true, data: transformedData };
  } catch (error: any) {
    console.error('[@action:jobsAction:getAllJobs] Error:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function queueJobForExecution(
  configId: string,
  userId: string,
  overrideParameters?: Record<string, any>,
  cookieStore?: any,
) {
  try {
    console.log(
      `[@action:jobsAction:queueJobForExecution] Queueing job with config ID: "${configId}", userId: "${userId}"`,
    );

    if (!configId) {
      console.error('[@action:jobsAction:queueJobForExecution] ERROR: No config ID provided');
      return { success: false, error: 'No job configuration ID provided' };
    }

    if (!userId) {
      console.error('[@action:jobsAction:queueJobForExecution] ERROR: No user ID provided');
      return { success: false, error: 'No user ID provided' };
    }

    // First, get the job configuration
    const { getJobConfigById } = await import('@/lib/db/jobsConfigurationDb');
    const configResult = await getJobConfigById(configId, cookieStore);

    if (!configResult.success || !configResult.data) {
      console.error(
        '[@action:jobsAction:queueJobForExecution] ERROR: Failed to get job configuration:',
        configResult.error,
      );
      return { success: false, error: `Failed to get job configuration: ${configResult.error}` };
    }

    console.log(
      `[@action:jobsAction:queueJobForExecution] Found valid job configuration: ${configId}`,
    );

    // Create a new job run record
    const { runJob } = await import('@/lib/db/jobsRunDb');
    const jobRunResult = await runJob(configId, userId, cookieStore);

    if (!jobRunResult.success || !jobRunResult.data) {
      console.error(
        '[@action:jobsAction:queueJobForExecution] ERROR: Failed to create job run:',
        jobRunResult.error,
      );
      return { success: false, error: `Failed to create job run: ${jobRunResult.error}` };
    }

    console.log(
      `[@action:jobsAction:queueJobForExecution] Created job run: ${jobRunResult.data.id}`,
    );

    // Prepare the job payload for Redis
    const queuePayload = prepareJobForQueue(configResult.data, overrideParameters);

    // Add job run ID to the payload
    queuePayload.job_run_id = jobRunResult.data.id;

    try {
      // Push to Redis queue using LPUSH (adds to the left/beginning of the list)
      console.log(`[@action:jobsAction:queueJobForExecution] About to push job to Redis queue:`, {
        queue: JOBS_QUEUE,
        config_id: configId,
        job_run_id: jobRunResult.data.id,
        payload_size: payloadString.length,
      });

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
          status: 'pending', // Update status to pending
          execution_parameters: {
            queue: JOBS_QUEUE,
            priority: queuePayload.priority,
            override_parameters: overrideParameters || null,
          },
        },
        cookieStore,
      );

      console.log(
        `[@action:jobsAction:queueJobForExecution] Job successfully queued and run record updated: ${jobRunResult.data.id}`,
      );

      return {
        success: true,
        data: {
          job_run_id: jobRunResult.data.id,
          config_id: configId,
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
          config_id: configId,
          queue_error: redisError.message,
        },
        message: 'Job run created but failed to queue in Redis',
      };
    }
  } catch (error: any) {
    console.error('[@action:jobsAction:queueJobForExecution] CAUGHT ERROR:', {
      configId,
      userId,
      message: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message || 'Failed to queue job',
    };
  }
}
