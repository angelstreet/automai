require('dotenv').config();
const http = require('http');

const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const cron = require('node-cron');

// Import utility modules
const commonUtils = require('./commonUtils');
const { getRunnerEnv, getFlaskServiceUrl } = require('./commonUtils');
const { fetchAndDecryptEnvVars } = require('./envUtils');
const {
  getJobFromQueue,
  removeJobFromQueue,
  addJobToQueue,
  getQueueName,
  fetchJobConfig,
  createJobRun,
  updateJobStatus,
} = require('./jobUtils');

const redis_queue = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Get the runner environment
const RUNNER_ENV = getRunnerEnv();
console.log(`[runner] Runner environment set to: ${RUNNER_ENV}`);

// Log the queue name we're using
const QUEUE_NAME = getQueueName(RUNNER_ENV);
console.log(`[runner] Using queue: ${QUEUE_NAME}`);

async function processJob() {
  try {
    // Peek at job from queue without removing it
    const job = await getJobFromQueue(redis_queue);
    if (!job) return;

    const jobData = typeof job === 'string' ? JSON.parse(job) : job;
    const { config_id } = jobData;

    console.log(`[processJob] Processing job for config ${config_id}`);
    const { config, team_id, creator_id, is_active, name, job_run_env } = await fetchJobConfig(
      supabase,
      config_id,
    );
    if (!is_active) {
      console.log(`[processJob] Config ${config_id} is inactive, skipping and removing job`);
      await removeJobFromQueue(redis_queue, jobData);
      return;
    }

    console.log(`[processJob] Job env: ${job_run_env}`);
    const baseJobEnv = job_run_env.split('-')[0]; // Extract base env (prod or preprod) before any suffix like '-playwright'
    if (baseJobEnv.toLowerCase() !== RUNNER_ENV.toLowerCase()) {
      console.log(
        `[processJob] Skipping and removing job for config ${config_id} as job env (${baseJobEnv}) does not match runner env (${RUNNER_ENV})`,
      );
      await removeJobFromQueue(redis_queue, jobData);
      return;
    }

    console.log(`[processJob] Processing job for config ${config_id} and removing it from queue`);
    await removeJobFromQueue(redis_queue, jobData);

    const FLASK_SERVICE_URL = getFlaskServiceUrl(job_run_env);
    console.log(
      `[processJob] Using Flask service URL for env ${job_run_env || 'not specified (defaulting to preprod)'}: ${FLASK_SERVICE_URL}`,
    );

    // Fetch and decrypt environment variables
    const decryptedEnvVars = await fetchAndDecryptEnvVars(supabase, team_id);

    // Create job run entry
    const { jobId, created_at } = await createJobRun(supabase, config_id, RUNNER_ENV);
    let started_at = created_at;

    const hasHosts = config.hosts && config.hosts.length > 0;

    try {
      if (!hasHosts) {
        await commonUtils.executeOnFlask(
          config,
          jobId,
          started_at,
          decryptedEnvVars,
          supabase,
          FLASK_SERVICE_URL,
          config_id,
          team_id,
          creator_id,
          RUNNER_ENV,
          name,
        );
      } else {
        await commonUtils.executeOnSSH(
          config,
          jobId,
          started_at,
          decryptedEnvVars,
          supabase,
          config_id,
          team_id,
          creator_id,
          RUNNER_ENV,
          name,
        );
      }
    } catch (executionError) {
      console.error(`[processJob] Execution error for job ${jobId}: ${executionError.message}`);
      // Ensure finalization happens even if execution fails
      await updateJobStatus(
        supabase,
        jobId,
        'failed',
        { error: executionError.message },
        new Date().toISOString(),
      );
    }
  } catch (error) {
    console.error(`[processJob] Error: ${error.message}`);
  }
}

async function setupSchedules() {
  const { data, error } = await supabase.from('jobs_configuration').select('id, config, is_active');
  if (error) {
    console.error(`Failed to fetch configs for scheduling: ${error.message}`);
    return;
  }
  if (!data || data.length === 0) {
    console.log('No configs found for scheduling.');
    return;
  }

  data.forEach(({ id, config, is_active }) => {
    if (!config || !config.schedule || !is_active) return;
    const job = JSON.stringify({
      config_id: id,
      timestamp: new Date().toISOString(),
      requested_by: 'system',
    });
    if (config.schedule !== 'now') {
      cron.schedule(config.schedule, async () => {
        await addJobToQueue(redis_queue, job);
        console.log(`Scheduled job queued for config ${id}`);
      });
    }
  });
}

setInterval(processJob, 10000);
console.log('Worker running...');
setupSchedules().catch((err) => console.error('Setup schedules failed:', err));
const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`[server] Server listening on port ${PORT}`);
});
