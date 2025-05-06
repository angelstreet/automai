const { executeFlaskScripts } = require('./flaskUtils');
const { updateJobStatus } = require('./jobUtils');
const { executeSSHScripts } = require('./sshUtils');

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
  );
  const output = result.output;
  const overallStatus = result.overallStatus;
  started_at = result.started_at;

  // Update final status
  const completed_at = new Date().toISOString();
  await updateJobStatus(supabase, jobId, overallStatus, output, completed_at);

  return { output, overallStatus, started_at };
}

module.exports = { executeOnFlask, executeOnSSH };
