/**
 * Job Runs Database Layer
 * Handles database operations for job runs
 */
import { createClient } from '@/lib/supabase/server';
import { DbResponse } from '@/lib/utils/commonUtils';
import { JobRun, JobRunStatus } from '@/types/component/jobConfigurationComponentType';
import { getJobConfigById } from './jobsConfigurationDb';

/**
 * Get job runs by configuration ID
 */
export async function getJobRunsByConfigId(
  configId: string,
  cookieStore?: any,
): Promise<DbResponse<JobRun[]>> {
  try {
    console.log(`[@db:jobsRunDb:getJobRunsByConfigId] Fetching job runs for config: ${configId}`);
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('jobs_run')
      .select('*')
      .eq('config_id', configId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[@db:jobsRunDb:getJobRunsByConfigId] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(
      `[@db:jobsRunDb:getJobRunsByConfigId] Successfully fetched ${data.length} job runs`,
    );
    return { success: true, data };
  } catch (error: any) {
    console.error(`[@db:jobsRunDb:getJobRunsByConfigId] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to get job runs' };
  }
}

/**
 * Get job runs by team ID
 */
export async function getJobRunsByTeamId(
  teamId: string,
  cookieStore?: any,
): Promise<DbResponse<JobRun[]>> {
  try {
    console.log(`[@db:jobsRunDb:getJobRunsByTeamId] Fetching job runs for team: ${teamId}`);
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('jobs_run')
      .select('*, jobs_configuration!inner(*)')
      .eq('jobs_configuration.team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[@db:jobsRunDb:getJobRunsByTeamId] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`[@db:jobsRunDb:getJobRunsByTeamId] Successfully fetched ${data.length} job runs`);
    return { success: true, data };
  } catch (error: any) {
    console.error(`[@db:jobsRunDb:getJobRunsByTeamId] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to get job runs' };
  }
}

/**
 * Get a job run by ID
 */
export async function getJobRunById(id: string, cookieStore?: any): Promise<DbResponse<JobRun>> {
  try {
    console.log(`[@db:jobsRunDb:getJobRunById] Fetching job run: ${id}`);
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('jobs_run')
      .select('*, jobs_configuration(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`[@db:jobsRunDb:getJobRunById] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`[@db:jobsRunDb:getJobRunById] Successfully fetched job run`);
    return { success: true, data };
  } catch (error: any) {
    console.error(`[@db:jobsRunDb:getJobRunById] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to get job run' };
  }
}

/**
 * Create a new job run
 */
export async function createJobRun(
  jobRun: Partial<JobRun>,
  cookieStore?: any,
): Promise<DbResponse<JobRun>> {
  try {
    console.log(`[@db:jobsRunDb:createJobRun] Creating job run for config: ${jobRun.config_id}`);
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase.from('jobs_run').insert([jobRun]).select().single();

    if (error) {
      console.error(`[@db:jobsRunDb:createJobRun] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`[@db:jobsRunDb:createJobRun] Successfully created job run: ${data.id}`);
    return { success: true, data };
  } catch (error: any) {
    console.error(`[@db:jobsRunDb:createJobRun] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to create job run' };
  }
}

/**
 * Update a job run
 */
export async function updateJobRun(
  id: string,
  jobRun: Partial<JobRun>,
  cookieStore?: any,
): Promise<DbResponse<JobRun>> {
  try {
    console.log(`[@db:jobsRunDb:updateJobRun] Updating job run: ${id}`);
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('jobs_run')
      .update(jobRun)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[@db:jobsRunDb:updateJobRun] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`[@db:jobsRunDb:updateJobRun] Successfully updated job run: ${id}`);
    return { success: true, data };
  } catch (error: any) {
    console.error(`[@db:jobsRunDb:updateJobRun] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to update job run' };
  }
}

/**
 * Update job run status
 */
export async function updateJobRunStatus(
  id: string,
  status: JobRunStatus,
  cookieStore?: any,
): Promise<DbResponse<JobRun>> {
  try {
    console.log(`[@db:jobsRunDb:updateJobRunStatus] Updating job run ${id} status to: ${status}`);
    const supabase = await createClient(cookieStore);

    // Update timestamps based on status
    const updates: any = { status };

    if (status === 'running') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('jobs_run')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[@db:jobsRunDb:updateJobRunStatus] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(
      `[@db:jobsRunDb:updateJobRunStatus] Successfully updated job run status to: ${status}`,
    );
    return { success: true, data };
  } catch (error: any) {
    console.error(`[@db:jobsRunDb:updateJobRunStatus] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to update job run status' };
  }
}

/**
 * Delete a job run
 */
export async function deleteJobRun(id: string, cookieStore?: any): Promise<DbResponse<null>> {
  try {
    console.log(`[@db:jobsRunDb:deleteJobRun] Deleting job run: ${id}`);
    const supabase = await createClient(cookieStore);

    const { error } = await supabase.from('jobs_run').delete().eq('id', id);

    if (error) {
      console.error(`[@db:jobsRunDb:deleteJobRun] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`[@db:jobsRunDb:deleteJobRun] Successfully deleted job run: ${id}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[@db:jobsRunDb:deleteJobRun] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to delete job run' };
  }
}

/**
 * Runs a job based on job configuration
 */
export async function runJob(
  configId: string,
  userId: string, // Keep for audit purposes, but we'll use team_id and tenant_id from config
  cookieStore?: any,
): Promise<DbResponse<JobRun>> {
  try {
    console.log(`[@db:jobsRunDb:runJob] Starting job run for config: ${configId}`);

    // First, get the job configuration
    const { getJobConfigById } = await import('./jobsConfigurationDb');
    const configResult = await getJobConfigById(configId, cookieStore);

    if (!configResult.success) {
      return { success: false, error: `Failed to get job configuration: ${configResult.error}` };
    }

    const config = configResult.data;

    // Create a job run record
    const jobRun: Partial<JobRun> = {
      config_id: configId,
      team_id: config.team_id,
      tenant_id: config.tenant_id,
      status: JobRunStatus.PENDING,
      created_at: new Date().toISOString(),
      output: null,
      logs: null,
      execution_parameters: {
        triggered_by_user_id: userId, // Store the user who triggered the job
      },
    };

    // First, create the job run
    const createResult = await createJobRun(jobRun, cookieStore);
    if (!createResult.success) {
      return { success: false, error: `Failed to create job run: ${createResult.error}` };
    }

    // Get the created job run
    const jobRunId = createResult.data.id;

    // Update the job run status to RUNNING
    const updateResult = await updateJobRunStatus(jobRunId, JobRunStatus.RUNNING, cookieStore);

    if (!updateResult.success) {
      console.error(
        `[@db:jobsRunDb:runJob] Failed to update job run status: ${updateResult.error}`,
      );
      // Don't fail the operation, just log the error
    }

    // Return the created job run
    return { success: true, data: createResult.data };
  } catch (error: any) {
    console.error(`[@db:jobsRunDb:runJob] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to run job' };
  }
}

/**
 * Get the latest job run for a configuration
 */
export async function getLatestJobRun(
  configId: string,
  cookieStore?: any,
): Promise<DbResponse<JobRun>> {
  try {
    console.log(`[@db:jobsRunDb:getLatestJobRun] Fetching latest job run for config: ${configId}`);
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('jobs_run')
      .select('*')
      .eq('config_id', configId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no records found, return success with null data
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }

      console.error(`[@db:jobsRunDb:getLatestJobRun] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`[@db:jobsRunDb:getLatestJobRun] Successfully fetched latest job run`);
    return { success: true, data };
  } catch (error: any) {
    console.error(`[@db:jobsRunDb:getLatestJobRun] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to get latest job run' };
  }
}

// Default export for all job run database operations
const jobsRunDb = {
  getJobRunsByConfigId,
  getJobRunsByTeamId,
  getJobRunById,
  createJobRun,
  updateJobRun,
  updateJobRunStatus,
  deleteJobRun,
  runJob,
  getLatestJobRun,
};

export default jobsRunDb;
