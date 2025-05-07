// Built-in Node.js modules
const http = require('http');

// Third-party modules
const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const cron = require('node-cron');

// Import utility modules
const commonUtils = require('./commonUtils');
const { getRunnerEnv, getFlaskServiceUrl } = require('./commonUtils');
const { fetchAndDecryptEnvVars } = require('./envUtils');
const { getJobFromQueue, fetchJobConfig, createJobRun } = require('./jobUtils');

// Use utility functions from commonUtils

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Get the runner environment
const RUNNER_ENV = getRunnerEnv();
console.log(`[runner] Runner environment set to: ${RUNNER_ENV}`);

async function processJob() {
  try {
    // Peek at job from queue without removing it
    const job = await getJobFromQueue(redis);
    if (!job) return;

    const jobData = typeof job === 'string' ? JSON.parse(job) : job;
    const { config_id } = jobData;

    // Fetch job configuration
    const { config, team_id, creator_id, is_active, name, env } = await fetchJobConfig(
      supabase,
      config_id,
    );
    if (!is_active) {
      console.log(`[processJob] Config ${config_id} is inactive, skipping execution`);
      // Remove job from queue since it's inactive
      await redis.rpop('jobs_queue');
      return;
    }

    // Check if the job's env matches the runner's environment
    const jobEnv = config.env || 'preprod';
    if (jobEnv !== RUNNER_ENV) {
      console.log(
        `[processJob] Skipping job for config ${config_id} as job env (${jobEnv}) does not match runner env (${RUNNER_ENV})`,
      );
      // Remove job from queue to prevent reprocessing
      await redis.rpop('jobs_queue');
      return;
    }

    // If we reach here, the job is active and environment matches, so now we can remove it from the queue
    await redis.rpop('jobs_queue');
    console.log(`[processJob] Processing job for config ${config_id}`);

    // Set Flask service URL based on environment, default to preprod if not specified
    const FLASK_SERVICE_URL = getFlaskServiceUrl(config.env);
    console.log(
      `[processJob] Using Flask service URL for env ${config.env || 'not specified (defaulting to preprod)'}: ${FLASK_SERVICE_URL}`,
    );

    // Fetch and decrypt environment variables
    const decryptedEnvVars = await fetchAndDecryptEnvVars(supabase, team_id);

    // Create job run entry
    const { jobId, created_at } = await createJobRun(supabase, config_id, RUNNER_ENV);
    let started_at = created_at;

    const hasHosts = config.hosts && config.hosts.length > 0;

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
  } catch (error) {
    console.error(`[processJob] Error: ${error.message}`);
    // In case of error, ensure the job is removed from the queue to prevent reprocessing
    await redis.rpop('jobs_queue');
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
        await redis.lpush('jobs_queue', job);
        console.log(`Scheduled job queued for config ${id}`);
      });
    }
  });
}

setInterval(processJob, 10000);
setupSchedules().catch((err) => console.error('Setup schedules failed:', err));
console.log('Worker running...');

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[server] Server listening on port ${PORT}`);
});
