async function getJobFromQueue(redis) {
  const queueLength = await redis.llen('jobs_queue');
  console.log(`[getJobFromQueue] Queue length: ${queueLength} jobs`);

  const job = await redis.rpop('jobs_queue');
  if (!job) {
    console.log(`[getJobFromQueue] Queue is empty`);
    return null;
  }

  console.log(`[getJobFromQueue] Processing job: ${job}`);
  return job;
}

async function fetchJobConfig(supabase, config_id) {
  const { data, error } = await supabase
    .from('jobs_configuration')
    .select('config, is_active, team_id')
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
    is_active: data.is_active,
  };
}

async function createJobRun(supabase, config_id) {
  const created_at = new Date().toISOString();
  const { data: jobRunData, error: jobError } = await supabase
    .from('jobs_run')
    .insert({
      config_id,
      status: 'pending',
      output: { scripts: [] },
      created_at: created_at,
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

module.exports = { getJobFromQueue, fetchJobConfig, createJobRun, updateJobStatus };
