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
      const jobRunResult = await startJob(
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

/**
 * Get job runs for a specific job configuration
 */
export async function getJobRunsForConfig(configId: string) {
  try {
    console.log(
      `[@action:jobsAction:getJobRunsForConfig] Getting job runs for config: ${configId}`,
    );

    if (!configId) {
      console.error('[@action:jobsAction:getJobRunsForConfig] ERROR: No config ID provided');
      return { success: false, error: 'No job configuration ID provided', data: [] };
    }

    const cookieStore = await cookies();

    // Get the job configuration to ensure it exists and to get details
    const { getJobConfigById } = await import('@/lib/db/jobsConfigurationDb');
    const configResult = await getJobConfigById(configId, cookieStore);

    if (!configResult.success) {
      console.error(
        '[@action:jobsAction:getJobRunsForConfig] ERROR: Failed to get job configuration:',
        configResult.error,
      );
      return {
        success: false,
        error: `Failed to get job configuration: ${configResult.error}`,
        data: [],
      };
    }

    // Get all job runs for this configuration
    const { getJobRunsByConfigId } = await import('@/lib/db/jobsRunDb');
    const jobRunsResult = await getJobRunsByConfigId(configId, cookieStore);

    if (!jobRunsResult.success) {
      console.error(
        '[@action:jobsAction:getJobRunsForConfig] ERROR: Failed to get job runs:',
        jobRunsResult.error,
      );
      return { success: false, error: `Failed to get job runs: ${jobRunsResult.error}`, data: [] };
    }

    // Transform job runs to desired format if needed
    const transformedJobRuns = jobRunsResult.data.map((run) => ({
      id: run.id,
      configId: run.config_id,
      status: run.status,
      output: run.output,
      logs: run.logs,
      error: run.error,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      queuedAt: run.queued_at,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      executionParameters: run.execution_parameters,
      scheduledTime: run.scheduled_time,
      workerId: run.worker_id,
      executionAttempt: run.execution_attempt,
      executionNumber: run.execution_number,
      // Add the config name for reference
      configName: configResult.data.name,
    }));

    console.log(
      `[@action:jobsAction:getJobRunsForConfig] Successfully fetched ${transformedJobRuns.length} job runs`,
    );

    return {
      success: true,
      data: transformedJobRuns,
      configName: configResult.data.name,
    };
  } catch (error: any) {
    console.error('[@action:jobsAction:getJobRunsForConfig] CAUGHT ERROR:', {
      configId,
      message: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message || 'Failed to get job runs',
      data: [],
    };
  }
}

/**
 * Update a job configuration
 * @param id Job configuration ID
 * @param data Partial job data to update
 * @returns Success status and updated job data or error
 */
export async function updateJob(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    config: Record<string, any>;
  }>,
) {
  try {
    console.log(`[@action:jobsAction:updateJob] Updating job with ID: "${id}"`);

    if (!id) {
      console.error('[@action:jobsAction:updateJob] ERROR: No job ID provided');
      return {
        success: false,
        error: 'No job ID provided',
      };
    }

    // Get cookie store
    const cookieStore = await cookies();

    // Get current job configuration
    const { getJobConfigById, updateJobConfiguration } = await import(
      '@/lib/db/jobsConfigurationDb'
    );
    const jobConfigResult = await getJobConfigById(id, cookieStore);

    if (!jobConfigResult.success || !jobConfigResult.data) {
      console.error(`[@action:jobsAction:updateJob] Job not found: ${id}`);
      return {
        success: false,
        error: 'Job not found',
      };
    }

    const currentConfig = jobConfigResult.data;

    // Create update data
    const updateData: Partial<JobConfiguration> = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.config !== undefined && { config: data.config }),
    };

    // Log the update data
    console.log(`[@action:jobsAction:updateJob] Update data:`, {
      id,
      fields: Object.keys(updateData),
      hasConfig: !!data.config,
    });

    // Update the job configuration
    console.log(`[@action:jobsAction:updateJob] Updating job configuration: ${id}`);
    const updateResult = await updateJobConfiguration(id, updateData, cookieStore);

    if (!updateResult.success) {
      console.error(`[@action:jobsAction:updateJob] Update failed: ${updateResult.error}`);
      return {
        success: false,
        error: updateResult.error || 'Failed to update job',
      };
    }

    // Revalidate the path to refresh UI
    revalidatePath('/[locale]/[tenant]/deployment', 'page');

    console.log(`[@action:jobsAction:updateJob] Update successful`);
    return {
      success: true,
      data: updateResult.data,
    };
  } catch (error: any) {
    console.error('[@action:jobsAction:updateJob] Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to update job',
    };
  }
}
