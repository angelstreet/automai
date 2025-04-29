const crypto = require('crypto');
const http = require('http');

const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const cron = require('node-cron');
const { Client } = require('ssh2');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
    const { config_id } = typeof job === 'string' ? JSON.parse(job) : job;
    // Fetch config from Supabase
    const { data, error } = await supabase
      .from('jobs_configuration')
      .select('config')
      .eq('id', config_id)
      .single();
    if (error || !data) {
      console.error(`[@runner:processJob] Failed to fetch config ${config_id}: ${error?.message}`);
      return;
    }
    const config = data.config;
    console.log(`[@runner:processJob] Config: ${JSON.stringify(config)}`);

    const hosts = config.hosts || [];
    //const repoUrl = config.repository;
    //const repoName = repoUrl.split('/').pop().replace('.git', '');
    // Define env vars in Render (not repo)
    //const envVars = {
    //  FTP_SERVER: process.env.FTP_SERVER,
    //  FTP_USER: process.env.FTP_USER,
    //  FTP_PASS: process.env.FTP_PASS,
    //  FTP_DIRECTORY: process.env.FTP_DIRECTORY,
    //  DEVICE_IP: process.env.DEVICE_IP,
    //};
    //const envPrefix = Object.entries(envVars)
    //  .map(([key, value]) => `set ${key}=${value}`)
    //  .join(' && ');
    const scripts = (config.scripts || [])
      .map((script) => {
        const ext = script.path.split('.').pop().toLowerCase();
        const command = ext === 'py' ? 'python' : ext === 'sh' ? './' : '';
        return `${command} ${script.path} ${script.parameters || ''} 2>&1`.trim();
      })
      .join(' && ');
    console.log(`[@runner:processJob] Scripts: ${scripts}`);
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

      const scriptCommand = `${scripts}`;
      const fullScript = `cmd.exe /c python --version && cd Desktop/remote-installer && dir && echo ============================= && ${scriptCommand}`;
      console.log(`[@runner:processJob] SSH command: ${fullScript}`);

      // Step 1: Create job with pending status
      const created_at = new Date().toISOString();
      const { data: jobData, error: jobError } = await supabase
        .from('jobs_run')
        .insert({
          config_id,
          status: 'pending',
          output: { stdout: '', stderr: '' },
          created_at: created_at,
        })
        .select('id')
        .single();

      if (jobError) {
        console.error(`[@runner:processJob] Failed to create pending job: ${jobError.message}`);
        return;
      }

      const jobId = jobData.id;
      console.log(`[@runner:processJob] Created job with ID ${jobId} and status 'pending'`);

      const conn = new Client();
      conn
        .on('ready', async () => {
          console.log(`[@runner:processJob] Connected to ${host.ip}`);

          // Step 2: Update job to in_progress status
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
              // Update existing job with error information
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
            let output = { stdout: '', stderr: '' };
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

                // Step 3: Update job with final results
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
            // Update job status to failed due to connection reset
            await supabase
              .from('jobs_run')
              .update({
                status: 'failed',
                output: { stdout: '', stderr: '' },
                error: 'ECONNRESET',
                completed_at: new Date().toISOString(),
              })
              .eq('id', jobId);
            console.log(
              `[@runner:processJob] Updated job ${jobId} to failed status due to ECONNRESET`,
            );
          } else {
            console.error(`[@runner:processJob] SSH error: ${err.message}`);
            // Update job status for other errors
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
  } catch (error) {
    console.error(`[@runner:processJob] Error: ${error.message}`);
  }
}

async function setupSchedules() {
  const { data, error } = await supabase.from('jobs_configuration').select('id, config');
  if (error) {
    console.error(`Failed to fetch configs for scheduling: ${error.message}`);
    return;
  }
  if (!data || data.length === 0) {
    console.log('No configs found for scheduling.');
    return;
  }

  data.forEach(({ id, config }) => {
    if (!config || !config.schedule) return;
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
    } else {
      redis.lpush('jobs_queue', job);
      console.log(`Immediate job queued for config ${id}`);
    }
  });
}

// Poll queue every 10 seconds
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
