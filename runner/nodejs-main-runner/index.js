// Built-in Node.js modules
const http = require('http');

// Third-party modules
const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const cron = require('node-cron');

// Import utility modules
const { fetchAndDecryptEnvVars } = require('./envUtils');
const { executeFlaskScripts } = require('./flaskUtils');
const { getJobFromQueue, fetchJobConfig, createJobRun, updateJobStatus } = require('./jobUtils');
const { generateAndUploadReport } = require('./reportUtils');
const { executeSSHScripts } = require('./sshUtils');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FLASK_SERVICE_URL = process.env.PYTHON_SLAVE_RUNNER_FLASK_SERVICE_URL;

async function processJob() {
  try {
    // Get job from queue
    const job = await getJobFromQueue(redis);
    if (!job) return;

    const jobData = typeof job === 'string' ? JSON.parse(job) : job;
    const { config_id } = jobData;

    // Fetch job configuration
    const { config, team_id, is_active } = await fetchJobConfig(supabase, config_id);
    if (!is_active) {
      console.log(`[processJob] Config ${config_id} is inactive, skipping execution`);
      return;
    }

    // Fetch and decrypt environment variables
    const decryptedEnvVars = await fetchAndDecryptEnvVars(supabase, team_id);

    // Create job run entry
    const { jobId, created_at } = await createJobRun(supabase, config_id);
    let started_at = created_at;
    let output = { scripts: [], stdout: '', stderr: '' };
    let overallStatus = 'success';

    const hasHosts = config.hosts && config.hosts.length > 0;

    if (!hasHosts) {
      // Execute scripts via Flask service
      const result = await executeFlaskScripts(
        config,
        jobId,
        started_at,
        decryptedEnvVars,
        supabase,
        FLASK_SERVICE_URL,
      );
      output = result.output;
      overallStatus = result.overallStatus;
      started_at = result.started_at;

      // Update final status and generate report
      const completed_at = new Date().toISOString();
      await updateJobStatus(supabase, jobId, overallStatus, output, completed_at);

      const reportUrl = await generateAndUploadReport(
        jobId,
        config_id,
        output,
        created_at,
        started_at,
        completed_at,
        overallStatus,
        decryptedEnvVars,
      );
      if (reportUrl) {
        const { error: reportError } = await supabase
          .from('jobs_run')
          .update({ report_url: reportUrl })
          .eq('id', jobId);
        if (reportError) {
          console.error(
            `[processJob] Failed to update report URL for job ${jobId}: ${reportError.message}`,
          );
        } else {
          console.log(`[processJob] Updated job ${jobId} with report URL: ${reportUrl}`);
        }
      }
    } else {
      // Execute scripts via SSH on hosts
      const result = await executeSSHScripts(
        config,
        jobId,
        started_at,
        decryptedEnvVars,
        supabase,
        team_id,
        config_id,
      );
      output = result.output;
      overallStatus = result.overallStatus;
      started_at = result.started_at;

      // Update final status and generate report
      const completed_at = new Date().toISOString();
      await updateJobStatus(supabase, jobId, overallStatus, output, completed_at);

      const reportUrl = await generateAndUploadReport(
        jobId,
        config_id,
        output,
        created_at,
        started_at,
        completed_at,
        overallStatus,
        decryptedEnvVars,
      );
      if (reportUrl) {
        const { error: reportError } = await supabase
          .from('jobs_run')
          .update({ report_url: reportUrl })
          .eq('id', jobId);
        if (reportError) {
          console.error(
            `[processJob] Failed to update report URL for job ${jobId}: ${reportError.message}`,
          );
        } else {
          console.log(`[processJob] Updated job ${jobId} with report URL: ${reportUrl}`);
        }
      }
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
