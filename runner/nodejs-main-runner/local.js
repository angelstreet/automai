require('dotenv').config();
const crypto = require('crypto');

const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const axios = require('axios');
const { Client } = require('ssh2');
const ALGORITHM = 'aes-256-gcm';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const FLASK_SERVICE_URL = process.env.PYTHON_SLAVE_RUNNER_FLASK_SERVICE_URL;

function decrypt(encryptedData, keyBase64) {
  const key = Buffer.from(keyBase64, 'base64');
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function processJob() {
  try {
    // Check if -payload argument is provided
    const usePayload = process.argv.includes('-payload');
    let jobData;
    let config;
    let job;

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
        console.log(
          `[@local-runner:processJob] Custom payload parsed successfully: ${JSON.stringify(jobData, null, 2)}`,
        );
      } catch (err) {
        console.error(`[@local-runner:processJob] Failed to parse PAYLOAD: ${err.message}`);
        return;
      }
    } else {
      const queueLength = await redis.llen('jobs_queue');
      console.log(`[@local-runner:processJob] Queue length: ${queueLength} jobs`);

      const jobs = await redis.lrange('jobs_queue', -1, -1);
      if (!jobs || jobs.length === 0) {
        console.log(`[@local-runner:processJob] Queue is empty`);
        return;
      }
      job = jobs[0];

      console.log(`[@local-runner:processJob] Processing job: ${JSON.stringify(job)}`);
      jobData = typeof job === 'string' ? JSON.parse(job) : job;
    }

    // Fetch config and team_id from Supabase using config_id
    const { data, error } = await supabase
      .from('jobs_configuration')
      .select('config, team_id')
      .eq('id', jobData.config_id)
      .single();
    if (error || !data) {
      console.error(
        `[@local-runner:processJob] Failed to fetch config and team_id for ${jobData.config_id}: ${error?.message}`,
      );
      return;
    }
    config = data.config;
    jobData.team_id = data.team_id;
    console.log(`[@local-runner:processJob] Config: ${JSON.stringify(config)}`);
    console.log(
      `[@local-runner:processJob] Fetched team_id: ${jobData.team_id} for config_id: ${jobData.config_id}`,
    );

    // Create job with pending status in Supabase (even for custom payload)
    const created_at = new Date().toISOString();
    const { data: jobRunData, error: jobError } = await supabase
      .from('jobs_run')
      .insert({
        config_id: jobData.config_id || 'b0238c60-fc08-4008-a445-6ee35b99e83c', // Use testing job configuration ID for custom payloads
        status: 'pending',
        output: { scripts: [] },
        created_at: created_at,
      })
      .select('id')
      .single();

    if (jobError) {
      console.error(`[@local-runner:processJob] Failed to create pending job: ${jobError.message}`);
      return;
    }

    const jobId = jobRunData.id;
    console.log(`[@local-runner:processJob] Created job with ID ${jobId} and status 'pending'`);

    let output = { scripts: [] };
    let overallStatus = 'success';

    // Check if hosts are specified in the config (for SSH execution)
    const hasHosts = config.hosts && config.hosts.length > 0;
    if (hasHosts) {
      console.log(`[@local-runner:processJob] Hosts specified, processing with SSH execution`);
      const hosts = config.hosts;
      for (const host of hosts) {
        console.log(
          `[@local-runner:processJob] Host: ${host.ip}, OS: ${host.os}, Username: ${host.username}`,
        );
        let sshKeyOrPass = host.key || host.password;
        if (!sshKeyOrPass) {
          console.error(`[@local-runner:processJob] No key/password for ${host.ip}`);
          overallStatus = 'failed';
          output.scripts.push({
            script_path: null,
            iteration: null,
            stdout: '',
            stderr: `No key/password provided for host ${host.ip}`,
          });
          continue;
        }

        if (host.authType === 'privateKey' && sshKeyOrPass.includes(':')) {
          try {
            sshKeyOrPass = decrypt(sshKeyOrPass, process.env.ENCRYPTION_KEY);
            console.log(
              `[@local-runner:processJob] Decrypted key: ${sshKeyOrPass.slice(0, 50)}...`,
            );
          } catch (decryptError) {
            console.error(`[@local-runner:processJob] Decryption failed: ${decryptError.message}`);
            overallStatus = 'failed';
            output.scripts.push({
              script_path: null,
              iteration: null,
              stdout: '',
              stderr: `Decryption failed for key of host ${host.ip}: ${decryptError.message}`,
            });
            continue;
          }
        } else {
          console.log(
            `[@local-runner:processJob] Plain key/password: ${sshKeyOrPass.slice(0, 50)}...`,
          );
        }

        const scripts = (config.scripts || [])
          .map((script) => {
            const ext = script.path.split('.').pop().toLowerCase();
            const command = ext === 'py' ? 'python' : ext === 'sh' ? './' : '';
            return `${command} ${script.path} ${script.parameters || ''}`.trim() + ' ';
          })
          .join(' && ');

        console.log(`[@local-runner:processJob] Scripts: ${scripts}`);

        let repoCommands = '';
        let scriptFolder = config.script_folder || (usePayload && jobData.script_folder) || '';
        let repoDir = '';
        console.log(`[@local-runner:processJob] Script folder: ${scriptFolder}`);
        if (config.repository) {
          const repoUrl = config.repository;
          const branch = config.branch || 'main';
          // Derive repository directory name from the URL for meaningful identification
          repoDir =
            repoUrl
              .split('/')
              .pop()
              .replace(/\.git$/, '') || 'repo';
          if (host.os === 'windows') {
            console.log(
              `[@local-runner:processJob] WARNING: Git must be installed on Windows host ${host.ip} for repository operations.`,
            );
            // Use PowerShell for repository check and operations on Windows with a single command block
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
        }

        // Add environment variables to the SSH script
        let envSetup = '';
        let decryptedEnvVars = {}; // Placeholder for environment variables logic
        // Fetch encrypted environment variables for the team only if running from a repository
        if (jobData.team_id && config.repository) {
          const { data: envVarsData, error: envVarsError } = await supabase
            .from('environment_variables')
            .select('key, value')
            .eq('team_id', jobData.team_id);
          if (envVarsError) {
            console.error(
              `[@local-runner:processJob] Failed to fetch environment variables for team ${jobData.team_id}: ${envVarsError.message}`,
            );
          } else if (envVarsData && envVarsData.length > 0) {
            const encryptedEnvVars = envVarsData.reduce((acc, { key, value }) => {
              acc[key] = value;
              return acc;
            }, {});
            // Decrypt environment variables
            decryptedEnvVars = Object.fromEntries(
              Object.entries(encryptedEnvVars).map(([key, value]) => {
                if (value && typeof value === 'string' && value.includes(':')) {
                  try {
                    const decryptedValue = decrypt(value, process.env.ENCRYPTION_KEY);
                    console.log(
                      `[@local-runner:processJob] Decrypted environment variable: ${key}`,
                    );
                    return [key, decryptedValue];
                  } catch (err) {
                    console.error(
                      `[@local-runner:processJob] Failed to decrypt environment variable ${key}: ${err.message}`,
                    );
                    return [key, value];
                  }
                }
                return [key, value];
              }),
            );
            console.log(
              `[@local-runner:processJob] Fetched and processed ${envVarsData.length} environment variables for team ${jobData.team_id} due to repository configuration`,
            );
          } else {
            console.log(
              `[@local-runner:processJob] No environment variables found for team ${jobData.team_id}`,
            );
          }
        } else {
          console.log(
            `[@local-runner:processJob] Skipping environment variables fetch: team_id=${jobData.team_id}, repository=${!!config.repository}`,
          );
        }

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
            `[@local-runner:processJob] Environment variables setup for SSH: ${Object.keys(decryptedEnvVars).join(', ')}`,
          );
        } else {
          console.log(
            `[@local-runner:processJob] No environment variables to set for SSH host ${host.ip}`,
          );
        }
        const scriptCommand = `${scripts}`;
        let fullScript;

        if (host.os === 'windows') {
          fullScript = `${repoCommands} ${repoCommands ? '' : repoDir ? `cd /d ${repoDir}/${scriptFolder} && ` : ''} && cd ${repoDir}/${scriptFolder} && pip install -r requirements.txt && ${envSetup}python --version && echo ============================= && ${scriptCommand}`;
          console.log(
            `[@local-runner:processJob] Using PowerShell command structure for Windows host ${host.ip}`,
          );
        } else {
          fullScript = `
            ${repoCommands} ${repoCommands ? '' : repoDir ? `cd ${repoDir} && ` : ''} ${envSetup}python --version && ls -l && echo ============================= && ${scriptCommand}
          `.trim();
        }
        console.log(
          `[@local-runner:processJob] SSH command to be executed on ${host.ip}: ${fullScript}`,
        );
        //return;
        const conn = new Client();
        conn
          .on('ready', async () => {
            console.log(`[@local-runner:processJob] Connected to ${host.ip}`);

            const started_at = new Date().toISOString();
            await supabase
              .from('jobs_run')
              .update({
                status: 'in_progress',
                started_at: started_at,
              })
              .eq('id', jobId);

            console.log(`[@local-runner:processJob] Updated job ${jobId} status to 'in_progress'`);

            // Initialize output fields to ensure they are defined
            output.stdout = '';
            output.stderr = '';
            console.log(`[@local-runner:processJob] Starting SSH command execution on ${host.ip}`);

            conn.exec(fullScript, async (err, stream) => {
              if (err) {
                console.error(
                  `[@local-runner:processJob] Exec error on ${host.ip}: ${err.message}`,
                );
                await supabase
                  .from('jobs_run')
                  .update({
                    status: 'failed',
                    output: { stderr: err.message },
                    completed_at: new Date().toISOString(),
                  })
                  .eq('id', jobId);
                console.log(
                  `[@local-runner:processJob] Updated job ${jobId} to failed status due to exec error on ${host.ip}`,
                );
                conn.end();
                return;
              }
              console.log(`[@local-runner:processJob] SSH command execution started on ${host.ip}`);

              stream
                .on('data', (data) => {
                  output.stdout += data;
                  console.log(`[@local-runner:processJob] Stdout from ${host.ip}: ${data}`);
                })
                .stderr.on('data', (data) => {
                  output.stderr += data;
                  console.log(`[@local-runner:processJob] Stderr from ${host.ip}: ${data}`);
                })
                .on('close', async (code, signal) => {
                  console.log(
                    `[@local-runner:processJob] SSH command execution completed on ${host.ip}`,
                  );
                  console.log(
                    `[@local-runner:processJob] Final stdout from ${host.ip}: ${output.stdout}`,
                  );
                  console.log(
                    `[@local-runner:processJob] Final stderr from ${host.ip}: ${output.stderr}`,
                  );
                  console.log(
                    `[@local-runner:processJob] SSH connection closed on ${host.ip}: code=${code}, signal=${signal}`,
                  );

                  const completed_at = new Date().toISOString();
                  const isSuccess =
                    (output.stdout && output.stdout.includes('Test Success')) || code === 0;

                  await supabase
                    .from('jobs_run')
                    .update({
                      status: isSuccess ? 'success' : 'failed',
                      output: output,
                      completed_at: completed_at,
                    })
                    .eq('id', jobId);

                  console.log(
                    `[@local-runner:processJob] Updated job ${jobId} to final status: ${isSuccess ? 'success' : 'failed'} on ${host.ip}`,
                  );

                  conn.end();
                });
            });
          })
          .on('error', async (err) => {
            if (err.message.includes('ECONNRESET')) {
              console.error(`[@local-runner:processJob] SSH connection closed due to ECONNRESET`);
              const completed_at = new Date().toISOString();
              const isSuccess = output.stdout && output.stdout.includes('Test Success');

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
                `[@local-runner:processJob] Updated job ${jobId} to ${isSuccess ? 'success' : 'failed'} status despite ECONNRESET`,
              );
            } else {
              console.error(`[@local-runner:processJob] SSH error: ${err.message}`);
              await supabase
                .from('jobs_run')
                .update({
                  status: 'failed',
                  output: output,
                  error: err.message,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', jobId);
              console.log(
                `[@local-runner:processJob] Updated job ${jobId} to failed status due to SSH error`,
              );
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
    } else {
      console.log(`[@local-runner:processJob] Forwarding to Flask service for local execution`);

      // Process each script sequentially
      for (const script of config.scripts || []) {
        const scriptPath = script.path;
        const parameters = script.parameters || '';
        const timeout = script.timeout || 30;
        const retryOnFailure = script.retry_on_failure || 0;
        const iterations = script.iterations || 1;

        if (!scriptPath) {
          console.error(`[@local-runner:processJob] No script path provided for script`);
          overallStatus = 'failed';
          output.scripts.push({
            script_path: null,
            iteration: null,
            stdout: '',
            stderr: 'No script path provided',
          });
          continue;
        }

        // Execute each iteration
        for (let i = 1; i <= iterations; i++) {
          let retries = retryOnFailure + 1;
          let attempt = 0;
          let scriptOutput = { script_path: scriptPath, iteration: i, stdout: '', stderr: '' };
          let scriptStatus = 'failed';

          while (attempt < retries) {
            attempt++;
            try {
              // Build payload with iteration number appended to parameters
              const payload = {
                script_path: scriptPath,
                parameters: parameters ? `${parameters} ${i}` : `${i}`,
                timeout: timeout,
              };

              if (config.repository) {
                payload.repo_url = config.repository;
                payload.script_folder = config.script_folder || '';
                payload.branch = config.branch || 'main';
              }

              console.log(
                `[@local-runner:processJob] Sending payload to Flask (attempt ${attempt}/${retries}, iteration ${i}/${iterations}): ${JSON.stringify(payload)}`,
              );
              const response = await axios.post(`${FLASK_SERVICE_URL}/execute`, payload, {
                timeout: (payload.timeout + 5) * 1000,
              });

              scriptOutput.stdout = response.data.output.stdout || '';
              scriptOutput.stderr = response.data.output.stderr || '';
              scriptStatus = response.data.status;

              if (scriptStatus === 'success') {
                break;
              } else {
                console.log(
                  `[@local-runner:processJob] Script failed, attempt ${attempt}/${retries}: ${scriptOutput.stderr}`,
                );
              }
            } catch (err) {
              scriptOutput.stderr = err.response?.data?.message || err.message;
              console.log(
                `[@local-runner:processJob] Script error, attempt ${attempt}/${retries}: ${scriptOutput.stderr}`,
              );
            }
          }

          output.scripts.push(scriptOutput);
          if (scriptStatus !== 'success') {
            overallStatus = 'failed';
          }
        }
      }
    }

    if (!hasHosts) {
      const completed_at = new Date().toISOString();
      await supabase
        .from('jobs_run')
        .update({
          status: overallStatus,
          output: output,
          completed_at: completed_at,
        })
        .eq('id', jobId);

      console.log(
        `[@local-runner:processJob] Updated job ${jobId} to final status: ${overallStatus}`,
      );
    }

    // Remove job from queue after processing (only if not using custom payload)
    if (!usePayload && typeof job !== 'undefined') {
      await redis.lrem('jobs_queue', 1, job);
      console.log(`[@local-runner:processJob] Removed job from queue`);
    }
  } catch (error) {
    console.error(`[@local-runner:processJob] Error: ${error.message}`);
  }
}

// Run immediately for testing
processJob().then(() => console.log('[@local-runner] Test complete'));
