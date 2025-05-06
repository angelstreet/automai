// Built-in Node.js modules
const http = require('http');

// Third-party modules
const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const cron = require('node-cron');

// Import utility modules
const commonUtils = require('./commonUtils');
const { fetchAndDecryptEnvVars } = require('./envUtils');
const { getJobFromQueue, fetchJobConfig, createJobRun } = require('./jobUtils');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Dynamically set Flask service URL based on environment
const getFlaskServiceUrl = (env) => {
  return env === 'prod'
    ? process.env.PYTHON_SLAVE_RUNNER_PROD_FLASK_SERVICE_URL
    : process.env.PYTHON_SLAVE_RUNNER_PREPROD_FLASK_SERVICE_URL;
};

async function processJob() {
  try {
    // Get job from queue
    const job = await getJobFromQueue(redis);
    if (!job) return;

    const jobData = typeof job === 'string' ? JSON.parse(job) : job;
    const { config_id } = jobData;

    // Fetch job configuration
    const { config, team_id, creator_id, is_active } = await fetchJobConfig(supabase, config_id);
    if (!is_active) {
      console.log(`[processJob] Config ${config_id} is inactive, skipping execution`);
      return;
    }

    // Set Flask service URL based on environment, default to preprod if not specified
    const FLASK_SERVICE_URL = getFlaskServiceUrl(config.env);
    console.log(
      `[processJob] Using Flask service URL for env ${config.env || 'not specified (defaulting to preprod)'}: ${FLASK_SERVICE_URL}`,
    );

    // Fetch and decrypt environment variables
    const decryptedEnvVars = await fetchAndDecryptEnvVars(supabase, team_id);

    // Create job run entry
    const { jobId, created_at } = await createJobRun(supabase, config_id);
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
