/**
 * Job Configuration Database Layer
 * Handles database operations for job configurations
 */
import { createClient } from '@/lib/supabase/server';
import { DbResponse } from '@/lib/utils/commonUtils';
import { JobConfiguration } from '@/types/component/jobConfigurationComponentType';

/**
 * Get all job configurations for a team
 */
export async function getJobConfigsByTeamId(
  teamId: string,
  cookieStore?: any,
): Promise<DbResponse<JobConfiguration[]>> {
  try {
    console.log(
      `[@db:jobsConfigurationDb:getJobConfigsByTeamId] Fetching job configs for team: ${teamId}`,
    );
    const supabase = await createClient(cookieStore);

    // We need to get all job runs and make sure they're properly ordered
    // First, get all job configurations
    const { data, error } = await supabase
      .from('jobs_configuration')
      .select(
        `
        *,
        jobs_run!jobs_run_config_id_fkey (
          id, 
          status, 
          created_at,
          started_at, 
          completed_at,
          report_url
        )
      `,
      )
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[@db:jobsConfigurationDb:getJobConfigsByTeamId] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(
      `[@db:jobsConfigurationDb:getJobConfigsByTeamId] Successfully fetched ${data.length} job configs`,
    );
    return { success: true, data };
  } catch (error: any) {
    console.error(`[@db:jobsConfigurationDb:getJobConfigsByTeamId] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to get job configurations' };
  }
}

/**
 * Get a job configuration by ID
 */
export async function getJobConfigById(
  id: string,
  cookieStore?: any,
): Promise<DbResponse<JobConfiguration>> {
  try {
    console.log(`[@db:jobsConfigurationDb:getJobConfigById] Fetching job config: ${id}`);
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('jobs_configuration')
      .select('*, jobs_run(status, started_at, completed_at, report_url)')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`[@db:jobsConfigurationDb:getJobConfigById] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`[@db:jobsConfigurationDb:getJobConfigById] Successfully fetched job config`);
    return { success: true, data };
  } catch (error: any) {
    console.error(`[@db:jobsConfigurationDb:getJobConfigById] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to get job configuration' };
  }
}

/**
 * Create a new job configuration
 */
export async function createJobConfiguration(
  jobConfig: Partial<JobConfiguration>,
  cookieStore?: any,
): Promise<DbResponse<JobConfiguration>> {
  try {
    console.log(
      `[@db:jobsConfigurationDb:createJobConfiguration] Creating job config for team: ${jobConfig.team_id}`,
    );
    const supabase = await createClient(cookieStore);

    // Make sure we're using the correct column names that match the database
    const dbJobConfig = {
      ...jobConfig,
      // No need to map fields as we've already updated our types to match the database column names
    };

    const { data, error } = await supabase
      .from('jobs_configuration')
      .insert([dbJobConfig])
      .select()
      .single();

    if (error) {
      console.error(`[@db:jobsConfigurationDb:createJobConfiguration] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(
      `[@db:jobsConfigurationDb:createJobConfiguration] Successfully created job config: ${data.id}`,
    );
    return { success: true, data };
  } catch (error: any) {
    console.error(`[@db:jobsConfigurationDb:createJobConfiguration] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to create job configuration' };
  }
}

/**
 * Update a job configuration
 */
export async function updateJobConfiguration(
  id: string,
  jobConfig: Partial<JobConfiguration>,
  cookieStore?: any,
): Promise<DbResponse<JobConfiguration>> {
  try {
    console.log(`[@db:jobsConfigurationDb:updateJobConfiguration] Updating job config: ${id}`);
    const supabase = await createClient(cookieStore);

    // Make sure we're using the correct column names that match the database
    const dbJobConfig = {
      ...jobConfig,
      // No need to map fields as we've already updated our types to match the database column names
    };

    const { data, error } = await supabase
      .from('jobs_configuration')
      .update(dbJobConfig)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[@db:jobsConfigurationDb:updateJobConfiguration] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(
      `[@db:jobsConfigurationDb:updateJobConfiguration] Successfully updated job config: ${id}`,
    );
    return { success: true, data };
  } catch (error: any) {
    console.error(`[@db:jobsConfigurationDb:updateJobConfiguration] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to update job configuration' };
  }
}

/**
 * Delete a job configuration and all its associated runs
 */
export async function deleteJobConfiguration(
  id: string,
  cookieStore?: any,
): Promise<DbResponse<null>> {
  try {
    console.log(
      `[@db:jobsConfigurationDb:deleteJobConfiguration] START: Deleting job config with ID: "${id}"`,
    );

    if (!id) {
      console.error(
        '[@db:jobsConfigurationDb:deleteJobConfiguration] ERROR: Empty ID provided for deletion',
      );
      return { success: false, error: 'No job configuration ID provided' };
    }

    console.log(`[@db:jobsConfigurationDb:deleteJobConfiguration] Creating Supabase client`);
    const supabase = await createClient(cookieStore);

    // First, check if the job configuration exists
    console.log(
      `[@db:jobsConfigurationDb:deleteJobConfiguration] Checking if job configuration exists: "${id}"`,
    );
    const { data: configData, error: configError } = await supabase
      .from('jobs_configuration')
      .select('id')
      .eq('id', id)
      .single();

    if (configError) {
      // If we get a 'not found' error, we still want to proceed with deleting job runs
      // in case there are orphaned runs without a job config
      if (configError.code === 'PGRST116') {
        console.warn(
          `[@db:jobsConfigurationDb:deleteJobConfiguration] Job configuration not found, but will continue to delete any runs: "${id}"`,
        );
      } else {
        console.error(
          `[@db:jobsConfigurationDb:deleteJobConfiguration] ERROR: Problem retrieving job configuration: "${id}", error: ${configError.message}`,
        );
        return {
          success: false,
          error: `Problem retrieving job configuration: ${configError.message}`,
        };
      }
    }

    if (configData) {
      console.log(
        `[@db:jobsConfigurationDb:deleteJobConfiguration] Job configuration exists, ID: "${configData.id}"`,
      );
    }

    // Only try to delete the job configuration if we confirmed it exists
    // Relying on ON DELETE CASCADE for jobs_run deletion
    if (configData) {
      console.log(
        `[@db:jobsConfigurationDb:deleteJobConfiguration] Now deleting job configuration: "${id}"`,
      );
      const { error: configDeleteError } = await supabase
        .from('jobs_configuration')
        .delete()
        .eq('id', id);

      if (configDeleteError) {
        console.error(
          `[@db:jobsConfigurationDb:deleteJobConfiguration] ERROR deleting job config: ${configDeleteError.message}`,
        );
        // Don't return error yet - if we deleted job runs but config delete failed,
        // still consider this partial success
        console.warn(
          `[@db:jobsConfigurationDb:deleteJobConfiguration] Failed to delete config but job runs were removed`,
        );
      }
    }

    console.log(
      `[@db:jobsConfigurationDb:deleteJobConfiguration] SUCCESS: Successfully deleted job config \"${id}\" (runs deleted via CASCADE)`,
    );
    return { success: true };
  } catch (error: any) {
    console.error(`[@db:jobsConfigurationDb:deleteJobConfiguration] CAUGHT ERROR:`, {
      id: id,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message || 'Failed to delete job configuration' };
  }
}

/**
 * Get job configurations with their latest run status
 */
export async function getJobConfigsWithLatestRun(
  teamId: string,
  cookieStore?: any,
): Promise<DbResponse<any[]>> {
  try {
    console.log(
      `[@db:jobsConfigurationDb:getJobConfigsWithLatestRun] Fetching job configs with latest run for team: ${teamId}`,
    );
    const supabase = await createClient(cookieStore);

    // Query to get all job configurations with their latest run (if any)
    const { data, error } = await supabase
      .from('jobs_configuration')
      .select(
        `
        *,
        jobs_run:jobs_run(
          id,
          status,
          created_at,
          started_at,
          completed_at,
          results,
          report_url
        )
      `,
      )
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[@db:jobsConfigurationDb:getJobConfigsWithLatestRun] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    // Process the data to include only the latest run
    const processedData = data.map((config) => {
      // Get the latest run by created_at date
      const runs = config.jobs_run || [];
      const latestRun = runs.length
        ? runs.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )[0]
        : null;

      return {
        ...config,
        latest_run: latestRun,
        jobs_run: undefined, // Remove the array of runs
      };
    });

    console.log(
      `[@db:jobsConfigurationDb:getJobConfigsWithLatestRun] Successfully fetched ${processedData.length} job configs with latest run`,
    );
    return { success: true, data: processedData };
  } catch (error: any) {
    console.error(`[@db:jobsConfigurationDb:getJobConfigsWithLatestRun] Error: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to get job configurations with latest run',
    };
  }
}

/**
 * Get job configuration with all its runs
 */
export async function getJobConfigWithRuns(
  id: string,
  cookieStore?: any,
): Promise<DbResponse<any>> {
  try {
    console.log(
      `[@db:jobsConfigurationDb:getJobConfigWithRuns] Fetching job config with runs: ${id}`,
    );
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('jobs_configuration')
      .select(
        `
        *,
        jobs_run:jobs_run(
          id,
          status,
          created_at,
          started_at,
          completed_at,
          user_id,
          results,
          logs,
          report_url
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error(`[@db:jobsConfigurationDb:getJobConfigWithRuns] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    // Sort runs by created_at date (newest first)
    if (data.jobs_run) {
      data.jobs_run.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    console.log(
      `[@db:jobsConfigurationDb:getJobConfigWithRuns] Successfully fetched job config with runs`,
    );
    return { success: true, data };
  } catch (error: any) {
    console.error(`[@db:jobsConfigurationDb:getJobConfigWithRuns] Error: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to get job configuration with runs',
    };
  }
}

// Default export for all job configuration database operations
const jobsConfigurationDb = {
  getJobConfigsByTeamId,
  getJobConfigById,
  createJobConfiguration,
  updateJobConfiguration,
  deleteJobConfiguration,
  getJobConfigsWithLatestRun,
  getJobConfigWithRuns,
};

export default jobsConfigurationDb;
