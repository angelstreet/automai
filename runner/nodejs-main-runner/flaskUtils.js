const fs = require('fs');
const path = require('path');

const axios = require('axios');

const { createScriptExecution, updateScriptExecution } = require('./jobUtils');
const {
  prepareJobInitializationPayload,
  prepareJobFinalizationPayload,
  collectEnvironmentVariables,
} = require('./utils');

async function initializeJobOnFlask(jobId, started_at, config, FLASK_SERVICE_URL) {
  console.log(`[initializeJobOnFlask] Initializing job ${jobId} on Flask service`);
  console.log(`[initializeJobOnFlask] Flask Service URL: ${FLASK_SERVICE_URL}`);
  try {
    const uploadScriptPath = path.join(__dirname, 'upload_and_report.py');
    const uploadScriptContent = fs.readFileSync(uploadScriptPath, 'utf8');
    const payload = prepareJobInitializationPayload(jobId, started_at, uploadScriptContent, config);

    // Add repository information if available in config
    if (config.repository) {
      payload.repo_url = config.repository;
      payload.script_folder = config.script_folder || '';
      payload.branch = config.branch || 'main';
      console.log(
        `[initializeJobOnFlask] Added repository information to payload: ${config.repository}, branch: ${payload.branch}`,
      );
    }

    const initResponse = await fetch(`${FLASK_SERVICE_URL}/initialize_job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!initResponse.ok) {
      console.error(
        `[initializeJobOnFlask] Failed to initialize job ${jobId}: ${initResponse.statusText}`,
      );
      throw new Error(`Failed to initialize job on Flask: ${initResponse.statusText}`);
    }
    console.log(`[initializeJobOnFlask] Successfully initialized job ${jobId} on Flask service`);
    return true;
  } catch (error) {
    console.error(`[initializeJobOnFlask] Error initializing job ${jobId}: ${error.message}`);
    console.error(`[initializeJobOnFlask] Full error details:`, error);
    throw error;
  }
}

async function finalizeJobOnFlask(
  jobId,
  started_at,
  overallStatus,
  output,
  supabase,
  FLASK_SERVICE_URL,
) {
  console.log(`[finalizeJobOnFlask] Finalizing job ${jobId} on Flask service`);
  try {
    const finalizePayload = prepareJobFinalizationPayload(
      jobId,
      started_at,
      overallStatus,
      output.env || 'prod',
      output.config_name || '',
    );
    const finalizeResponse = await fetch(`${FLASK_SERVICE_URL}/finalize_job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalizePayload),
    });
    if (!finalizeResponse.ok) {
      console.error(
        `[finalizeJobOnFlask] Failed to finalize job ${jobId}: ${finalizeResponse.statusText}`,
      );
      throw new Error(`Failed to finalize job on Flask: ${finalizeResponse.statusText}`);
    }
    const finalizeData = await finalizeResponse.json();
    console.log(
      `[finalizeJobOnFlask] Successfully finalized job ${jobId}. Report URL: ${finalizeData.report_url || 'N/A'}`,
    );

    // Update job record with report URL if available
    if (finalizeData.report_url) {
      const { error: reportError } = await supabase
        .from('jobs_run')
        .update({ report_url: finalizeData.report_url })
        .eq('id', jobId);
      if (reportError) {
        console.error(
          `[finalizeJobOnFlask] Failed to update job ${jobId} with report URL: ${reportError.message}`,
        );
      }
    }

    // Update job status in Supabase
    const { error: updateError } = await supabase
      .from('jobs_run')
      .update({
        status: overallStatus,
        completed_at: new Date().toISOString(),
        output: output,
      })
      .eq('id', jobId);
    if (updateError) {
      console.error(
        `[finalizeJobOnFlask] Failed to update job ${jobId} status in Supabase: ${updateError.message}`,
      );
      throw new Error(`Failed to update job status: ${updateError.message}`);
    }
    return finalizeData.report_url || null;
  } catch (error) {
    console.error(`[finalizeJobOnFlask] Error finalizing job ${jobId}: ${error.message}`);
    // Fallback to updating job status without report URL
    const { error: updateError } = await supabase
      .from('jobs_run')
      .update({
        status: overallStatus,
        completed_at: new Date().toISOString(),
        output: output,
      })
      .eq('id', jobId);
    if (updateError) {
      console.error(
        `[finalizeJobOnFlask] Failed to update job ${jobId} status after error: ${updateError.message}`,
      );
    }
    throw error;
  }
}

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
  env,
  config_name,
) {
  console.log(`[executeFlaskScripts] No hosts found, forwarding to Flask service`);

  let output = { scripts: [], stdout: '', stderr: '', env: env, config_name: config_name };
  let overallStatus = 'success';

  // Initialize job on Flask service
  try {
    await initializeJobOnFlask(jobId, started_at, config, FLASK_SERVICE_URL);
  } catch (error) {
    console.error(`[executeFlaskScripts] Initialization failed for job ${jobId}: ${error.message}`);
    output.stderr = `Initialization failed: ${error.message}`;
    overallStatus = 'failed';
    await supabase
      .from('jobs_run')
      .update({
        status: overallStatus,
        completed_at: new Date().toISOString(),
        output: output,
      })
      .eq('id', jobId);
    return { output, overallStatus, started_at };
  }

  for (const script of config.scripts || []) {
    const scriptPath = script.path;
    const scriptName = scriptPath.split('/').pop();
    const fullScriptPath = config.script_folder
      ? `${config.script_folder}/${scriptName}`
      : scriptPath;
    const parameters = script.parameters || '';
    const timeout = config.execution?.timeout || script.timeout || 30;
    const retryOnFailure = script.retry_on_failure || 0;
    const iterations = script.iterations || 1;

    for (let i = 1; i <= iterations; i++) {
      let retries = retryOnFailure + 1;
      let attempt = 0;
      let scriptOutput = { script_path: fullScriptPath, iteration: i, stdout: '', stderr: '' };
      let scriptStatus = 'failed';

      // Create script execution record in database
      const scriptExecutionId = await createScriptExecution(supabase, {
        job_run_id: jobId,
        config_id: config_id,
        team_id: team_id,
        creator_id: creator_id,
        script_name: scriptName,
        script_path: fullScriptPath,
        script_parameters: { parameters, iteration: i },
        env: env,
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
          // Add iteration and trace_folder parameters
          const iterationParam = `--iteration ${i}`;
          const formattedDateTime =
            started_at.split('T')[0].replace(/-/g, '') +
            '_' +
            started_at.split('T')[1].split('.')[0].replace(/:/g, '');
          const traceFolderParam = `--trace_folder uploadFolder/${formattedDateTime}_${jobId}/${formattedDateTime}_${scriptExecutionId}`;
          const finalParameters = parameters
            ? `${parameters} ${iterationParam} ${traceFolderParam}`
            : `${iterationParam} ${traceFolderParam}`;
          const payload = {
            script_path: fullScriptPath,
            parameters: finalParameters,
            timeout: timeout,
            environment_variables: envVars,
            created_at: started_at,
            job_id: jobId,
            script_id: scriptExecutionId,
            env: env,
            config_name: config_name,
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
            `[executeFlaskScripts] Sending payload to Flask (attempt ${attempt}/${retries}, iteration ${i}/${iterations}): ` +
              JSON.stringify(
                {
                  script_path: payload.script_path,
                  parameters: payload.parameters,
                  timeout: payload.timeout,
                  created_at: payload.created_at,
                  job_id: payload.job_id,
                  script_id: payload.script_id,
                  env: payload.env,
                  config_name: payload.config_name || '',
                  repo_url: payload.repo_url || '',
                  script_folder: payload.script_folder || '',
                  branch: payload.branch || '',
                  environment_variables: payload.environment_variables
                    ? Object.keys(payload.environment_variables).reduce(
                        (acc, key) => ({ ...acc, [key]: '***MASKED***' }),
                        {},
                      )
                    : {},
                },
                null,
                2,
              ),
          );
          console.log(`[executeFlaskScripts] Full Flask Service URL: ${FLASK_SERVICE_URL}/execute`);
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
          console.log(`[executeFlaskScripts] Error details:`, {
            status: err.response?.status,
            headers: err.response?.headers,
            data: err.response?.data,
            message: err.message,
          });

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

  // Finalize job on Flask service
  try {
    await finalizeJobOnFlask(jobId, started_at, overallStatus, output, supabase, FLASK_SERVICE_URL);
  } catch (error) {
    console.error(`[executeFlaskScripts] Finalization failed for job ${jobId}: ${error.message}`);
  }

  return { output, overallStatus, started_at };
}

module.exports = { executeFlaskScripts, initializeJobOnFlask, finalizeJobOnFlask };
