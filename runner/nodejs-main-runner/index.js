const crypto = require('crypto');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const axios = require('axios');
const cron = require('node-cron');
const { Client } = require('ssh2');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FLASK_SERVICE_URL = process.env.PYTHON_SLAVE_RUNNER_FLASK_SERVICE_URL;
const ALGORITHM = 'aes-256-gcm';

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
      .select('config, is_active')
      .eq('id', config_id)
      .single();
    if (error || !data) {
      console.error(`[@runner:processJob] Failed to fetch config ${config_id}: ${error?.message}`);
      return;
    }
    const config = data.config;
    if (!data.is_active) {
      console.log(`[@runner:processJob] Config ${config_id} is inactive, skipping execution`);
      return;
    }
    console.log(`[@runner:processJob] Config: ${JSON.stringify(config)}`);

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

    let output = { scripts: [] };
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
              };

              if (config.repository) {
                payload.repo_url = config.repository;
                payload.git_folder = config.git_folder;
                payload.branch = config.branch || 'main';
              }

              const started_at = new Date().toISOString();
              const { error: statusError } = await supabase
                .from('jobs_run')
                .update({
                  status: 'in_progress',
                  started_at: started_at,
(INPUT)                })
                .eq('id', jobId);

              if (statusError) {
                console.error(`[@runner:processJob] Failed to update job ${jobId} to in_progress: ${statusError.message}`);
                scriptOutput.stderr = `Failed to update job status: ${statusError.message}`;
                overallStatus = 'failed';
                output.scripts.push(scriptOutput);
                continue;
              }

              console.log(`[@runner:processJob] Updated job ${jobId} status to 'in_progress'`);

              console.log(
                `[@runner:processJob] Sending payload to Flask (attempt ${attempt}/${retries}, iteration ${i}/${iterations}): ${JSON.stringify(payload)}`,
              );
              const response = await axios.post(`${FLASK_SERVICE_URL}/execute`, payload, {
                timeout: (payload.timeout + 5) * 1000,
              });

              scriptOutput.stdout = response.data.output.stdout || '';
              scriptOutput.stderr = response.data.output.stderr || '';
              scriptStatus = response.data.status;

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
        console.error(`[@runner:processJob] Failed to update final status for job ${jobId}: ${finalStatusError.message}`);
      } else {
        console.log(`[@runner:processJob] Updated job ${jobId} to final status: ${overallStatus}`);
      }
    } else {
      const hosts = config.hosts;
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
        let workingDir = 'Desktop/remote-installer';
        if (config.repository) {
          const repoUrl = config.repository;
          const branch = config.branch || 'main';
          const gitFolder = config.git_folder || 'repo';
          const repoDir = `/tmp/${gitFolder}-${jobId}`;
          repoCommands = `
            if [ -d "${repoDir}" ]; then
              cd ${repoDir} && git pull origin ${branch} || exit 1
            else
              rm -rf ${repoDir} && git clone -b ${branch} ${repoUrl} ${repoDir} && cd ${repoDir} || exit 1
            fi
          `;
          workingDir = repoDir;
          console.log(`[@runner:processJob] Repository setup: ${repoDir} exists ? git pull : clone ${repoUrl} branch ${branch}`);
        }

        const scriptCommand = `${scripts}`;
        const fullScript = `
          ${repoCommands} \
          ${repoCommands ? '' : `cd ${workingDir} && `} \
          cmd.exe /c python --version && dir && echo ============================= && ${scriptCommand}
        `.trim();
        console.log(`[@runner:processJob] SSH command: ${fullScript}`);

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
                  const isSuccess = output.stdout.includes('Test Success') || code === 0;

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

                  conn.end();
                });
            });
          })
          .on('error', async (err) => {
            if (err.message.includes('ECONNRESET')) {
              console.error(`[@runner:processJob] SSH connection closed due to ECONNRESET`);
              const completed_at = new Date().toISOString();
              const isSuccess = output.stdout.includes('Test Success');

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