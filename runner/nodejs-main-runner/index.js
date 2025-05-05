// Built-in Node.js modules
const http = require('http');

// Third-party modules
const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const axios = require('axios');
const cron = require('node-cron');
const { Client } = require('ssh2');

// Import utility modules
const { pingRepository } = require('./repoUtils');
const { generateAndUploadReport } = require('./reportUtils');
const { decrypt } = require('./utils');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const runnerId = process.env.RUNNER_ID || 'default-runner';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FLASK_SERVICE_URL = process.env.PYTHON_SLAVE_RUNNER_FLASK_SERVICE_URL;

async function processJob() {
  try {
    const queueLength = await redis.llen('jobs_queue');
    console.log(`[processJob] Queue length: ${queueLength} jobs`);

    const job = await redis.rpop('jobs_queue');
    if (!job) {
      console.log(`[processJob] Queue is empty`);
      return;
    }

    console.log(`[processJob] Processing job: ${job}`);
    const jobData = typeof job === 'string' ? JSON.parse(job) : job;
    const { config_id } = jobData;

    const { data, error } = await supabase
      .from('jobs_configuration')
      .select('config, is_active, team_id')
      .eq('id', config_id)
      .single();
    if (error || !data) {
      console.error(`[processJob] Failed to fetch config ${config_id}: ${error?.message}`);
      return;
    }
    const config = data.config;
    const team_id = data.team_id;
    if (!data.is_active) {
      console.log(`[processJob] Config ${config_id} is inactive, skipping execution`);
      return;
    }
    console.log(`[processJob] Config: ${JSON.stringify(config)}`);

    // Fetch encrypted environment variables for the team only if running from a repository
    let encryptedEnvVars = {};
    let decryptedEnvVars = {};
    if (team_id) {
      // Fetch team-specific environment variables
      const { data: teamEnvVarsData, error: teamEnvVarsError } = await supabase
        .from('environment_variables')
        .select('key, value')
        .eq('team_id', team_id);

      if (teamEnvVarsError) {
        console.error(
          `[processJob] Failed to fetch team-specific environment variables for team ${team_id}: ${teamEnvVarsError.message}`,
        );
      }

      // Fetch tenant_id for the team to get shared variables
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('tenant_id')
        .eq('id', team_id)
        .single();

      let sharedEnvVarsData = [];
      if (teamError) {
        console.error(
          `[processJob] Failed to fetch tenant for team ${team_id}: ${teamError.message}`,
        );
      } else if (teamData && teamData.tenant_id) {
        // Fetch shared variables for the tenant
        const { data: sharedData, error: sharedError } = await supabase
          .from('shared_environment_variables')
          .select('key, value')
          .eq('tenant_id', teamData.tenant_id);

        if (sharedError) {
          console.error(
            `[processJob] Failed to fetch shared environment variables for tenant ${teamData.tenant_id}: ${sharedError.message}`,
          );
        } else if (sharedData) {
          sharedEnvVarsData = sharedData;
        }
      }

      // Combine shared and team-specific variables (team-specific take precedence)
      const combinedEnvVars = {
        ...(sharedEnvVarsData || []).reduce((acc, { key, value }) => {
          acc[key] = value;
          return acc;
        }, {}),
        ...(teamEnvVarsData || []).reduce((acc, { key, value }) => {
          acc[key] = value;
          return acc;
        }, {}),
      };

      encryptedEnvVars = combinedEnvVars;

      // Decrypt environment variables
      decryptedEnvVars = Object.fromEntries(
        Object.entries(encryptedEnvVars).map(([key, value]) => {
          if (value && typeof value === 'string' && value.includes(':')) {
            try {
              const decryptedValue = decrypt(value, process.env.ENCRYPTION_KEY);
              console.log(`[processJob] Decrypted environment variable: ${key}`);
              return [key, decryptedValue];
            } catch (err) {
              console.error(
                `[processJob] Failed to decrypt environment variable ${key}: ${err.message}`,
              );
              return [key, value];
            }
          }
          return [key, value];
        }),
      );
      console.log(
        `[processJob] Fetched and processed ${Object.keys(encryptedEnvVars).length} environment variables (team-specific: ${teamEnvVarsData?.length || 0}, shared: ${sharedEnvVarsData?.length || 0}) for team ${team_id}`,
      );
    } else {
      console.log(`[processJob] Skipping environment variables fetch: team_id=${team_id}`);
    }

    const created_at = new Date().toISOString();
    const { data: jobRunData, error: jobError } = await supabase
      .from('jobs_run')
      .insert({
        config_id,
        status: 'pending',
        output: { scripts: [] },
        created_at: created_at,
      })
      .select('id')
      .single();

    if (jobError) {
      console.error(`[processJob] Failed to create pending job: ${jobError.message}`);
      return;
    }

    const jobId = jobRunData.id;
    console.log(`[processJob] Created job with ID ${jobId} and status 'pending'`);

    let output = { scripts: [], stdout: '', stderr: '' };
    let overallStatus = 'success';
    let started_at = created_at; // Initialize started_at with created_at as fallback

    const hasHosts = config.hosts && config.hosts.length > 0;

    if (!hasHosts) {
      console.log(`[processJob] No hosts found, forwarding to Flask service`);

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
                created_at: created_at,
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
                  `[processJob] Failed to update job ${jobId} to in_progress: ${statusError.message}`,
                );
                scriptOutput.stderr = `Failed to update job status: ${statusError.message}`;
                overallStatus = 'failed';
                output.scripts.push(scriptOutput);
                continue;
              }

              console.log(`[processJob] Updated job ${jobId} status to 'in_progress'`);

              console.log(
                `[processJob] Sending payload to Flask (attempt ${attempt}/${retries}, iteration ${i}/${iterations}): ${JSON.stringify({ ...payload, environment_variables: payload.environment_variables ? Object.keys(payload.environment_variables).reduce((acc, key) => ({ ...acc, [key]: '***MASKED***' }), {}) : {} })}`,
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
                  `[processJob] Script status determined by exit code: ${scriptStatus} (exitCode: ${response.data.output.exitCode})`,
                );
              } else {
                scriptStatus = response.data.status;
                console.log(
                  `[processJob] Script status determined by response status: ${scriptStatus} (no exit code available)`,
                );
              }

              // Add associated files to output if available
              if (response.data.associated_files) {
                output.associated_files = response.data.associated_files;
              }

              console.log(
                `[processJob] Received response from Flask for job ${jobId}: status=${scriptStatus}, stdout=${scriptOutput.stdout}, stderr=${scriptOutput.stderr}`,
              );

              if (scriptStatus === 'success') {
                break;
              } else {
                console.log(
                  `[processJob] Script failed, attempt ${attempt}/${retries}: ${scriptOutput.stderr}`,
                );
              }
            } catch (err) {
              scriptOutput.stderr = err.response?.data?.message || err.message;
              console.log(
                `[processJob] Script error, attempt ${attempt}/${retries}: ${scriptOutput.stderr}`,
              );
            }
          }

          output.scripts.push(scriptOutput);
          if (scriptStatus !== 'success') {
            overallStatus = 'failed';
          }
        }
      }

      const completed_at = new Date().toISOString();
      const { error: finalStatusError } = await supabase
        .from('jobs_run')
        .update({
          status: overallStatus,
          output: output,
          completed_at: completed_at,
          runner_id: runnerId,
        })
        .eq('id', jobId);

      if (finalStatusError) {
        console.error(
          `[processJob] Failed to update final status for job ${jobId}: ${finalStatusError.message}`,
        );
      } else {
        console.log(`[processJob] Updated job ${jobId} to final status: ${overallStatus}`);
      }

      const reportUrl = await generateAndUploadReport(
        jobId,
        config_id,
        output,
        created_at,
        started_at,
        completed_at,
        overallStatus,
        decryptedEnvVars || {},
      );
      if (reportUrl) {
        const { error: reportError } = await supabase
          .from('jobs_run')
          .update({ report_url: reportUrl })
          .eq('id', jobId);
        if (reportError) {
          console.error(
            `[processJob] Failed to update report URL for job ${jobId}: ${reportError.message}`,
          );
        } else {
          console.log(`[processJob] Updated job ${jobId} with report URL: ${reportUrl}`);
        }
      }
    } else {
      const hosts = config.hosts;
      // Log current jobData state at the start of SSH section
      console.log(
        `[processJob] Job data at start of SSH section: team_id=${team_id}, config_id=${config_id}`,
      );

      for (const host of hosts) {
        console.log(`[processJob] Host: ${host.ip}, OS: ${host.os}, Username: ${host.username}`);
        let sshKeyOrPass = host.key || host.password;
        if (!sshKeyOrPass) {
          console.error(`[processJob] No key/password for ${host.ip}`);
          return;
        }

        if (host.authType === 'privateKey' && sshKeyOrPass.includes(':')) {
          try {
            sshKeyOrPass = decrypt(sshKeyOrPass, process.env.ENCRYPTION_KEY);
            console.log(`[processJob] Decrypted key: ${sshKeyOrPass.slice(0, 50)}...`);
          } catch (decryptError) {
            console.error(`[processJob] Decryption failed: ${decryptError.message}`);
            return;
          }
        } else {
          console.log(`[processJob] Plain key/password: ${sshKeyOrPass.slice(0, 50)}...`);
        }

        const scripts = (config.scripts || [])
          .map((script) => {
            const ext = script.path.split('.').pop().toLowerCase();
            const command = ext === 'py' ? 'python' : ext === 'sh' ? './' : '';
            return `${command} ${script.path} ${script.parameters || ''} 2>&1`.trim();
          })
          .join(' && ');

        console.log(`[processJob] Scripts: ${scripts}`);

        let repoCommands = '';
        let scriptFolder = config.script_folder || '';
        let repoDir = '';
        console.log(`[processJob] Script folder: ${scriptFolder}`);

        if (config.repository) {
          const repoUrl = config.repository;
          const branch = config.branch || 'main';

          const isRepoAccessible = await pingRepository(repoUrl);
          if (!isRepoAccessible) {
            console.error(
              `[processJob] Repository ${repoUrl} is not accessible, aborting job execution.`,
            );
            const completed_at = new Date().toISOString();
            await supabase
              .from('jobs_run')
              .update({
                status: 'failed',
                output: {
                  scripts: [],
                  stdout: '',
                  stderr: `Repository ${repoUrl} is not accessible, job aborted.`,
                },
                completed_at: completed_at,
              })
              .eq('id', jobId);
            console.log(
              `[processJob] Updated job ${jobId} to failed status due to inaccessible repository.`,
            );
            return;
          }

          // Derive repository directory name from the URL for meaningful identification
          repoDir =
            repoUrl
              .split('/')
              .pop()
              .replace(/\.git$/, '') || 'repo';

          if (host.os === 'windows') {
            console.log(
              `[processJob] WARNING: Git must be installed on Windows host ${host.ip} for repository operations.`,
            );
            // Use PowerShell for repository check and operations on Windows
            let repoScript = `if (Test-Path '${repoDir}') { Write-Output 'Repository exists, pulling latest changes'; cd '${repoDir}'; git pull origin ${branch} } else { Write-Output 'Repository does not exist, cloning'; git clone -b ${branch} ${repoUrl} '${repoDir}'; cd '${repoDir}' }`;
            repoCommands = `powershell -Command "${repoScript}"; cd '${scriptFolder}'`;
          } else {
            repoCommands = `
              if [ -d "${repoDir}" ]; then
                cd ${repoDir} && git pull origin ${branch} || exit 1
              else
                rm -rf ${repoDir} && git clone -b ${branch} ${repoUrl} ${repoDir} && cd ${repoDir} || exit 1
              fi
            `;
          }
          console.log(
            `[processJob] Repository setup: ${repoDir} exists ? git pull : clone ${repoUrl} branch ${branch}${scriptFolder ? `, then navigate to ${scriptFolder}` : ''}`,
          );
        } else {
          if (config.scripts && config.scripts.length > 0 && config.scripts[0].folder) {
            scriptFolder = config.scripts[0].folder;
            console.log(
              `[processJob] Using folder from script configuration as working directory: ${scriptFolder}`,
            );
          } else {
            console.log(
              `[processJob] No folder specified in script configuration or repository, using default SSH directory (if any)`,
            );
            // Not setting a specific scriptFolder, letting SSH use its default directory
          }
        }

        // Add environment variables to the SSH script
        let envSetup = '';
        if (Object.keys(decryptedEnvVars).length > 0) {
          envSetup =
            host.os === 'windows'
              ? Object.entries(decryptedEnvVars)
                  .map(([key, value]) => `set ${key}=${value}`)
                  .join(' && ')
              : Object.entries(decryptedEnvVars)
                  .map(([key, value]) => `export ${key}=${value}`)
                  .join(' && ');
          envSetup += host.os === 'windows' ? ' && ' : ' && ';
          console.log(
            `[processJob] Environment variables setup for SSH: ${Object.keys(decryptedEnvVars).join(', ')}`,
          );
        } else {
          console.log(`[processJob] No environment variables to set for SSH host ${host.ip}`);
        }
        const scriptCommand = `${scripts}`;
        let fullScript;
        if (host.os === 'windows') {
          fullScript = `${repoCommands}${repoCommands ? ' && ' : ''}${repoDir ? `cd ${repoDir} && ` : ''} cd ${scriptFolder} && powershell -Command "if (Test-Path 'requirements.txt') { pip install -r requirements.txt } else { Write-Output 'No requirements.txt file found, skipping pip install' }" && ${envSetup}python --version && echo ============================= && ${scriptCommand}`;
        } else {
          fullScript = `${repoCommands} ${repoCommands ? '' : repoDir ? `cd ${repoDir} && ` : ''} cd ${scriptFolder} && if [ -f "requirements.txt" ]; then pip install -r requirements.txt; else echo "No requirements.txt file found, skipping pip install"; fi && ${envSetup}python --version && echo ============================= && ${scriptCommand}`;
        }
        console.log(`[processJob] SSH command to be executed on ${host.ip}: ${fullScript}`);

        const conn = new Client();
        conn
          .on('ready', async () => {
            console.log(`[processJob] Connected to ${host.ip}`);

            started_at = new Date().toISOString();
            await supabase
              .from('jobs_run')
              .update({
                status: 'in_progress',
                started_at: started_at,
              })
              .eq('id', jobId);

            console.log(`[processJob] Updated job ${jobId} status to 'in_progress'`);

            conn.exec(fullScript, async (err, stream) => {
              if (err) {
                console.error(`[processJob] Exec error: ${err.message}`);
                await supabase
                  .from('jobs_run')
                  .update({
                    status: 'failed',
                    output: {
                      scripts: [
                        { script_path: 'N/A', iteration: 1, stdout: '', stderr: err.message },
                      ],
                    },
                    completed_at: new Date().toISOString(),
                  })
                  .eq('id', jobId);
                console.log(`[processJob] Updated job ${jobId} to failed status due to exec error`);
                conn.end();
                return;
              }

              let scriptOutput = {
                script_path: config.scripts[0]?.path || 'N/A',
                iteration: 1,
                stdout: '',
                stderr: '',
              };
              stream
                .on('data', (data) => {
                  scriptOutput.stdout += data;
                  console.log(`${data}`);
                })
                .stderr.on('data', (data) => {
                  scriptOutput.stderr += data;
                  console.log(`[processJob] Stderr: ${data}`);
                })
                .on('close', async (code, signal) => {
                  console.log(`[processJob] Final stdout: ${scriptOutput.stdout}`);
                  console.log(`[processJob] Final stderr: ${scriptOutput.stderr}`);
                  console.log(`[processJob] SSH connection closed: ${code}, signal: ${signal}`);

                  const completed_at = new Date().toISOString();
                  const isSuccess =
                    (scriptOutput.stdout && scriptOutput.stdout.includes('Test Success')) ||
                    code === 0;

                  output.scripts.push(scriptOutput);
                  if (!isSuccess) {
                    overallStatus = 'failed';
                  }

                  await supabase
                    .from('jobs_run')
                    .update({
                      status: isSuccess ? 'success' : 'failed',
                      output: output,
                      completed_at: completed_at,
                    })
                    .eq('id', jobId);

                  console.log(
                    `[processJob] Updated job ${jobId} to final status: ${isSuccess ? 'success' : 'failed'}`,
                  );

                  const sshReportUrl = await generateAndUploadReport(
                    jobId,
                    config_id,
                    output,
                    created_at,
                    started_at,
                    completed_at,
                    isSuccess ? 'success' : 'failed',
                    decryptedEnvVars || {},
                  );
                  if (sshReportUrl) {
                    const { error: sshReportError } = await supabase
                      .from('jobs_run')
                      .update({ report_url: sshReportUrl })
                      .eq('id', jobId);
                    if (sshReportError) {
                      console.error(
                        `[processJob] Failed to update report URL for SSH job ${jobId}: ${sshReportError.message}`,
                      );
                    } else {
                      console.log(
                        `[processJob] Updated job ${jobId} with SSH report URL: ${sshReportUrl}`,
                      );
                    }
                  }

                  conn.end();
                });
            });
          })
          .on('error', async (err) => {
            if (err.message.includes('ECONNRESET')) {
              console.error(`[processJob] SSH connection closed due to ECONNRESET`);
              const completed_at = new Date().toISOString();
              const isSuccess =
                output.scripts.length > 0 &&
                output.scripts[0].stdout &&
                output.scripts[0].stdout.includes('Test Success');

              await supabase
                .from('jobs_run')
                .update({
                  status: isSuccess ? 'success' : 'failed',
                  output: output,
                  error: 'ECONNRESET',
                  completed_at: completed_at,
                })
                .eq('id', jobId);
              console.log(
                `[processJob] Updated job ${jobId} to ${isSuccess ? 'success' : 'failed'} status despite ECONNRESET`,
              );
            } else {
              console.error(`[processJob] SSH error: ${err.message}`);
              await supabase
                .from('jobs_run')
                .update({
                  status: 'failed',
                  output: output,
                  error: err.message,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', jobId);
              console.log(`[processJob] Updated job ${jobId} to failed status due to SSH error`);
            }
            conn.end();
          })
          .connect({
            host: host.ip,
            port: host.port || 22,
            username: host.username,
            [host.authType === 'privateKey' ? 'privateKey' : 'password']: sshKeyOrPass,
          });
      }
    }
  } catch (error) {
    console.error(`[processJob] Error: ${error.message}`);
  }
}

async function setupSchedules() {
  const { data, error } = await supabase.from('jobs_configuration').select('id, config, is_active');
  if (error) {
    console.error(`Failed to fetch configs for scheduling: ${error.message}`);
    return;
  }
  if (!data || data.length === 0) {
    console.log('No configs found for scheduling.');
    return;
  }

  data.forEach(({ id, config, is_active }) => {
    if (!config || !config.schedule || !is_active) return;
    const job = JSON.stringify({
      config_id: id,
      timestamp: new Date().toISOString(),
      requested_by: 'system',
    });
    if (config.schedule !== 'now') {
      cron.schedule(config.schedule, async () => {
        await redis.lpush('jobs_queue', job);
        console.log(`Scheduled job queued for config ${id}`);
      });
    }
  });
}

setInterval(processJob, 10000);
setupSchedules().catch((err) => console.error('Setup schedules failed:', err));
console.log('Worker running...');

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[server] Server listening on port ${PORT}`);
});
