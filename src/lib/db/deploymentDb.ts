/**
 * Deployment Database Layer
 * Handles database operations for deployments
 *
 * Note: This file is kept for backward compatibility and will be phased out.
 * New code should use jobsConfigurationDb.ts and jobsRunDb.ts directly.
 */
import { createClient } from '@/lib/supabase/server';
import { DbResponse } from '@/lib/utils/commonUtils';
import { Deployment, DeploymentStatus } from '@/types/component/deploymentComponentType';
import { createJobConfiguration } from './jobsConfigurationDb';
import { createJobRun, runJob } from './jobsRunDb';

/**
 * Get all deployments for a team
 */
export async function getDeployments(
  teamId: string,
  cookieStore?: any,
): Promise<DbResponse<Deployment[]>> {
  try {
    console.log(`[@db:deploymentDb:getDeployments] Fetching deployments for team: ${teamId}`);
    const supabase = await createClient(cookieStore);

    // Now fetching from jobs_configuration instead of deployments
    const { data, error } = await supabase
      .from('jobs_configuration')
      .select('*, jobs_run(status, started_at, completed_at)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[@db:deploymentDb:getDeployments] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    // Transform the jobs_configuration data to match the expected deployment format
    const transformedData = data.map((config) => {
      // Find the latest run if any
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
        team_id: config.team_id,
        tenant_id: config.tenant_id,
        configuration: config.configuration_parameters,
        status: latestRun?.status || 'idle',
        created_at: config.created_at,
        updated_at: config.updated_at,
        started_at: latestRun?.started_at || null,
        completed_at: latestRun?.completed_at || null,
        // Keep other fields needed by the UI
      };
    });

    console.log(
      `[@db:deploymentDb:getDeployments] Successfully fetched ${transformedData.length} deployments`,
    );
    return { success: true, data: transformedData };
  } catch (error: any) {
    console.error(`[@db:deploymentDb:getDeployments] Error: ${error.message}`);
    return { success: false, error: error.message || 'Failed to get deployments' };
  }
}

/**
 * Get a deployment by ID
 */
export async function getDeploymentById(
  id: string,
  cookieStore?: any,
): Promise<DbResponse<Deployment>> {
  try {
    const supabase = await createClient(cookieStore);

    // Now fetching from jobs_configuration instead of deployments
    const { data, error } = await supabase
      .from('jobs_configuration')
      .select('*, jobs_run(status, started_at, completed_at)')
      .eq('id', id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Transform the job configuration to match the expected deployment format
    const latestRun =
      data.jobs_run && data.jobs_run.length > 0
        ? data.jobs_run.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )[0]
        : null;

    const transformedData = {
      id: data.id,
      name: data.name,
      description: data.description,
      team_id: data.team_id,
      tenant_id: data.tenant_id,
      configuration: data.configuration_parameters,
      status: latestRun?.status || 'idle',
      created_at: data.created_at,
      updated_at: data.updated_at,
      started_at: latestRun?.started_at || null,
      completed_at: latestRun?.completed_at || null,
      // Keep other fields needed by the UI
    };

    return { success: true, data: transformedData };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get deployment' };
  }
}

/**
 * Create a new deployment
 */
export async function createDeployment(
  deployment: Partial<Deployment>,
  cookieStore?: any,
): Promise<DbResponse<Deployment>> {
  try {
    // Convert deployment to job configuration format
    const jobConfig = {
      name: deployment.name || '',
      description: deployment.description || '',
      team_id: deployment.team_id,
      tenant_id: deployment.tenant_id,
      configuration_parameters: deployment.configuration || {},
      job_type: 'deployment', // Mark this as a deployment type job
      // Add any other required fields
    };

    // Use the job configuration DB layer to create the record
    const result = await createJobConfiguration(jobConfig, cookieStore);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Transform the response back to deployment format
    const transformedData = {
      id: result.data.id,
      name: result.data.name,
      description: result.data.description,
      team_id: result.data.team_id,
      tenant_id: result.data.tenant_id,
      configuration: result.data.configuration_parameters,
      status: 'idle',
      created_at: result.data.created_at,
      updated_at: result.data.updated_at,
      // Add other fields as needed
    };

    return { success: true, data: transformedData };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create deployment' };
  }
}

/**
 * Update a deployment
 */
export async function updateDeployment(
  id: string,
  deployment: Partial<Deployment>,
  cookieStore?: any,
): Promise<DbResponse<Deployment>> {
  try {
    const supabase = await createClient(cookieStore);

    // Convert deployment to job configuration format
    const jobConfig: any = {};

    if (deployment.name !== undefined) jobConfig.name = deployment.name;
    if (deployment.description !== undefined) jobConfig.description = deployment.description;
    if (deployment.configuration !== undefined)
      jobConfig.configuration_parameters = deployment.configuration;
    // Map other fields as needed

    // Update in jobs_configuration table
    const { data, error } = await supabase
      .from('jobs_configuration')
      .update(jobConfig)
      .eq('id', id)
      .select('*, jobs_run(status, started_at, completed_at)')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Transform the job configuration to match the expected deployment format
    const latestRun =
      data.jobs_run && data.jobs_run.length > 0
        ? data.jobs_run.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )[0]
        : null;

    const transformedData = {
      id: data.id,
      name: data.name,
      description: data.description,
      team_id: data.team_id,
      tenant_id: data.tenant_id,
      configuration: data.configuration_parameters,
      status: latestRun?.status || 'idle',
      created_at: data.created_at,
      updated_at: data.updated_at,
      started_at: latestRun?.started_at || null,
      completed_at: latestRun?.completed_at || null,
      // Keep other fields needed by the UI
    };

    return { success: true, data: transformedData };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update deployment' };
  }
}

/**
 * Update deployment status
 */
export async function updateDeploymentStatus(
  id: string,
  status: DeploymentStatus,
  cookieStore?: any,
): Promise<DbResponse<Deployment>> {
  try {
    const supabase = await createClient(cookieStore);

    // First, get the latest job run for this configuration
    const { data: runsData, error: runsError } = await supabase
      .from('jobs_run')
      .select('*')
      .eq('config_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (runsError) {
      return { success: false, error: runsError.message };
    }

    // If we have a run, update its status
    if (runsData && runsData.length > 0) {
      const runId = runsData[0].id;
      const { error: updateError } = await supabase
        .from('jobs_run')
        .update({ status })
        .eq('id', runId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    }

    // Get the updated job configuration to return
    const { data, error } = await supabase
      .from('jobs_configuration')
      .select('*, jobs_run(status, started_at, completed_at)')
      .eq('id', id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Transform the job configuration to match the expected deployment format
    const latestRun =
      data.jobs_run && data.jobs_run.length > 0
        ? data.jobs_run.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )[0]
        : null;

    const transformedData = {
      id: data.id,
      name: data.name,
      description: data.description,
      team_id: data.team_id,
      tenant_id: data.tenant_id,
      configuration: data.configuration_parameters,
      status: latestRun?.status || 'idle',
      created_at: data.created_at,
      updated_at: data.updated_at,
      started_at: latestRun?.started_at || null,
      completed_at: latestRun?.completed_at || null,
      // Keep other fields needed by the UI
    };

    return { success: true, data: transformedData };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update deployment status' };
  }
}

/**
 * Delete a deployment
 */
export async function deleteDeployment(id: string, cookieStore?: any): Promise<DbResponse<null>> {
  try {
    const supabase = await createClient(cookieStore);

    // First delete all job runs for this configuration
    const { error: runDeleteError } = await supabase.from('jobs_run').delete().eq('config_id', id);

    if (runDeleteError) {
      return { success: false, error: runDeleteError.message };
    }

    // Then delete the job configuration
    const { error } = await supabase.from('jobs_configuration').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete deployment' };
  }
}

/**
 * Find many deployments based on criteria
 */
export async function findMany(
  options: { where?: any } = {},
  cookieStore?: any,
): Promise<DbResponse<Deployment[]>> {
  try {
    const supabase = await createClient(cookieStore);

    let query = supabase
      .from('jobs_configuration')
      .select('*, jobs_run(status, started_at, completed_at)');

    // Add job_type filter for deployments
    query = query.eq('job_type', 'deployment');

    // Apply where conditions if provided
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        // Map deployment fields to job configuration fields if needed
        if (key === 'configuration') {
          query = query.eq('configuration_parameters', value);
        } else {
          query = query.eq(key, value);
        }
      });
    }

    // Order by created_at desc
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    // Transform the data to match the expected deployment format
    const transformedData = data.map((config) => {
      // Find the latest run if any
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
        team_id: config.team_id,
        tenant_id: config.tenant_id,
        configuration: config.configuration_parameters,
        status: latestRun?.status || 'idle',
        created_at: config.created_at,
        updated_at: config.updated_at,
        started_at: latestRun?.started_at || null,
        completed_at: latestRun?.completed_at || null,
        // Keep other fields needed by the UI
      };
    });

    return { success: true, data: transformedData };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to find deployments', data: [] };
  }
}

/**
 * Find a unique deployment by ID
 */
export async function findUnique(id: string, cookieStore?: any): Promise<Deployment | null> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('jobs_configuration')
      .select('*, jobs_run(status, started_at, completed_at)')
      .eq('id', id)
      .eq('job_type', 'deployment')
      .single();

    if (error) {
      console.error('Error in findUnique:', error);
      return null;
    }

    // Transform the data to match the expected deployment format
    const latestRun =
      data.jobs_run && data.jobs_run.length > 0
        ? data.jobs_run.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )[0]
        : null;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      team_id: data.team_id,
      tenant_id: data.tenant_id,
      configuration: data.configuration_parameters,
      status: latestRun?.status || 'idle',
      created_at: data.created_at,
      updated_at: data.updated_at,
      started_at: latestRun?.started_at || null,
      completed_at: latestRun?.completed_at || null,
      // Keep other fields needed by the UI
    };
  } catch (error: any) {
    console.error('Error in findUnique:', error);
    return null;
  }
}

/**
 * Create a deployment
 */
export async function create(
  options: { data: any },
  cookieStore?: any,
): Promise<DbResponse<Deployment>> {
  // Use the createDeployment function, which now creates a job configuration
  return createDeployment(options.data, cookieStore);
}

/**
 * Update a deployment
 */
export async function update(
  id: string,
  data: any,
  cookieStore?: any,
): Promise<DbResponse<Deployment>> {
  return updateDeployment(id, data, cookieStore);
}

/**
 * Delete a deployment
 */
export async function delete_(id: string, cookieStore?: any): Promise<DbResponse<null>> {
  return deleteDeployment(id, cookieStore);
}

/**
 * Run a deployment
 */
export async function runDeployment(
  id: string,
  userId: string,
  cookieStore?: any,
): Promise<DbResponse<any>> {
  // Use the runJob function from jobsRunDb instead
  return runJob(id, userId, cookieStore);
}

// Default export for all deployment database operations
const deploymentDb = {
  getDeployments,
  getDeploymentById,
  createDeployment,
  updateDeployment,
  updateDeploymentStatus,
  deleteDeployment,
  // Add new adapter methods
  findMany,
  findUnique,
  create,
  update,
  delete: delete_,
  runDeployment,
};

export default deploymentDb;
