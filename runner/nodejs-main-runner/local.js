require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');

// Import utility modules
const { fetchAndDecryptEnvVars } = require('./envUtils');
const { executeFlaskScripts } = require('./flaskUtils');
const { getJobFromQueue, fetchJobConfig, createJobRun, updateJobStatus } = require('./jobUtils');
const { executeSSHScripts } = require('./sshUtils');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const FLASK_SERVICE_URL = process.env.PYTHON_SLAVE_RUNNER_FLASK_SERVICE_URL;

async function executeOnFlask(
  config,
  jobId,
  started_at,
  decryptedEnvVars,
  supabase,
  FLASK_SERVICE_URL,
  config_id,
  created_at,
  team_id,
  creator_id,
) {
  // Execute scripts via Flask service
  const result = await executeFlaskScripts(
    config,
    jobId,
    started_at,
    decryptedEnvVars,
    supabase,
    FLASK_SERVICE_URL,
    config_id,
    created_at,
    team_id,
    creator_id,
  );
  const output = result.output;
  const overallStatus = result.overallStatus;
  started_at = result.started_at;

  // Update final status
  const completed_at = new Date().toISOString();
  await updateJobStatus(supabase, jobId, overallStatus, output, completed_at);

  // Report URL is already handled by Flask's finalize_job endpoint
  return { output, overallStatus, started_at };
}

async function executeOnSSH(
  config,
  jobId,
  started_at,
  decryptedEnvVars,
  supabase,
  team_id,
  config_id,
  created_at,
  creator_id,
) {
  // Execute scripts via SSH on hosts
  const result = await executeSSHScripts(
    config,
    jobId,
    started_at,
    decryptedEnvVars,
    supabase,
    team_id,
    config_id,
    created_at,
    creator_id,
  );
  const output = result.output;
  const overallStatus = result.overallStatus;
  started_at = result.started_at;

  // Update final status
  const completed_at = new Date().toISOString();
  await updateJobStatus(supabase, jobId, overallStatus, output, completed_at);

  // Report URL is already handled by SSH's finalizeJobOnSSH function
  return { output, overallStatus, started_at };
}

async function processJob() {
  try {
    // Check if -payload argument is provided
    const usePayload = process.argv.includes('-p') || process.argv.includes('--payload');
    const showHelp = process.argv.includes('-h') || process.argv.includes('--help');

    if (showHelp) {
      console.log(`[@local-runner:help] Available command-line options for local.js:`);
      console.log(`  -p, --payload    Use a custom payload from the PAYLOAD environment variable`);
      console.log(`  -h, --help       Display this help message`);
      process.exit(0);
    }

    let jobData;
    let config;
    let config_id;
    let team_id;
    let creator_id;

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
        config_id = jobData.config_id || 'b0238c60-fc08-4008-a445-6ee35b99e83c'; // Default testing config ID
        console.log(
          `[@local-runner:processJob] Custom payload parsed successfully: ${JSON.stringify(jobData, null, 2)}`,
        );

        // For custom payload, always fetch team_id from the default config if not provided
        if (!jobData.team_id || !jobData.creator_id) {
          const defaultConfigId = 'b0238c60-fc08-4008-a445-6ee35b99e83c';
          const { data: configData, error: configError } = await supabase
            .from('jobs_configuration')
            .select('team_id, creator_id')
            .eq('id', defaultConfigId)
            .single();

          if (!configError && configData) {
            if (configData.team_id && !jobData.team_id) {
              jobData.team_id = configData.team_id;
              config.team_id = configData.team_id;
              team_id = configData.team_id;
              console.log(
                `[@local-runner:processJob] Retrieved team_id from default config: ${jobData.team_id}`,
              );
            }

            if (configData.creator_id && !jobData.creator_id) {
              jobData.creator_id = configData.creator_id;
              config.creator_id = configData.creator_id;
              creator_id = configData.creator_id;
              console.log(
                `[@local-runner:processJob] Retrieved creator_id from default config: ${jobData.creator_id}`,
              );
            }
          } else {
            console.log(
              `[@local-runner:processJob] Failed to get metadata from default config: ${configError?.message}`,
            );
          }
        } else {
          team_id = jobData.team_id;
          creator_id = jobData.creator_id;
        }
      } catch (err) {
        console.error(`[@local-runner:processJob] Failed to parse PAYLOAD: ${err.message}`);
        return;
      }
    } else {
      // Get job from queue
      const job = await getJobFromQueue(redis);
      if (!job) return;

      jobData = typeof job === 'string' ? JSON.parse(job) : job;
      config_id = jobData.config_id;

      // Fetch job configuration
      const {
        config: fetchedConfig,
        team_id: fetchedTeamId,
        creator_id: fetchedCreatorId,
        is_active,
      } = await fetchJobConfig(supabase, config_id);
      if (!is_active) {
        console.log(
          `[@local-runner:processJob] Config ${config_id} is inactive, skipping execution`,
        );
        return;
      }
      config = fetchedConfig;
      team_id = fetchedTeamId;
      creator_id = fetchedCreatorId;
      jobData.team_id = team_id;
      jobData.creator_id = creator_id;
    }

    // Fetch and decrypt environment variables
    const decryptedEnvVars = await fetchAndDecryptEnvVars(supabase, team_id);

    // Create job run entry
    const { jobId, created_at } = await createJobRun(supabase, config_id);
    let started_at = created_at;

    const hasHosts = config.hosts && config.hosts.length > 0;

    if (!hasHosts) {
      await executeOnFlask(
        config,
        jobId,
        started_at,
        decryptedEnvVars,
        supabase,
        FLASK_SERVICE_URL,
        config_id,
        created_at,
        team_id,
        creator_id,
      );
    } else {
      await executeOnSSH(
        config,
        jobId,
        started_at,
        decryptedEnvVars,
        supabase,
        team_id,
        config_id,
        created_at,
        creator_id,
      );
    }

    // Remove job from queue after processing (only if not using custom payload)
    if (!usePayload) {
      await redis.lrem('jobs_queue', 1, JSON.stringify(jobData));
      console.log(`[@local-runner:processJob] Removed job from queue`);
    }
  } catch (error) {
    console.error(`[@local-runner:processJob] Error: ${error.message}`);
  }
}

// Run immediately for testing
processJob().then(() => console.log('[@local-runner] Test complete'));
