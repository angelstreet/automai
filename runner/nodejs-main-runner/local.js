require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const axios = require('axios');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const FLASK_SERVICE_URL = process.env.PYTHON_SLAVE_RUNNER_FLASK_SERVICE_URL;

async function processJob() {
  try {
    // Check if -payload argument is provided
    const usePayload = process.argv.includes('-payload');
    let jobData;
    let config;

    if (usePayload) {
      console.log(
        `[@local-runner:processJob] Using custom payload from environment variable PAYLOAD`,
      );
      const payloadStr = process.env.PAYLOAD;
      if (!payloadStr) {
        console.error(`[@local-runner:processJob] PAYLOAD environment variable not set`);
        return;
      }
      try {
        jobData = JSON.parse(payloadStr);
        config = jobData;
        console.log(
          `[@local-runner:processJob] Custom payload parsed successfully: ${JSON.stringify(jobData, null, 2)}`,
        );
      } catch (err) {
        console.error(`[@local-runner:processJob] Failed to parse PAYLOAD: ${err.message}`);
        return;
      }
    } else {
      const queueLength = await redis.llen('jobs_queue');
      console.log(`[@local-runner:processJob] Queue length: ${queueLength} jobs`);

      const jobs = await redis.lrange('jobs_queue', -1, -1);
      if (!jobs || jobs.length === 0) {
        console.log(`[@local-runner:processJob] Queue is empty`);
        return;
      }
      const job = jobs[0];

      console.log(`[@local-runner:processJob] Processing job: ${JSON.stringify(job)}`);
      jobData = typeof job === 'string' ? JSON.parse(job) : job;

      // Fetch config from Supabase
      const { data, error } = await supabase
        .from('jobs_configuration')
        .select('config')
        .eq('id', jobData.config_id)
        .single();
      if (error || !data) {
        console.error(
          `[@local-runner:processJob] Failed to fetch config ${jobData.config_id}: ${error?.message}`,
        );
        return;
      }
      config = data.config;
      console.log(`[@local-runner:processJob] Config: ${JSON.stringify(config)}`);
    }

    // Create job with pending status in Supabase (even for custom payload)
    const created_at = new Date().toISOString();
    const { data: jobRunData, error: jobError } = await supabase
      .from('jobs_run')
      .insert({
        config_id: jobData.config_id || '00000000-0000-0000-0000-000000000000',
        status: 'pending',
        output: { scripts: [] },
        created_at: created_at,
      })
      .select('id')
      .single();

    if (jobError) {
      console.error(`[@local-runner:processJob] Failed to create pending job: ${jobError.message}`);
      return;
    }

    const jobId = jobRunData.id;
    console.log(`[@local-runner:processJob] Created job with ID ${jobId} and status 'pending'`);

    let output = { scripts: [] };
    let overallStatus = 'success';

    // Check if hosts are specified in the config (for custom payload with SSH)
    const hasHosts = config.hosts && config.hosts.length > 0;
    if (hasHosts && usePayload) {
      console.log(
        `[@local-runner:processJob] Hosts specified in custom payload, but local.js does not support SSH execution. Please use index.js for SSH jobs.`,
      );
      overallStatus = 'failed';
      output.scripts.push({
        script_path: null,
        iteration: null,
        stdout: '',
        stderr: 'SSH execution not supported in local.js. Use index.js for jobs with hosts.',
      });
    } else {
      console.log(`[@local-runner:processJob] Forwarding to Flask service for local execution`);

      // Process each script sequentially
      for (const script of config.scripts || []) {
        const scriptPath = script.path;
        const parameters = script.parameters || '';
        const timeout = script.timeout || 30;
        const retryOnFailure = script.retry_on_failure || 0;
        const iterations = script.iterations || 1;

        if (!scriptPath) {
          console.error(`[@local-runner:processJob] No script path provided for script`);
          overallStatus = 'failed';
          output.scripts.push({
            script_path: null,
            iteration: null,
            stdout: '',
            stderr: 'No script path provided',
          });
          continue;
        }

        // Execute each iteration
        for (let i = 1; i <= iterations; i++) {
          let retries = retryOnFailure + 1;
          let attempt = 0;
          let scriptOutput = { script_path: scriptPath, iteration: i, stdout: '', stderr: '' };
          let scriptStatus = 'failed';

          while (attempt < retries) {
            attempt++;
            try {
              // Build payload with iteration number appended to parameters
              const payload = {
                script_path: scriptPath,
                parameters: parameters ? `${parameters} ${i}` : `${i}`,
                timeout: timeout,
              };

              if (config.repository) {
                payload.repo_url = config.repository;
                payload.git_folder = config.git_folder;
                payload.branch = config.branch || 'main';
              }

              console.log(
                `[@local-runner:processJob] Sending payload to Flask (attempt ${attempt}/${retries}, iteration ${i}/${iterations}): ${JSON.stringify(payload)}`,
              );
              const response = await axios.post(`${FLASK_SERVICE_URL}/execute`, payload, {
                timeout: (payload.timeout + 5) * 1000,
              });

              scriptOutput.stdout = response.data.output.stdout || '';
              scriptOutput.stderr = response.data.output.stderr || '';
              scriptStatus = response.data.status;

              if (scriptStatus === 'success') {
                break;
              } else {
                console.log(
                  `[@local-runner:processJob] Script failed, attempt ${attempt}/${retries}: ${scriptOutput.stderr}`,
                );
              }
            } catch (err) {
              scriptOutput.stderr = err.response?.data?.message || err.message;
              console.log(
                `[@local-runner:processJob] Script error, attempt ${attempt}/${retries}: ${scriptOutput.stderr}`,
              );
            }
          }

          output.scripts.push(scriptOutput);
          if (scriptStatus !== 'success') {
            overallStatus = 'failed';
          }
        }
      }
    }

    const completed_at = new Date().toISOString();
    await supabase
      .from('jobs_run')
      .update({
        status: overallStatus,
        output: output,
        completed_at: completed_at,
      })
      .eq('id', jobId);

    console.log(
      `[@local-runner:processJob] Updated job ${jobId} to final status: ${overallStatus}`,
    );

    // Remove job from queue after processing (only if not using custom payload)
    if (!usePayload) {
      await redis.lrem('jobs_queue', 1, job);
    }
  } catch (error) {
    console.error(`[@local-runner:processJob] Error: ${error.message}`);
  }
}

// Run immediately for testing
processJob().then(() => console.log('[@local-runner] Test complete'));
