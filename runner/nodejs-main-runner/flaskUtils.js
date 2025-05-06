const fs = require('fs');
const path = require('path');

const axios = require('axios');

const { createScriptExecution, updateScriptExecution } = require('./jobUtils');
const {
  prepareJobInitializationPayload,
  prepareJobFinalizationPayload,
  collectEnvironmentVariables,
} = require('./utils');

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

  // Send upload_and_report.py script content and environment variables to Flask server for job finalization
  const uploadScriptPath = path.join(__dirname, 'upload_and_report.py');
  const uploadScriptContent = fs.readFileSync(uploadScriptPath, 'utf8');

  try {
    // Prepare credentials object with both Cloudflare R2 and Supabase credentials
    const credentials = {
      cloudflare_r2_endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || '',
      cloudflare_r2_access_key_id: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
      cloudflare_r2_secret_access_key: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
      supabase_api_url: process.env.SUPABASE_URL || '',
      supabase_service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    };
    console.log(`[executeFlaskScripts] Credentials: ${JSON.stringify(credentials)}`);
    console.log(`[executeFlaskScripts] Prepared unified credentials for job ${jobId}`);

    const payload = prepareJobInitializationPayload(
      jobId,
      started_at,
      uploadScriptContent,
      decryptedEnvVars,
      credentials,
    );
    const initResponse = await fetch(`${FLASK_SERVICE_URL}/initialize_job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!initResponse.ok) {
      console.error(
        `[executeFlaskScripts] Failed to initialize job ${jobId} on Flask server: ${initResponse.statusText}`,
      );
    } else {
      console.log(
        `[executeFlaskScripts] Successfully initialized job ${jobId} on Flask server with upload script and credentials.`,
      );
    }
  } catch (error) {
    console.error(
      `[executeFlaskScripts] Error initializing job ${jobId} on Flask server: ${error.message}`,
    );
  }

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
          const envVars = collectEnvironmentVariables(decryptedEnvVars);
          const payload = {
            script_path: scriptPath,
            parameters: parameters ? `${parameters} ${i}` : `${i}`,
            timeout: timeout,
            environment_variables: envVars,
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

          scriptOutput.stdout = response.data.stdout || '';
          scriptOutput.stderr = response.data.stderr || '';
          // Check for status in response to determine success
          if (response.data && typeof response.data.status === 'string') {
            scriptStatus = response.data.status === 'success' ? 'success' : 'failed';
            console.log(
              `[executeFlaskScripts] Script status determined by response status: ${scriptStatus}`,
            );
          } else {
            scriptStatus = 'failed';
            console.log(
              `[executeFlaskScripts] Script status could not be determined, defaulting to failed`,
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
                exitCode: response.data.exitCode || 0,
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
                exitCode: response.data.exitCode || 0,
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

  // Finalize job for upload and report generation
  try {
    const finalizePayload = prepareJobFinalizationPayload(jobId, started_at);
    const finalizeResponse = await fetch(`${FLASK_SERVICE_URL}/finalize_job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalizePayload),
    });
    if (!finalizeResponse.ok) {
      console.error(
        `[executeFlaskScripts] Failed to finalize job ${jobId} on Flask server: ${finalizeResponse.statusText}`,
      );
    } else {
      const finalizeData = await finalizeResponse.json();
      console.log(
        `[executeFlaskScripts] Successfully finalized job ${jobId} on Flask server. Report URL: ${finalizeData.report_url || 'N/A'}`,
      );
      // Update job record with report URL if available
      if (finalizeData.report_url) {
        const { error: reportError } = await supabase
          .from('jobs_run')
          .update({ report_url: finalizeData.report_url })
          .eq('id', jobId);
        if (reportError) {
          console.error(
            `[executeFlaskScripts] Failed to update job ${jobId} with report URL: ${reportError.message}`,
          );
        }
      }
    }
  } catch (error) {
    console.error(`[executeFlaskScripts] Error finalizing job ${jobId}: ${error.message}`);
  }

  return { output, overallStatus, started_at };
}

module.exports = { executeFlaskScripts };
