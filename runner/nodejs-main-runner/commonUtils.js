const { executeFlaskScripts } = require('./flaskUtils');
const { updateJobStatus } = require('./jobUtils');
const { executeSSHScripts } = require('./sshUtils');

// Common utility functions for job processing

// Get the runner environment from a custom environment variable
function getRunnerEnv() {
  const env = process.env.RUNNER_ENV || 'preprod';
  console.log(`[utils] Runner environment set to: ${env}`);
  return env;
}

// Dynamically set Flask service URL based on environment
function getFlaskServiceUrl(env) {
  return env === 'prod'
    ? process.env.PYTHON_SLAVE_RUNNER_PROD_FLASK_SERVICE_URL
    : process.env.PYTHON_SLAVE_RUNNER_PREPROD_FLASK_SERVICE_URL;
}

async function executeOnFlask(
  config,
  jobId,
  started_at,
  decryptedEnvVars,
  supabase,
  FLASK_SERVICE_URL,
  config_id,
  team_id,
  creator_id,
  env,
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
    team_id,
    creator_id,
    env,
  );
  const output = result.output;
  const overallStatus = result.overallStatus;
  started_at = result.started_at;

  // Update final status
  const completed_at = new Date().toISOString();
  await updateJobStatus(supabase, jobId, overallStatus, output, completed_at);

  return { output, overallStatus, started_at };
}

async function executeOnSSH(
  config,
  jobId,
  started_at,
  decryptedEnvVars,
  supabase,
  config_id,
  team_id,
  creator_id,
  env,
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
    team_id,
    creator_id,
    env,
  );
  const output = result.output;
  const overallStatus = result.overallStatus;
  started_at = result.started_at;

  // Update final status
  const completed_at = new Date().toISOString();
  await updateJobStatus(supabase, jobId, overallStatus, output, completed_at);

  return { output, overallStatus, started_at };
}

// Export utility functions
module.exports = {
  getRunnerEnv,
  getFlaskServiceUrl,
  executeOnFlask,
  executeOnSSH,
};
