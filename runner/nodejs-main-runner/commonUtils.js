const { updateJobStatus } = require('./jobUtils');
const { generateAndUploadReport } = require('./reportUtils');
const { executeFlaskScripts } = require('./flaskUtils');
const { executeSSHScripts } = require('./sshUtils');

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
    team_id,
    creator_id,
  );
  const output = result.output;
  const overallStatus = result.overallStatus;
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
        `[executeOnFlask] Failed to update report URL for job ${jobId}: ${reportError.message}`,
      );
    } else {
      console.log(`[executeOnFlask] Updated job ${jobId} with report URL: ${reportUrl}`);
    }
  }
  return { output, overallStatus, started_at };
}

async function executeOnSSH(
  config,
  jobId,
  started_at,
  decryptedEnvVars,
  supabase,
  config_id,
  created_at,
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
    created_at,
    creator_id,
  );
  const output = result.output;
  const overallStatus = result.overallStatus;
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
        `[executeOnSSH] Failed to update report URL for job ${jobId}: ${reportError.message}`,
      );
    } else {
      console.log(`[executeOnSSH] Updated job ${jobId} with report URL: ${reportUrl}`);
    }
  }
  return { output, overallStatus, started_at };
}

module.exports = { executeOnFlask, executeOnSSH };
