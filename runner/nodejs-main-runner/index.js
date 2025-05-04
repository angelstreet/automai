// Built-in Node.js modules
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

// Third-party modules
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const axios = require('axios');
const ejs = require('ejs');
const cron = require('node-cron');
const { Client } = require('ssh2');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FLASK_SERVICE_URL = process.env.PYTHON_SLAVE_RUNNER_FLASK_SERVICE_URL;
const ALGORITHM = 'aes-256-gcm';

// HTML Report Template
const reportTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Run Report - <%= jobId %></title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    pre { background-color: #f9f9f9; padding: 10px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Job Run Report</h1>
  <table>
    <tr><th>Job Run ID</th><td><%= jobId %></td></tr>
    <tr><th>Config ID</th><td><%= configId %></td></tr>
    <tr><th>Runner ID</th><td><%= runnerId %></td></tr>
    <tr><th>Start Time</th><td><%= startTime %></td></tr>
    <tr><th>End Time</th><td><%= endTime %></td></tr>
    <tr><th>Duration (s)</th><td><%= duration %></td></tr>
    <tr><th>Status</th><td><%= status %></td></tr>
    <tr><th>Scripts</th><td>
      <% scripts.forEach(function(script, index) { %>
        <strong>Script <%= index + 1 %>: <%= script.script_path %></strong><br>
        Parameters: <%= script.parameters || 'None' %><br>
        Iteration: <%= script.iteration || 'N/A' %><br>
        Stdout: <pre><%= script.stdout %></pre><br>
        Stderr: <pre><%= script.stderr %></pre><br>
      <% }); %>
    </td></tr>
    <tr><th>Environment Variables</th><td><%= envVars %></td></tr>
  </table>
</body>
</html>
`;

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
    const queueLength = await redis.llen('jobs_queue');
    console.log(`[@runner:processJob] Queue length: ${queueLength} jobs`);

    const job = await redis.rpop('jobs_queue');
    if (!job) {
      console.log(`[@runner:processJob] Queue is empty`);
      return;
    }

    console.log(`[@runner:processJob] Processing job: ${job}`);
    const jobData = typeof job === 'string' ? JSON.parse(job) : job;
    const { config_id } = jobData;

    const { data, error } = await supabase
      .from('jobs_configuration')
      .select('config, is_active, team_id')
      .eq('id', config_id)
      .single();
    if (error || !data) {
      console.error(`[@runner:processJob] Failed to fetch config ${config_id}: ${error?.message}`);
      return;
    }
    const config = data.config;
    const team_id = data.team_id;
    if (!data.is_active) {
      console.log(`[@runner:processJob] Config ${config_id} is inactive, skipping execution`);
      return;
    }
    console.log(`[@runner:processJob] Config: ${JSON.stringify(config)}`);

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
          `[@runner:processJob] Failed to fetch team-specific environment variables for team ${team_id}: ${teamEnvVarsError.message}`,
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
          `[@runner:processJob] Failed to fetch tenant for team ${team_id}: ${teamError.message}`,
        );
      } else if (teamData && teamData.tenant_id) {
        // Fetch shared variables for the tenant
        const { data: sharedData, error: sharedError } = await supabase
          .from('shared_environment_variables')
          .select('key, value')
          .eq('tenant_id', teamData.tenant_id);

        if (sharedError) {
          console.error(
            `[@runner:processJob] Failed to fetch shared environment variables for tenant ${teamData.tenant_id}: ${sharedError.message}`,
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
              console.log(`[@runner:processJob] Decrypted environment variable: ${key}`);
              return [key, decryptedValue];
            } catch (err) {
              console.error(
                `[@runner:processJob] Failed to decrypt environment variable ${key}: ${err.message}`,
              );
              return [key, value];
            }
          }
          return [key, value];
        }),
      );
      console.log(
        `[@runner:processJob] Fetched and processed ${Object.keys(encryptedEnvVars).length} environment variables (team-specific: ${teamEnvVarsData?.length || 0}, shared: ${sharedEnvVarsData?.length || 0}) for team ${team_id}`,
      );
    } else {
      console.log(`[@runner:processJob] Skipping environment variables fetch: team_id=${team_id}`);
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
      console.error(`[@runner:processJob] Failed to create pending job: ${jobError.message}`);
      return;
    }

    const jobId = jobRunData.id;
    console.log(`[@runner:processJob] Created job with ID ${jobId} and status 'pending'`);

    let output = { scripts: [], stdout: '', stderr: '' };
    let overallStatus = 'success';

    const hasHosts = config.hosts && config.hosts.length > 0;

    if (!hasHosts) {
      console.log(`[@runner:processJob] No hosts found, forwarding to Flask service`);

      for (const script of config.scripts || []) {
        const scriptPath = script.path;
        const parameters = script.parameters || '';
        const timeout = script.timeout || 30;
        const retryOnFailure = script.retry_on_failure || 0;
        const iterations = script.iterations || 1;

        if (!scriptPath) {
          console.error(`[@runner:processJob] No script path provided for script`);
          overallStatus = 'failed';
          output.scripts.push({
            script_path: null,
            iteration: null,
            stdout: '',
            stderr: 'No script path provided',
          });
          continue;
        }

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
              };

              if (config.repository) {
                payload.repo_url = config.repository;
                payload.script_folder = config.script_folder || '';
                payload.branch = config.branch || 'main';
              }

              const started_at = new Date().toISOString();
              const { error: statusError } = await supabase
                .from('jobs_run')
                .update({
                  status: 'in_progress',
                  started_at: started_at,
                })
                .eq('id', jobId);

              if (statusError) {
                console.error(
                  `[@runner:processJob] Failed to update job ${jobId} to in_progress: ${statusError.message}`,
                );
                scriptOutput.stderr = `Failed to update job status: ${statusError.message}`;
                overallStatus = 'failed';
                output.scripts.push(scriptOutput);
                continue;
              }

              console.log(`[@runner:processJob] Updated job ${jobId} status to 'in_progress'`);

              console.log(
                `[@runner:processJob] Sending payload to Flask (attempt ${attempt}/${retries}, iteration ${i}/${iterations}): ${JSON.stringify({ ...payload, environment_variables: payload.environment_variables ? Object.keys(payload.environment_variables).reduce((acc, key) => ({ ...acc, [key]: '***MASKED***' }), {}) : {} })}`,
              );
              const response = await axios.post(`${FLASK_SERVICE_URL}/execute`, payload, {
                timeout: (payload.timeout + 5) * 1000,
              });

              scriptOutput.stdout = response.data.output.stdout || '';
              scriptOutput.stderr = response.data.output.stderr || '';
              scriptStatus = response.data.status;

              // Add associated files to output if available
              if (response.data.associated_files) {
                output.associated_files = response.data.associated_files;
              }

              console.log(
                `[@runner:processJob] Received response from Flask for job ${jobId}: status=${scriptStatus}, stdout=${scriptOutput.stdout}, stderr=${scriptOutput.stderr}`,
              );

              if (scriptStatus === 'success') {
                break;
              } else {
                console.log(
                  `[@runner:processJob] Script failed, attempt ${attempt}/${retries}: ${scriptOutput.stderr}`,
                );
              }
            } catch (err) {
              scriptOutput.stderr = err.response?.data?.message || err.message;
              console.log(
                `[@runner:processJob] Script error, attempt ${attempt}/${retries}: ${scriptOutput.stderr}`,
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
        })
        .eq('id', jobId);

      if (finalStatusError) {
        console.error(
          `[@runner:processJob] Failed to update final status for job ${jobId}: ${finalStatusError.message}`,
        );
      } else {
        console.log(`[@runner:processJob] Updated job ${jobId} to final status: ${overallStatus}`);
      }

      const reportUrl = await generateAndUploadReport(
        jobId,
        config_id,
        output,
        created_at,
        started_at,
        completed_at,
        overallStatus,
      );
      if (reportUrl) {
        const { error: reportError } = await supabase
          .from('jobs_run')
          .update({ report_url: reportUrl })
          .eq('id', jobId);
        if (reportError) {
          console.error(
            `[@runner:processJob] Failed to update report URL for job ${jobId}: ${reportError.message}`,
          );
        } else {
          console.log(`[@runner:processJob] Updated job ${jobId} with report URL: ${reportUrl}`);
        }
      }
    } else {
      const hosts = config.hosts;
      // Log current jobData state at the start of SSH section
      console.log(
        `[@runner:processJob] Job data at start of SSH section: team_id=${team_id}, config_id=${config_id}`,
      );

      for (const host of hosts) {
        console.log(
          `[@runner:processJob] Host: ${host.ip}, OS: ${host.os}, Username: ${host.username}`,
        );
        let sshKeyOrPass = host.key || host.password;
        if (!sshKeyOrPass) {
          console.error(`[@runner:processJob] No key/password for ${host.ip}`);
          return;
        }

        if (host.authType === 'privateKey' && sshKeyOrPass.includes(':')) {
          try {
            sshKeyOrPass = decrypt(sshKeyOrPass, process.env.ENCRYPTION_KEY);
            console.log(`[@runner:processJob] Decrypted key: ${sshKeyOrPass.slice(0, 50)}...`);
          } catch (decryptError) {
            console.error(`[@runner:processJob] Decryption failed: ${decryptError.message}`);
            return;
          }
        } else {
          console.log(`[@runner:processJob] Plain key/password: ${sshKeyOrPass.slice(0, 50)}...`);
        }

        const scripts = (config.scripts || [])
          .map((script) => {
            const ext = script.path.split('.').pop().toLowerCase();
            const command = ext === 'py' ? 'python' : ext === 'sh' ? './' : '';
            return `${command} ${script.path} ${script.parameters || ''} 2>&1`.trim();
          })
          .join(' && ');

        console.log(`[@runner:processJob] Scripts: ${scripts}`);

        let repoCommands = '';
        let scriptFolder = config.script_folder || '';
        let repoDir = '';
        console.log(`[@runner:processJob] Script folder: ${scriptFolder}`);

        if (config.repository) {
          const repoUrl = config.repository;
          const branch = config.branch || 'main';

          const isRepoAccessible = await pingRepository(repoUrl);
          if (!isRepoAccessible) {
            console.error(
              `[@runner:processJob] Repository ${repoUrl} is not accessible, aborting job execution.`,
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
              `[@runner:processJob] Updated job ${jobId} to failed status due to inaccessible repository.`,
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
              `[@runner:processJob] WARNING: Git must be installed on Windows host ${host.ip} for repository operations.`,
            );
            // Use PowerShell for repository check and operations on Windows
            let repoScript = `if (Test-Path '${repoDir}') { Write-Output 'Repository exists, pulling latest changes'; cd /d '${repoDir}'; git pull origin ${branch} } else { Write-Output 'Repository does not exist, cloning'; git clone -b ${branch} ${repoUrl} '${repoDir}'; cd '${repoDir}' }`;
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
            `[@runner:processJob] Repository setup: ${repoDir} exists ? git pull : clone ${repoUrl} branch ${branch}${scriptFolder ? `, then navigate to ${scriptFolder}` : ''}`,
          );
        } else {
          if (config.scripts && config.scripts.length > 0 && config.scripts[0].folder) {
            scriptFolder = config.scripts[0].folder;
            console.log(
              `[@runner:processJob] Using folder from script configuration as working directory: ${scriptFolder}`,
            );
          } else {
            console.log(
              `[@runner:processJob] No folder specified in script configuration or repository, using default SSH directory (if any)`,
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
            `[@runner:processJob] Environment variables setup for SSH: ${Object.keys(decryptedEnvVars).join(', ')}`,
          );
        } else {
          console.log(
            `[@runner:processJob] No environment variables to set for SSH host ${host.ip}`,
          );
        }
        const scriptCommand = `${scripts}`;
        if (host.os === 'windows') {
          fullScript = `${repoCommands}${repoCommands ? ' && ' : ''}${repoDir ? `cd /d ${repoDir} && ` : ''} cd ${scriptFolder} && powershell -Command "if (Test-Path 'requirements.txt') { pip install -r requirements.txt } else { Write-Output 'No requirements.txt file found, skipping pip install' }" && ${envSetup}python --version && echo ============================= && ${scriptCommand}`;
        } else {
          fullScript = `${repoCommands} ${repoCommands ? '' : repoDir ? `cd ${repoDir} && ` : ''} cd ${scriptFolder} && if [ -f "requirements.txt" ]; then pip install -r requirements.txt; else echo "No requirements.txt file found, skipping pip install"; fi && ${envSetup}python --version && echo ============================= && ${scriptCommand}`;
        }
        console.log(
          `[@local-runner:processJob] SSH command to be executed on ${host.ip}: ${fullScript}`,
        );

        const conn = new Client();
        conn
          .on('ready', async () => {
            console.log(`[@runner:processJob] Connected to ${host.ip}`);

            const started_at = new Date().toISOString();
            await supabase
              .from('jobs_run')
              .update({
                status: 'in_progress',
                started_at: started_at,
              })
              .eq('id', jobId);

            console.log(`[@runner:processJob] Updated job ${jobId} status to 'in_progress'`);

            conn.exec(fullScript, async (err, stream) => {
              if (err) {
                console.error(`[@runner:processJob] Exec error: ${err.message}`);
                await supabase
                  .from('jobs_run')
                  .update({
                    status: 'failed',
                    output: { stderr: err.message },
                    completed_at: new Date().toISOString(),
                  })
                  .eq('id', jobId);
                console.log(
                  `[@runner:processJob] Updated job ${jobId} to failed status due to exec error`,
                );
                conn.end();
                return;
              }

              stream
                .on('data', (data) => {
                  output.stdout += data;
                  console.log(`${data}`);
                })
                .stderr.on('data', (data) => {
                  output.stderr += data;
                  console.log(`[@runner:processJob] Stderr: ${data}`);
                })
                .on('close', async (code, signal) => {
                  console.log(`[@runner:processJob] Final stdout: ${output.stdout}`);
                  console.log(`[@runner:processJob] Final stderr: ${output.stderr}`);
                  console.log(
                    `[@runner:processJob] SSH connection closed: ${code}, signal: ${signal}`,
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
                    `[@runner:processJob] Updated job ${jobId} to final status: ${isSuccess ? 'success' : 'failed'}`,
                  );

                  const sshReportUrl = await generateAndUploadReport(
                    jobId,
                    config_id,
                    output,
                    created_at,
                    started_at,
                    completed_at,
                    isSuccess ? 'success' : 'failed',
                  );
                  if (sshReportUrl) {
                    const { error: sshReportError } = await supabase
                      .from('jobs_run')
                      .update({ report_url: sshReportUrl })
                      .eq('id', jobId);
                    if (sshReportError) {
                      console.error(
                        `[@runner:processJob] Failed to update report URL for SSH job ${jobId}: ${sshReportError.message}`,
                      );
                    } else {
                      console.log(
                        `[@runner:processJob] Updated job ${jobId} with SSH report URL: ${sshReportUrl}`,
                      );
                    }
                  }

                  conn.end();
                });
            });
          })
          .on('error', async (err) => {
            if (err.message.includes('ECONNRESET')) {
              console.error(`[@runner:processJob] SSH connection closed due to ECONNRESET`);
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
                `[@runner:processJob] Updated job ${jobId} to ${isSuccess ? 'success' : 'failed'} status despite ECONNRESET`,
              );
            } else {
              console.error(`[@runner:processJob] SSH error: ${err.message}`);
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
                `[@runner:processJob] Updated job ${jobId} to failed status due to SSH error`,
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
    }
  } catch (error) {
    console.error(`[@runner:processJob] Error: ${error.message}`);
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
  console.log(`[@runner:server] Server listening on port ${PORT}`);
});

async function pingRepository(repoUrl) {
  try {
    console.log(`[@runner:pingRepository] Pinging repository: ${repoUrl}`);
    const response = await axios.head(repoUrl, { timeout: 5000 });
    console.log(
      `[@runner:pingRepository] Repository ping successful: ${repoUrl}, status: ${response.status}`,
    );
    return true;
  } catch (error) {
    console.error(
      `[@runner:pingRepository] Failed to ping repository ${repoUrl}: ${error.message}`,
    );
    return false;
  }
}

// Configure S3 client for Supabase Storage
const s3Client = new S3Client({
  endpoint: process.env.SUPABASE_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_KEY,
    secretAccessKey: process.env.SUPABASE_S3_SECRET,
  },
  region: 'us-east-1', // Region is often required, using a placeholder
  forcePathStyle: true, // Required for S3-compatible APIs like Supabase
});

async function generateAndUploadReport(
  jobId,
  config_id,
  output,
  created_at,
  started_at,
  completed_at,
  status,
) {
  try {
    console.log(`[@runner:generateAndUploadReport] Generating report for job ${jobId}`);
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
    };

    const htmlReport = await ejs.render(reportTemplate, reportData);
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

    // Upload report to Supabase Storage using S3-compatible API
    const bucketName = 'reports';
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: reportPath,
      Body: fs.createReadStream(tempReportPath),
      ContentType: 'text/html',
      ContentDisposition: 'inline',
    });

    try {
      await s3Client.send(putObjectCommand);
      console.log(
        `[@runner:generateAndUploadReport] Report uploaded to S3-compatible storage for job ${jobId}: ${reportPath}`,
      );
    } catch (uploadError) {
      console.error(
        `[@runner:generateAndUploadReport] Failed to upload report for job ${jobId}: ${uploadError.message}`,
      );
      return null;
    }

    // Generate a signed URL using Supabase Storage API, valid for 1 year
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(reportPath, 60 * 60 * 24 * 365); // URL valid for 1 year

    if (signedUrlError) {
      console.error(
        `[@runner:generateAndUploadReport] Failed to generate signed URL for job ${jobId}: ${signedUrlError.message}`,
      );
      return null;
    }

    const reportUrl = signedUrlData.signedUrl;
    console.log(
      `[@runner:generateAndUploadReport] Signed report URL for job ${jobId}: ${reportUrl}`,
    );

    // Clean up temporary file
    fs.unlinkSync(tempReportPath);

    // Upload associated files if any
    if (output.associated_files && output.associated_files.length > 0) {
      console.log(
        `[@runner:generateAndUploadReport] Uploading ${output.associated_files.length} associated files for job ${jobId}`,
      );
      for (const file of output.associated_files) {
        try {
          // Check if file has a public_url (already uploaded by Python runner)
          if (file.public_url) {
            console.log(
              `[@runner:generateAndUploadReport] File already uploaded by Python runner: ${file.name}, URL: ${file.public_url}`,
            );
            continue;
          }
          // If file content is not available, log placeholder
          console.log(
            `[@runner:generateAndUploadReport] Placeholder for uploading file: ${file.name}`,
          );
          // TODO: Implement actual file upload logic if file content is accessible
        } catch (fileError) {
          console.error(
            `[@runner:generateAndUploadReport] Failed to upload associated file ${file.name} for job ${jobId}: ${fileError.message}`,
          );
        }
      }
    } else {
      console.log(
        `[@runner:generateAndUploadReport] No associated files to upload for job ${jobId}`,
      );
    }

    return reportUrl;
  } catch (error) {
    console.error(
      `[@runner:generateAndUploadReport] Error generating/uploading report for job ${jobId}: ${error.message}`,
    );
    return null;
  }
}
