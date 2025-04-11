/**
 * Job Runs Database Layer
 * Handles database operations for job runs
 */
import { createClient } from '@/lib/supabase/server';
import { DbResponse } from '@/lib/utils/commonUtils';
import { JobRun } from '@/types/component/jobConfigurationComponentType';

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
  getLatestJobRun,
};

export default jobsRunDb;
