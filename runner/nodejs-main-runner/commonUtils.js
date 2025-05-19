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
function getFlaskServiceUrl(job_run_env) {
  if (job_run_env === 'prod-browseruse') {
    return process.env.PYTHON_BROWSERUSE_RUNNER_PROD_URL;
  } else if (job_run_env === 'preprod-browseruse') {
    return process.env.PYTHON_BROWSERUSE_RUNNER_PREPROD_URL;
  } else if (job_run_env === 'prod-playwright') {
    return process.env.PYTHON_SLAVE_RUNNER_PROD_PLAYWRIGHT_FLASK_SERVICE_URL;
  } else if (job_run_env === 'preprod-playwright') {
    return process.env.PYTHON_SLAVE_RUNNER_PREPROD_PLAYWRIGHT_FLASK_SERVICE_URL;
  } else if (job_run_env === 'preprod') {
    return process.env.PYTHON_SLAVE_RUNNER_PREPROD_FLASK_SERVICE_URL;
  } else {
    return process.env.PYTHON_SLAVE_RUNNER_PROD_FLASK_SERVICE_URL;
  }
}

// Function to handle Python virtual environment on non-Windows systems
function handlePythonVenv() {
  if (process.platform !== 'win32') {
    const fs = require('fs');
    const path = require('path');
    const venvPath = '/tmp/python/venv';
    const venvBinPath = path.join(venvPath, 'bin');

    if (!fs.existsSync(venvPath)) {
      console.log('[utils] Creating Python virtual environment at', venvPath);
      const { execSync } = require('child_process');
      execSync(`python3 -m venv ${venvPath}`, { stdio: 'inherit' });
      console.log('[utils] Virtual environment created successfully');
    } else {
      console.log('[utils] Using existing Python virtual environment at', venvPath);
    }

    // Update pip in the virtual environment
    console.log('[utils] Updating pip in virtual environment');
    const { execSync } = require('child_process');
    execSync(`${venvBinPath}/pip install --upgrade pip`, { stdio: 'inherit' });
    console.log('[utils] pip updated successfully');

    return venvBinPath;
  }
  return null;
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
  config_name,
) {
  // Execute scripts via Flask service
  const venvBinPath = handlePythonVenv();
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
    config_name,
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
  config_name,
) {
  // Execute scripts via SSH on hosts
  const venvBinPath = handlePythonVenv();
  const result = await executeSSHScripts(
    config,
    jobId,
    started_at,
    decryptedEnvVars,
    supabase,
    config_id,
    team_id,
    creator_id,
    env,
    config_name,
    venvBinPath,
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
