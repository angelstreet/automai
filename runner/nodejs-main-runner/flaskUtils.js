const axios = require('axios');

const { createScriptExecution, updateScriptExecution } = require('./jobUtils');

async function executeFlaskScripts(
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
  console.log(`[executeFlaskScripts] No hosts found, forwarding to Flask service`);

  let output = { scripts: [], stdout: '', stderr: '' };
  let overallStatus = 'success';

  for (const script of config.scripts || []) {
    const scriptPath = script.path;
    const scriptName = scriptPath.split('/').pop();
    const parameters = script.parameters || '';
    const timeout = config.execution?.timeout || script.timeout || 30;
    const retryOnFailure = script.retry_on_failure || 0;
    const iterations = script.iterations || 1;

    for (let i = 1; i <= iterations; i++) {
      let retries = retryOnFailure + 1;
      let attempt = 0;
      let scriptOutput = { script_path: scriptPath, iteration: i, stdout: '', stderr: '' };
      let scriptStatus = 'failed';

      // Create script execution record in database
      const scriptExecutionId = await createScriptExecution(supabase, {
        job_run_id: jobId,
        config_id: config_id,
        team_id: team_id,
        creator_id: creator_id,
        script_name: scriptName,
        script_path: scriptPath,
        script_parameters: { parameters, iteration: i },
      });

      // Update the script execution to 'in_progress'
      await updateScriptExecution(supabase, {
        script_id: scriptExecutionId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });

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
            script_id: scriptExecutionId,
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

            // Update the script execution to 'failed'
            await updateScriptExecution(supabase, {
              script_id: scriptExecutionId,
              status: 'failed',
              error: `Failed to update job status: ${statusError.message}`,
              completed_at: new Date().toISOString(),
            });
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

          // Get report URL if available
          const reportUrl = response.data.report_url;
          if (reportUrl) {
            console.log(`[executeFlaskScripts] Script report URL: ${reportUrl}`);

            // Update script execution with report URL
            await updateScriptExecution(supabase, {
              script_id: scriptExecutionId,
              status: scriptStatus,
              output: {
                stdout: scriptOutput.stdout,
                stderr: scriptOutput.stderr,
                exitCode: response.data.output.exitCode || 0,
              },
              report_url: reportUrl,
              completed_at: new Date().toISOString(),
            });
          } else {
            // Update script execution without report URL
            await updateScriptExecution(supabase, {
              script_id: scriptExecutionId,
              status: scriptStatus,
              output: {
                stdout: scriptOutput.stdout,
                stderr: scriptOutput.stderr,
                exitCode: response.data.output.exitCode || 0,
              },
              completed_at: new Date().toISOString(),
            });
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

          // Update script execution with error information if this is the last attempt
          if (attempt === retries) {
            await updateScriptExecution(supabase, {
              script_id: scriptExecutionId,
              status: 'failed',
              error: scriptOutput.stderr,
              completed_at: new Date().toISOString(),
            });
          }
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
