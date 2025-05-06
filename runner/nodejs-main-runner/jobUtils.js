async function getJobFromQueue(redis) {
  const queueLength = await redis.llen('jobs_queue');
  console.log(`[getJobFromQueue] Queue length: ${queueLength} jobs`);

  // Peek at the last job without removing it
  const job = await redis.lindex('jobs_queue', -1);
  if (!job) {
    console.log(`[getJobFromQueue] Queue is empty`);
    return null;
  }

  console.log(`[getJobFromQueue] Peeking at job: ${job}`);
  return job;
}

async function fetchJobConfig(supabase, config_id) {
  const { data, error } = await supabase
    .from('jobs_configuration')
    .select('config, is_active, team_id, creator_id')
    .eq('id', config_id)
    .single();
  if (error || !data) {
    console.error(`[fetchJobConfig] Failed to fetch config ${config_id}: ${error?.message}`);
    throw new Error(`Failed to fetch config ${config_id}: ${error?.message}`);
  }
  console.log(`[fetchJobConfig] Config: ${JSON.stringify(data.config)}`);
  return {
    config: data.config,
    team_id: data.team_id,
    creator_id: data.creator_id,
    is_active: data.is_active,
  };
}

async function createJobRun(supabase, config_id, env) {
  const created_at = new Date().toISOString();
  const { data: jobRunData, error: jobError } = await supabase
    .from('jobs_run')
    .insert({
      config_id,
      status: 'pending',
      output: { scripts: [] },
      created_at: created_at,
      env: env,
    })
    .select('id')
    .single();

  if (jobError) {
    console.error(`[createJobRun] Failed to create pending job: ${jobError.message}`);
    throw new Error(`Failed to create pending job: ${jobError.message}`);
  }

  const jobId = jobRunData.id;
  console.log(`[createJobRun] Created job with ID ${jobId} and status 'pending'`);
  return { jobId, created_at };
}

async function updateJobStatus(supabase, jobId, status, output = null, completed_at = null) {
  const updateData = { status };
  if (output) updateData.output = output;
  if (completed_at) updateData.completed_at = completed_at;

  const { error: statusError } = await supabase.from('jobs_run').update(updateData).eq('id', jobId);

  if (statusError) {
    console.error(
      `[updateJobStatus] Failed to update job ${jobId} to ${status}: ${statusError.message}`,
    );
    throw new Error(`Failed to update job status: ${statusError.message}`);
  }

  console.log(`[updateJobStatus] Updated job ${jobId} to status: ${status}`);
}

async function createScriptExecution(
  supabase,
  {
    job_run_id,
    config_id,
    team_id,
    creator_id,
    script_name,
    script_path,
    script_parameters,
    host_id = null,
    host_name = null,
    host_ip = null,
    env = 'preprod',
  },
) {
  console.log(
    `[@db:jobUtils:createScriptExecution] Starting to create script execution for job: ${job_run_id}`,
  );

  try {
    const { data, error } = await supabase
      .from('scripts_run')
      .insert({
        job_run_id: job_run_id,
        config_id: config_id,
        team_id: team_id,
        creator_id: creator_id,
        script_name: script_name,
        script_path: script_path,
        script_parameters: script_parameters,
        host_id: host_id,
        host_name: host_name,
        host_ip: host_ip,
        env: env,
      })
      .select('id')
      .single();

    if (error) {
      console.error(
        `[@db:jobUtils:createScriptExecution] ERROR: Failed to insert script execution: ${error.message}`,
      );
      throw new Error(`Failed to insert script execution: ${error.message}`);
    }

    console.log(
      `[@db:jobUtils:createScriptExecution] Successfully created script execution with ID: ${data.id}`,
    );
    return data.id; // Returns script execution ID
  } catch (err) {
    console.error(`[@db:jobUtils:createScriptExecution] ERROR: Unexpected error: ${err.message}`);
    throw err;
  }
}

async function updateScriptExecution(
  supabase,
  {
    script_id,
    status,
    output = null,
    logs = null,
    error = null,
    started_at = null,
    completed_at = null,
    report_url = null,
  },
) {
  console.log(
    `[@db:jobUtils:updateScriptExecution] Updating script execution: ${script_id} with status: ${status}`,
  );

  try {
    const updateData = { status };
    if (output) updateData.output = output;
    if (logs) updateData.logs = logs;
    if (error) updateData.error = error;
    if (started_at) updateData.started_at = started_at;
    if (completed_at) updateData.completed_at = completed_at;
    if (report_url) updateData.report_url = report_url;

    const { error: updateError } = await supabase
      .from('scripts_run')
      .update(updateData)
      .eq('id', script_id);

    if (updateError) {
      console.error(
        `[@db:jobUtils:updateScriptExecution] ERROR: Failed to update script execution: ${updateError.message}`,
      );
      throw new Error(`Failed to update script execution: ${updateError.message}`);
    }

    console.log(
      `[@db:jobUtils:updateScriptExecution] Successfully updated script execution: ${script_id}`,
    );
  } catch (err) {
    console.error(`[@db:jobUtils:updateScriptExecution] ERROR: Unexpected error: ${err.message}`);
    throw err;
  }
}

module.exports = {
  getJobFromQueue,
  fetchJobConfig,
  createJobRun,
  updateJobStatus,
  createScriptExecution,
  updateScriptExecution,
};
