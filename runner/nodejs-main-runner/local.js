require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const axios = require('axios');
const ejs = require('ejs');
const { Client } = require('ssh2');

// Third-party modules for report generation and S3 upload (using Cloudflare R2)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const FLASK_SERVICE_URL = process.env.PYTHON_SLAVE_RUNNER_FLASK_SERVICE_URL;

// Import utility modules
const { pingRepository } = require('./repoUtils');
const reportTemplate = require('./reportTemplate');
const { decrypt } = require('./utils');

async function processJob() {
  try {
    // Check if -payload argument is provided
    const usePayload = process.argv.includes('-p') || process.argv.includes('--payload');
    const showHelp = process.argv.includes('-h') || process.argv.includes('--help');

    if (showHelp) {
      console.log(`[@local-runner:help] Available command-line options for local.js:`);
      console.log(`  -p, --payload    Use a custom payload from the PAYLOAD environment variable`);
      console.log(`  -h, --help       Display this help message`);
      process.exit(0);
    }

    let jobData;
    let config;

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
        config = jobData;
        console.log(
          `[@local-runner:processJob] Custom payload parsed successfully: ${JSON.stringify(jobData, null, 2)}`,
        );

        // For custom payload, always fetch team_id from the default config
        const defaultConfigId = 'b0238c60-fc08-4008-a445-6ee35b99e83c';
        const { data: configData, error: configError } = await supabase
          .from('jobs_configuration')
          .select('team_id')
          .eq('id', defaultConfigId)
          .single();

        if (!configError && configData && configData.team_id) {
          jobData.team_id = configData.team_id;
          config.team_id = configData.team_id; // Also set it in the config object
          console.log(
            `[@local-runner:processJob] Retrieved team_id from default config: ${jobData.team_id}`,
          );
        } else {
          console.log(
            `[@local-runner:processJob] Failed to get team_id from default config: ${configError?.message}`,
          );
        }
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
      const job = jobs[0];

      console.log(`[@local-runner:processJob] Processing job: ${JSON.stringify(job)}`);
      jobData = typeof job === 'string' ? JSON.parse(job) : job;

      // Fetch config and team_id from Supabase
      const { data, error } = await supabase
        .from('jobs_configuration')
        .select('config, team_id')
        .eq('id', jobData.config_id)
        .single();
      if (error || !data) {
        console.error(
          `[@local-runner:processJob] Failed to fetch config ${jobData.config_id}: ${error?.message}`,
        );
        return;
      }
      config = data.config;
      // Set team_id from jobs_configuration
      if (data.team_id) {
        jobData.team_id = data.team_id;
        console.log(
          `[@local-runner:processJob] Retrieved team_id from jobs_configuration: ${jobData.team_id}`,
        );
      } else {
        console.log(
          `[@local-runner:processJob] No team_id found in jobs_configuration for config_id ${jobData.config_id}, skipping environment variables fetch`,
        );
      }
      console.log(`[@local-runner:processJob] Config: ${JSON.stringify(config)}`);
      console.log(
        `[@local-runner:processJob] Full jobData after setting team_id: ${JSON.stringify(jobData)}`,
      );
    }

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

      // Make sure we explicitly set the team_id in the config object to ensure it's available
      config.team_id = jobData.team_id;
      console.log(
        `[@local-runner:processJob] Ensuring team_id is available in config: ${config.team_id}`,
      );

      const hosts = config.hosts;
      // Log current jobData state at the start of SSH section
      console.log(
        `[@local-runner:processJob] JobData at start of SSH section: team_id=${jobData.team_id}, config_id=${jobData.config_id}`,
      );

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

          const isRepoAccessible = await pingRepository(repoUrl);
          if (!isRepoAccessible) {
            console.error(
              `[@local-runner:processJob] Repository ${repoUrl} is not accessible, aborting job execution.`,
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
              `[@local-runner:processJob] Updated job ${jobId} to failed status due to inaccessible repository.`,
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
        let decryptedEnvVars = {};
        // Log current jobData state before env var fetch
        console.log(
          `[@local-runner:processJob] DEBUG - JobData before env fetch: team_id=${jobData.team_id}, has config_id=${!!jobData.config_id}`,
        );

        // Use config.team_id as the primary source and fall back to jobData.team_id
        const team_id = config.team_id || jobData.team_id;
        console.log(`[@local-runner:processJob] Using team_id for env variables: ${team_id}`);

        // Fetch encrypted environment variables for the team only if running from a repository
        if (team_id && config.repository) {
          // Fetch team-specific environment variables
          const { data: teamEnvVarsData, error: teamEnvVarsError } = await supabase
            .from('environment_variables')
            .select('key, value')
            .eq('team_id', team_id);

          if (teamEnvVarsError) {
            console.error(
              `[@local-runner:processJob] Failed to fetch team-specific environment variables for team ${team_id}: ${teamEnvVarsError.message}`,
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
              `[@local-runner:processJob] Failed to fetch tenant for team ${team_id}: ${teamError.message}`,
            );
          } else if (teamData && teamData.tenant_id) {
            // Fetch shared variables for the tenant
            const { data: sharedData, error: sharedError } = await supabase
              .from('shared_environment_variables')
              .select('key, value')
              .eq('tenant_id', teamData.tenant_id);

            if (sharedError) {
              console.error(
                `[@local-runner:processJob] Failed to fetch shared environment variables for tenant ${teamData.tenant_id}: ${sharedError.message}`,
              );
            } else if (sharedData) {
              sharedEnvVarsData = sharedData;
            }
          }

          // Combine variables, with team-specific taking precedence over shared
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

          const encryptedEnvVars = combinedEnvVars;

          // Decrypt environment variables
          decryptedEnvVars = Object.fromEntries(
            Object.entries(encryptedEnvVars).map(([key, value]) => {
              if (value && typeof value === 'string' && value.includes(':')) {
                try {
                  const decryptedValue = decrypt(value, process.env.ENCRYPTION_KEY);
                  console.log(`[@local-runner:processJob] Decrypted environment variable: ${key}`);
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
            `[@local-runner:processJob] Fetched and processed ${Object.keys(encryptedEnvVars).length} environment variables (team-specific: ${teamEnvVarsData?.length || 0}, shared: ${sharedEnvVarsData?.length || 0}) for team ${team_id} due to repository configuration`,
          );
        } else {
          console.log(
            `[@local-runner:processJob] Skipping environment variables fetch: team_id=${team_id}, repository=${!!config.repository}`,
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
          fullScript = `${repoCommands}${repoCommands ? ' && ' : ''}${repoDir ? `cd ${repoDir} && ` : ''} cd ${scriptFolder} && powershell -Command "if (Test-Path 'requirements.txt') { pip install -r requirements.txt } else { Write-Output 'No requirements.txt file found, skipping pip install' }" && ${envSetup}python --version && echo ============================= && ${scriptCommand}`;
        } else {
          fullScript = `${repoCommands} ${repoCommands ? '' : repoDir ? `cd ${repoDir} && ` : ''} cd ${scriptFolder} && if [ -f "requirements.txt" ]; then pip install -r requirements.txt; else echo "No requirements.txt file found, skipping pip install"; fi && ${envSetup}python --version && echo ============================= && ${scriptCommand}`;
        }
        console.log(
          `[@local-runner:processJob] SSH command to be executed on ${host.ip}: ${fullScript}`,
        );
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
                      runner_id: process.env.RUNNER_ID || 'local-runner',
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
                  runner_id: process.env.RUNNER_ID || 'local-runner',
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
                  runner_id: process.env.RUNNER_ID || 'local-runner',
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
        const timeout = config.execution?.timeout || script.timeout || 30;
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
              console.log(
                `[@local-runner:processJob] Full response from Flask (attempt ${attempt}/${retries}, iteration ${i}/${iterations}): ${JSON.stringify(response.data, null, 2)}`,
              );

              scriptOutput.stdout = response.data.output.stdout || '';
              scriptOutput.stderr = response.data.output.stderr || '';
              scriptStatus = response.data.status;

              // Add associated files to output if available
              if (response.data.associated_files) {
                output.associated_files = response.data.associated_files;
              }

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
          runner_id: process.env.RUNNER_ID || 'local-runner',
        })
        .eq('id', jobId);

      console.log(
        `[@local-runner:processJob] Updated job ${jobId} to final status: ${overallStatus}`,
      );

      // Ensure decryptedEnvVars is defined before calling generateAndUploadReport
      if (typeof decryptedEnvVars === 'undefined') {
        decryptedEnvVars = {};
        console.log(
          `[@local-runner:processJob] decryptedEnvVars was undefined, initialized as empty object`,
        );
      }

      const reportUrl = await generateAndUploadReport(
        jobId,
        jobData.config_id || 'b0238c60-fc08-4008-a445-6ee35b99e83c',
        output,
        created_at,
        created_at, // started_at is not defined in local.js, using created_at as placeholder
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
            `[@local-runner:processJob] Failed to update report URL for job ${jobId}: ${reportError.message}`,
          );
        } else {
          console.log(
            `[@local-runner:processJob] Updated job ${jobId} with report URL: ${reportUrl}`,
          );
        }
      }
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

// Configure S3 client for Cloudflare R2
const r2Client = new S3Client({
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  region: 'auto', // Cloudflare R2 uses 'auto' for region
  forcePathStyle: true, // Required for R2 compatibility
});

async function generateAndUploadReport(
  jobId,
  config_id,
  output,
  created_at,
  started_at,
  completed_at,
  status,
  decryptedEnvVars = {},
) {
  try {
    console.log(`[@local-runner:generateAndUploadReport] Generating report for job ${jobId}`);
    const runnerId = process.env.RUNNER_ID || 'default-runner';
    const startTime = started_at || 'N/A';
    const endTime = completed_at || 'N/A';
    const duration =
      startTime !== 'N/A' && endTime !== 'N/A'
        ? ((new Date(endTime) - new Date(startTime)) / 1000).toFixed(2)
        : 'N/A';

    // Mask sensitive environment variables
    const envVars =
      Object.keys(decryptedEnvVars || {})
        .map((key) => `${key}=***MASKED***`)
        .join(', ') || 'None';

    const scripts = output.scripts || [];
    const associatedFiles = output.associated_files || [];
    const reportData = {
      jobId,
      configId: config_id,
      runnerId,
      startTime,
      endTime,
      duration,
      status,
      scripts,
      envVars,
      associatedFiles,
    };

    const htmlReport = ejs.render(reportTemplate, reportData).trim();
    // Use a simpler date_time format for folder naming with underscores
    const dateStr = new Date(created_at)
      .toISOString()
      .replace(/[:.]/g, '_')
      .slice(0, 19)
      .replace('T', '_');
    const folderName = `${dateStr}_${jobId}`;
    // Correct the path to avoid duplicating 'reports'
    const reportPath = `${folderName}/report.html`;
    // Write report temporarily to disk
    const tempReportPath = path.join('/tmp', `report_${jobId}.html`);
    fs.writeFileSync(tempReportPath, htmlReport);

    // Upload report to Cloudflare R2 using S3-compatible API
    const bucketName = 'reports';
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: reportPath,
      Body: fs.createReadStream(tempReportPath),
      ContentType: 'text/html',
      ContentDisposition: 'inline',
    });

    try {
      await r2Client.send(putObjectCommand);
    } catch (uploadError) {
      console.error(
        `[@local-runner:generateAndUploadReport] Failed to upload report for job ${jobId}: ${uploadError.message}`,
      );
      return null;
    }

    // Generate a presigned URL for the report with a 7-day expiration
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: reportPath,
    });
    const reportUrl = await getSignedUrl(r2Client, getObjectCommand, { expiresIn: 604800 }); // 7 days in seconds

    // Clean up temporary file
    fs.unlinkSync(tempReportPath);

    // Upload associated files if any
    if (output.associated_files && output.associated_files.length > 0) {
      console.log(
        `[@local-runner:generateAndUploadReport] Uploading ${output.associated_files.length} associated files for job ${jobId}`,
      );
      for (const file of output.associated_files) {
        try {
          // Check if file has a public_url (already uploaded by Python runner)
          if (file.public_url) {
            console.log(
              `[@local-runner:generateAndUploadReport] File already uploaded by Python runner: ${file.name}, URL: ${file.public_url}`,
            );
            continue;
          }
          // If file content is not available, log placeholder
          console.log(
            `[@local-runner:generateAndUploadReport] Placeholder for uploading file: ${file.name}`,
          );
          // TODO: Implement actual file upload logic if file content is accessible
        } catch (fileError) {
          console.error(
            `[@local-runner:generateAndUploadReport] Failed to upload associated file ${file.name} for job ${jobId}: ${fileError.message}`,
          );
        }
      }
    } else {
      console.log(
        `[@local-runner:generateAndUploadReport] No associated files to upload for job ${jobId}`,
      );
    }

    // Upload the executed script if available
    if (scripts.length > 0 && scripts[0].script_path) {
      let scriptPath = scripts[0].script_path;
      const scriptName = path.basename(scriptPath);
      const scriptUploadPath = `${folderName}/${scriptName}`;
      const tempScriptPath = path.join('/tmp', `script_${jobId}_${scriptName}`);
      try {
        // Use the provided script path directly
        if (fs.existsSync(scriptPath)) {
          fs.copyFileSync(scriptPath, tempScriptPath);
          console.log(
            `[@local-runner:generateAndUploadReport] Copied script ${scriptName} to temporary location: ${tempScriptPath}`,
          );

          // Upload the script from the temporary location to R2
          const scriptPutCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: scriptUploadPath,
            Body: fs.createReadStream(tempScriptPath),
            ContentType: 'text/plain',
            ContentDisposition: 'attachment',
          });
          await r2Client.send(scriptPutCommand);
          console.log(
            `[@local-runner:generateAndUploadReport] Uploaded script ${scriptName} for job ${jobId} to ${scriptUploadPath}`,
          );

          // Add script to associated files for report linking
          const scriptGetCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: scriptUploadPath,
          });
          const scriptUrl = await getSignedUrl(r2Client, scriptGetCommand, { expiresIn: 604800 });
          associatedFiles.push({
            name: scriptName,
            size: fs.statSync(tempScriptPath).size,
            public_url: scriptUrl,
          });

          // Clean up temporary script file
          fs.unlinkSync(tempScriptPath);
          console.log(
            `[@local-runner:generateAndUploadReport] Cleaned up temporary script file: ${tempScriptPath}`,
          );
        } else {
          console.log(
            `[@local-runner:generateAndUploadReport] Script file not found at provided path: ${scriptPath}. Unable to upload script file.`,
          );
        }
      } catch (scriptUploadError) {
        console.error(
          `[@local-runner:generateAndUploadReport] Failed to upload script ${scriptName} for job ${jobId}: ${scriptUploadError.message}`,
        );
        // Clean up temporary script file if it exists
        if (fs.existsSync(tempScriptPath)) {
          fs.unlinkSync(tempScriptPath);
          console.log(
            `[@local-runner:generateAndUploadReport] Cleaned up temporary script file after error: ${tempScriptPath}`,
          );
        }
      }
    } else {
      console.log(
        `[@local-runner:generateAndUploadReport] No script path available to upload for job ${jobId}`,
      );
    }

    return reportUrl;
  } catch (error) {
    console.error(
      `[@local-runner:generateAndUploadReport] Error generating/uploading report for job ${jobId}: ${error.message}`,
    );
    return null;
  }
}

// Run immediately for testing
processJob().then(() => console.log('[@local-runner] Test complete'));
