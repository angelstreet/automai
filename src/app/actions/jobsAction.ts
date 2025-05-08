'use server';

import { Redis } from '@upstash/redis';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { createJobConfiguration } from '@/lib/db/jobsConfigurationDb';
import { JobConfiguration } from '@/types/component/jobConfigurationComponentType';

// Initialize Redis client using environment variables
// Works both in Vercel and locally when .env.local has the credentials
const redis_queue = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Helper function to get the queue name based on environment
function getQueueName(env = 'preprod') {
  const runnerEnv = env || 'preprod';
  return runnerEnv === 'prod' ? 'jobs_queue_prod' : 'jobs_queue_preprod';
}

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
      cron_expression: formData.cron_expression || null,
      repeat_count: formData.repeat_count || null,
      is_active: formData.is_active !== undefined ? formData.is_active : true,
      config: configJson,
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
      const jobRunResult = await startJob(jobConfigResult.data.id, formData.creator_id);

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

    // Revalidate the deployment pages after a successful creation
    revalidatePath('/[locale]/[tenant]/deployment');

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
export async function startJob(configId: string, userId: string) {
  try {
    console.log(`[@action:jobsAction:startJob] Queueing job with config ID: "${configId}"`);

    if (!configId) {
      console.error('[@action:jobsAction:startJob] ERROR: No config ID provided');
      return {
        success: false,
        error: 'No job configuration ID provided',
      };
    }

    // Proceed with job queuing
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

    // Determine the environment from the job configuration
    const jobEnv = jobConfigResult.data.config?.env || 'preprod';

    // Use the appropriate queue based on the job's environment
    const queueName = getQueueName(jobEnv);
    console.log(
      `[@action:jobsAction:startJob] Using queue: ${queueName} for job with env: ${jobEnv}`,
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
    console.log(`[@action:jobsAction:startJob] About to push job to Redis queue ${queueName}:`, {
      queue: queueName,
      payload: queuePayload,
    });

    const redisResult = await redis_queue.lpush(queueName, payloadString);

    // Return success with queue information
    return {
      success: true,
      data: {
        queued: true,
        queue: queueName,
        timestamp: queuePayload.timestamp,
        redis_result: redisResult,
      },
    };
  } catch (error: any) {
    console.error('[@action:jobsAction:startJob] ERROR:', error.message);
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

    console.log(`[@action:jobsAction:deleteJob] Job deletion successful: ${id}`);

    // Revalidate the deployment pages after a successful deletion
    revalidatePath('/[locale]/[tenant]/deployment', 'page');

    return {
      success: true,
    };
  } catch (error: any) {
    console.error(`[@action:jobsAction:deleteJob] Error: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to delete job',
    };
  }
}

/**
 * Get all job configurations (replacements for deployments)
 * @param providedUser Optional user object to avoid redundant getUser calls
 */
export async function getAllJobs(providedUser?: any) {
  try {
    console.log('[@action:jobsAction:getAllJobs] Getting all job configurations');
    const cookieStore = await cookies();

    // Get current user or use provided user
    let user = providedUser;
    if (!user) {
      console.log('[@action:jobsAction:getAllJobs] No user provided, fetching user data');
      const { getUser } = await import('@/app/actions/userAction');
      user = await getUser();
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
        // Ensure proper sorting by created_at timestamp in descending order (newest first)
        // Use non-mutating approach with a new array to avoid issues
        const latestRun =
          config.jobs_run && config.jobs_run.length > 0
            ? [...config.jobs_run].sort((a: any, b: any) => {
                const timeA = new Date(a.created_at).getTime();
                const timeB = new Date(b.created_at).getTime();
                return timeB - timeA; // Descending order - newer runs first
              })[0]
            : null;

        // Log to debug the sorting
        if (config.jobs_run && config.jobs_run.length > 1) {
          console.log(
            `[@action:jobsAction:getAllJobs] Found ${config.jobs_run.length} runs for job '${config.name}'`,
          );
          console.log(`[@action:jobsAction:getAllJobs] Latest run: ${latestRun?.created_at}`);
        }

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
          scheduledTime: config.schedule_type || 'now',
          scheduleType: config.schedule_type || 'now',
          // Add report_url from latestRun
          report_url: latestRun?.report_url || null,
          // Additional fields if needed
          scriptsPath: Array.isArray(config.scripts_path) ? config.scripts_path : [],
          scriptsParameters: Array.isArray(config.scripts_parameters)
            ? config.scripts_parameters
            : [],
          hostIds: Array.isArray(config.host_ids) ? config.host_ids : [],
          cronExpression: config.cron_expression,
          repeatCount: config.repeat_count,
          environmentVars: config.environment_vars || [],
          // Add config field
          config: config.config || {},
          // Add is_active field from the database
          is_active: config.is_active,
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

    // Transform job runs to desired format with null check
    const transformedJobRuns =
      jobRunsResult.data?.map((run) => ({
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
        // Add the config name for reference with null check
        configName: configResult.data?.name || 'Unknown',
      })) || [];

    console.log(
      `[@action:jobsAction:getJobRunsForConfig] Successfully fetched ${transformedJobRuns.length} job runs`,
    );

    return {
      success: true,
      data: transformedJobRuns,
      configName: configResult.data?.name || 'Unknown',
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
 * Updates a job configuration
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
    console.log(`[@action:jobsAction:updateJob] Updating job with ID: ${id}`);
    console.log(`[@action:jobsAction:updateJob] Update data:`, data);

    const cookieStore = await cookies();
    const { updateJobConfiguration } = await import('@/lib/db/jobsConfigurationDb');
    const result = await updateJobConfiguration(id, data, cookieStore);

    if (result.success) {
      console.log(`[@action:jobsAction:updateJob] Successfully updated job: ${id}`);

      // Revalidate the deployment pages after a successful update
      revalidatePath('/[locale]/[tenant]/deployment', 'page');
    } else {
      console.error(`[@action:jobsAction:updateJob] Failed to update job: ${result.error}`);
    }

    return result;
  } catch (error: any) {
    console.error(`[@action:jobsAction:updateJob] Error: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to update job',
    };
  }
}

/**
 * Server action to refresh deployments data
 * This is called from client components to invalidate the deployment pages cache
 */
export async function refreshDeployments() {
  try {
    // Revalidate the main deployments page
    console.log(
      '[@action:jobsAction:refreshDeployments] Calling revalidatePath for /[locale]/[tenant]/deployment',
    );
    revalidatePath('/[locale]/[tenant]/deployment', 'page');
    return { success: true };
  } catch (error) {
    console.error('[@action:jobsAction:refreshDeployments] ERROR during revalidation:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Revalidate a specific deployment job run page
 */
export async function refreshDeploymentJobRun(deploymentId: string) {
  console.log(
    `[@action:jobsAction:refreshDeploymentJobRun] Revalidating job run page for deployment: ${deploymentId}`,
  );

  // Revalidate the specific job run page
  revalidatePath(`/[locale]/[tenant]/deployment/job-runs/${deploymentId}`, 'page');

  // Also revalidate the main deployments page
  revalidatePath('/[locale]/[tenant]/deployment', 'page');

  return { success: true };
}

/**
 * Duplicates an existing deployment by creating a new one with '_copy' appended to the name
 */
export async function duplicateDeployment(deploymentId: string) {
  try {
    console.log(
      `[@action:jobsAction:duplicateDeployment] Duplicating deployment with ID: "${deploymentId}"`,
    );

    if (!deploymentId) {
      console.error('[@action:jobsAction:duplicateDeployment] ERROR: No deployment ID provided');
      return {
        success: false,
        error: 'No deployment ID provided',
      };
    }

    const cookieStore = await cookies();
    const { getJobConfigById } = await import('@/lib/db/jobsConfigurationDb');
    const existingDeploymentResult = await getJobConfigById(deploymentId, cookieStore);

    if (!existingDeploymentResult.success || !existingDeploymentResult.data) {
      console.error(
        '[@action:jobsAction:duplicateDeployment] ERROR: Failed to fetch existing deployment:',
        existingDeploymentResult.error,
      );
      return {
        success: false,
        error: 'Failed to fetch existing deployment',
      };
    }

    const existingDeployment = existingDeploymentResult.data;
    const newName = `${existingDeployment.name}_copy`;

    console.log(
      `[@action:jobsAction:duplicateDeployment] Creating new deployment with name: "${newName}"`,
    );

    const formData: JobFormData = {
      name: newName,
      description: existingDeployment.description || undefined,
      team_id: existingDeployment.team_id,
      creator_id: existingDeployment.creator_id,
      cron_expression: existingDeployment.cron_expression || undefined,
      repeat_count: existingDeployment.repeat_count || undefined,
      is_active: existingDeployment.is_active || false,
      config: existingDeployment.config || {},
      created_at: new Date().toISOString(),
      scripts_path: [],
      host_ids: [],
    };

    const newDeploymentResult = await createJob(formData);

    if (!newDeploymentResult.success || !newDeploymentResult.data) {
      console.error(
        '[@action:jobsAction:duplicateDeployment] ERROR: Failed to create duplicated deployment:',
        newDeploymentResult.error,
      );
      return {
        success: false,
        error: 'Failed to create duplicated deployment',
      };
    }

    console.log(
      `[@action:jobsAction:duplicateDeployment] Successfully duplicated deployment with new ID: "${newDeploymentResult.data.id}"`,
    );

    revalidatePath('/[locale]/[tenant]/deployment', 'page');

    return {
      success: true,
      data: newDeploymentResult.data,
    };
  } catch (error: any) {
    console.error('[@action:jobsAction:duplicateDeployment] Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to duplicate deployment',
    };
  }
}

/**
 * Toggle the active status of a job
 */
export async function toggleJobActiveStatus(id: string, isActive: boolean) {
  try {
    console.log(
      `[@action:jobsAction:toggleJobActiveStatus] Toggling job with ID: "${id}" to ${isActive ? 'active' : 'inactive'}`,
    );

    if (!id) {
      console.error('[@action:jobsAction:toggleJobActiveStatus] ERROR: No job ID provided');
      return {
        success: false,
        error: 'No job ID provided',
      };
    }

    const cookieStore = await cookies();
    const { updateJobConfiguration } = await import('@/lib/db/jobsConfigurationDb');

    // Update only the is_active field
    const result = await updateJobConfiguration(id, { is_active: isActive }, cookieStore);

    if (result.success) {
      console.log(
        `[@action:jobsAction:toggleJobActiveStatus] Successfully ${isActive ? 'enabled' : 'disabled'} job: ${id}`,
      );

      // Revalidate the deployment pages after a successful update
      revalidatePath('/[locale]/[tenant]/deployment', 'page');
    } else {
      console.error(
        `[@action:jobsAction:toggleJobActiveStatus] Failed to toggle job status: ${result.error}`,
      );
    }

    return result;
  } catch (error: any) {
    console.error(`[@action:jobsAction:toggleJobActiveStatus] Error: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to toggle job status',
    };
  }
}
