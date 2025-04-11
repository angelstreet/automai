const crypto = require('crypto');

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
    console.log(`[@runner:processJob] Current queue length: ${queueLength} jobs`);

    const queueContents = await redis.lrange('jobs_queue', 0, -1);
    console.log(`[@runner:processJob] Full queue contents: ${JSON.stringify(queueContents)}`);

    const job = await redis.rpop('jobs_queue');
    if (!job) {
      console.log(`[@runner:processJob] Queue is empty, skipping...`);
      return;
    }

    console.log(`[@runner:processJob] Processing job, ${queueLength - 1} jobs remaining in queue`);
    console.log(`[@runner:processJob] Raw job data: ${JSON.stringify(job)}`);
    const { config_id, timestamp, requested_by } = typeof job === 'string' ? JSON.parse(job) : job;

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
    console.log(`[@runner:processJob] Config fetched: ${JSON.stringify(config)}`);
    const hosts = config.hosts || [];
    const repoUrl = config.repository;
    const branch = config.branch || 'main';
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    const scripts = (config.scripts || [])
      .map((script) => `${script.path} ${script.parameters}`)
      .join(' && ');
    console.log(`[@runner:processJob] Scripts to execute: ${scripts}`);

    for (const host of hosts) {
      console.log(
        `[@runner:processJob] Processing host: ${host.ip}, OS: ${host.os}, Username: ${host.username}, AuthType: ${host.authType || 'not specified'}`,
      );
      let sshKeyOrPass = host.key || host.password;
      if (!sshKeyOrPass) {
        console.error(`[@runner:processJob] No key or password provided for host ${host.ip}`);
        await supabase.from('jobs_run').insert({
          config_id,
          status: 'failed',
          output: { stderr: 'No authentication credentials provided' },
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          requested_by,
        });
        continue;
      }

      if (host.authType === 'privateKey' && sshKeyOrPass.includes(':')) {
        try {
          sshKeyOrPass = decrypt(sshKeyOrPass, process.env.ENCRYPTION_KEY);
          console.log(
            `[@runner:processJob] Decrypted key preview: ${sshKeyOrPass.slice(0, 50)}...`,
          );
        } catch (decryptError) {
          console.error(`[@runner:processJob] Decryption failed: ${decryptError.message}`);
          return;
        }
      } else {
        console.log(
          `[@runner:processJob] Using plain key/password: ${sshKeyOrPass.slice(0, 50)}...`,
        );
      }

      const cleanupCommand = `if exist ${repoName} (echo Removing existing directory && rmdir /s /q ${repoName}) else echo Directory not found, skipping cleanup`;
      const cloneCommand = `echo Cloning repository from ${repoUrl} && git clone ${repoUrl} ${repoName}`;
      const cdCommand = `cd ${repoName}`;
      const checkoutCommand = `echo Checking out branch ${branch} && git checkout ${branch}`;
      const runScriptsCommand = `echo Running scripts: ${scripts} && ${scripts}`;
      const fullScript =
        host.os === 'windows'
          ? `cmd.exe /c "(${cleanupCommand} && ${cloneCommand} && ${cdCommand} && ${checkoutCommand} && ${runScriptsCommand}) || (echo Command failed && exit /b 1)"`
          : `${cleanupCommand} && ${cloneCommand} && ${cdCommand} && ${checkoutCommand} && ${runScriptsCommand}`;
      console.log(`[@runner:processJob] Full SSH command: ${fullScript}`);

      const conn = new Client();
      conn
        .on('ready', () => {
          console.log(`[@runner:processJob] SSH connected to ${host.ip}`);
          conn.exec(fullScript, async (err, stream) => {
            if (err) {
              console.error(`[@runner:processJob] SSH exec error: ${err.message}`);
              await supabase.from('jobs_run').insert({
                config_id,
                status: 'failed',
                output: { stderr: err.message },
                created_at: new Date().toISOString(),
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                requested_by,
              });
              conn.end();
              return;
            }
            let output = { stdout: '', stderr: '' };
            stream
              .on('data', (data) => {
                output.stdout += data;
                console.log(`[@runner:processJob] SSH stdout: ${data}`);
              })
              .stderr.on('data', (data) => {
                output.stderr += data;
                console.log(`[@runner:processJob] SSH stderr: ${data}`);
              })
              .on('close', (code, signal) => {
                console.log(
                  `[@runner:processJob] SSH stream closed with code ${code}, signal: ${signal}`,
                );
                console.log(`[@runner:processJob] Final stdout: ${output.stdout}`);
                console.log(`[@runner:processJob] Final stderr: ${output.stderr}`);
                const status = code === 0 ? 'success' : 'failed';
                supabase
                  .from('jobs_run')
                  .insert({
                    config_id,
                    status,
                    output,
                    created_at: new Date().toISOString(),
                    started_at: new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                    requested_by,
                  })
                  .then(() => conn.end());
              });
          });
        })
        .on('error', async (err) => {
          console.error(`[@runner:processJob] SSH error: ${err.message}`);
          await supabase.from('jobs_run').insert({
            config_id,
            status: 'failed',
            output: { stderr: err.message },
            created_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            requested_by,
          });
          conn.end();
        })
        .connect({
          host: host.ip,
          port: host.port || 22,
          username: host.username,
          [host.authType === 'privateKey' ? 'privateKey' : 'password']: sshKeyOrPass,
          // Removed debug to filter handshake logs
        });
    }
  } catch (error) {
    console.error('[@runner:processJob] Error processing job:', error);
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
    if (!config) {
      console.warn(`Config ${id} has no config data`);
      return;
    }
    const job = JSON.stringify({
      config_id: id,
      timestamp: new Date().toISOString(),
      requested_by: 'system',
    });
    if (config.schedule && config.schedule !== 'now') {
      cron.schedule(config.schedule, async () => {
        await redis.lpush('jobs_queue', job);
        console.log(`Scheduled job queued for config ${id}`);
      });
    } else if (config.schedule === 'now') {
      redis.lpush('jobs_queue', job);
      console.log(`Immediate job queued for config ${id}`);
    }
  });
}

async function logQueueStatus() {
  try {
    const queueLength = await redis.llen('jobs_queue');
    console.log(`[@runner:queueStatus] Jobs in queue: ${queueLength}`);
  } catch (error) {
    console.error('[@runner:queueStatus] Error checking queue length:', error);
  }
}

setInterval(processJob, 5000);
setInterval(logQueueStatus, 60000);
setupSchedules().catch((err) => console.error('Setup schedules failed:', err));
console.log('Worker running...');
