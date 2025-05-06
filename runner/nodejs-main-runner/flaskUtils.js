const axios = require('axios');

async function executeFlaskScripts(
  config,
  jobId,
  started_at,
  decryptedEnvVars,
  supabase,
  FLASK_SERVICE_URL,
) {
  console.log(`[executeFlaskScripts] No hosts found, forwarding to Flask service`);

  let output = { scripts: [], stdout: '', stderr: '' };
  let overallStatus = 'success';

  for (const script of config.scripts || []) {
    const scriptPath = script.path;
    const parameters = script.parameters || '';
    const timeout = config.execution?.timeout || script.timeout || 30;
    const retryOnFailure = script.retry_on_failure || 0;
    const iterations = script.iterations || 1;

    for (let i = 1; i <= iterations; i++) {
      let retries = retryOnFailure + 1;
      let attempt = 0;
      let scriptOutput = { script_path: scriptPath, iteration: i, stdout: '', stderr: '' };
      let scriptStatus = 'failed';

      while (attempt < retries) {
        attempt++;
        try {
          const payload = {
            script_path: scriptPath,
            parameters: parameters ? `${parameters} ${i}` : `${i}`,
            timeout: timeout,
            environment_variables: decryptedEnvVars,
            created_at: started_at,
            job_id: jobId,
          };

          if (config.repository) {
            payload.repo_url = config.repository;
            payload.script_folder = config.script_folder || '';
            payload.branch = config.branch || 'main';
          }

          const { error: statusError } = await supabase
            .from('jobs_run')
            .update({
              status: 'in_progress',
              started_at: started_at,
            })
            .eq('id', jobId);

          if (statusError) {
            console.error(
              `[executeFlaskScripts] Failed to update job ${jobId} to in_progress: ${statusError.message}`,
            );
            scriptOutput.stderr = `Failed to update job status: ${statusError.message}`;
            overallStatus = 'failed';
            output.scripts.push(scriptOutput);
            continue;
          }

          console.log(`[executeFlaskScripts] Updated job ${jobId} status to 'in_progress'`);

          console.log(
            `[executeFlaskScripts] Sending payload to Flask (attempt ${attempt}/${retries}, iteration ${i}/${iterations}): ${JSON.stringify({ ...payload, environment_variables: payload.environment_variables ? Object.keys(payload.environment_variables).reduce((acc, key) => ({ ...acc, [key]: '***MASKED***' }), {}) : {} })}`,
          );
          const response = await axios.post(`${FLASK_SERVICE_URL}/execute`, payload, {
            timeout: (payload.timeout + 5) * 1000,
          });

          scriptOutput.stdout = response.data.output.stdout || '';
          scriptOutput.stderr = response.data.output.stderr || '';
          // Check for exit code in response to determine success
          if (response.data.output && typeof response.data.output.exitCode === 'number') {
            scriptStatus = response.data.output.exitCode === 0 ? 'success' : 'failed';
            console.log(
              `[executeFlaskScripts] Script status determined by exit code: ${scriptStatus} (exitCode: ${response.data.output.exitCode})`,
            );
          } else {
            scriptStatus = response.data.status;
            console.log(
              `[executeFlaskScripts] Script status determined by response status: ${scriptStatus} (no exit code available)`,
            );
          }

          // Add associated files to output if available
          if (response.data.associated_files) {
            output.associated_files = response.data.associated_files;
          }

          console.log(
            `[executeFlaskScripts] Received response from Flask for job ${jobId}: status=${scriptStatus}, stdout=${scriptOutput.stdout}, stderr=${scriptOutput.stderr}`,
          );

          if (scriptStatus === 'success') {
            break;
          } else {
            console.log(
              `[executeFlaskScripts] Script failed, attempt ${attempt}/${retries}: ${scriptOutput.stderr}`,
            );
          }
        } catch (err) {
          scriptOutput.stderr = err.response?.data?.message || err.message;
          console.log(
            `[executeFlaskScripts] Script error, attempt ${attempt}/${retries}: ${scriptOutput.stderr}`,
          );
        }
      }

      output.scripts.push(scriptOutput);
      if (scriptStatus !== 'success') {
        overallStatus = 'failed';
      }
    }
  }

  return { output, overallStatus, started_at };
}

module.exports = { executeFlaskScripts };
