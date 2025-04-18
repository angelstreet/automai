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

const ALGORITHM = 'aes-256-cbc';
function decrypt(encryptedData, keyBase64) {
  const key = Buffer.from(keyBase64, 'base64');
  const [ivHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function processJob() {
  let job;
  try {
    const queueLength = await redis.llen('jobs_queue');
    console.log(`[@runner:processJob] Current queue length: ${queueLength} jobs`);

    // Print entire queue before processing
    const queueContents = await redis.lrange('jobs_queue', 0, -1);
    console.log(`[@runner:processJob] Full queue contents: ${JSON.stringify(queueContents)}`);

    job = await redis.rpop('jobs_queue');
    if (!job) {
      console.log(`[@runner:processJob] Queue is empty, skipping...`);
      return;
    }

    console.log(`[@runner:processJob] Processing job, ${queueLength - 1} jobs remaining in queue`);
    console.log(`[@runner:processJob] Raw job data: ${job}`);
    const { config_id, timestamp, requested_by } = JSON.parse(job);
    const { data, error } = await supabase
      .from('jobs_configuration')
      .select('config')
      .eq('id', config_id)
      .single();
    if (error || !data) {
      console.error(`Failed to fetch config ${config_id}: ${error?.message}`);
      return;
    }

    const config = data.config;
    const hosts = config.hosts || [];
    const scripts = (config.scripts || [])
      .map((script) => `${script.path} ${script.parameters}`)
      .join(' && ');

    for (const host of hosts) {
      let sshKeyOrPass = host.key || host.password;
      if (host.authType === 'privateKey' && sshKeyOrPass?.includes(':')) {
        sshKeyOrPass = decrypt(sshKeyOrPass, process.env.ENCRYPTION_KEY);
      }

      const script = host.os === 'windows' ? `cmd.exe /c "${scripts}"` : scripts;
      const conn = new Client();
      conn
        .on('ready', () => {
          conn.exec(script, async (err, stream) => {
            if (err) {
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
              .on('data', (data) => (output.stdout += data))
              .stderr.on('data', (data) => (output.stderr += data))
              .on('close', async () => {
                await supabase.from('jobs_run').insert({
                  config_id,
                  status: 'success',
                  output,
                  created_at: new Date().toISOString(),
                  started_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
                  requested_by,
                });
                conn.end();
              });
          });
        })
        .connect({
          host: host.ip,
          port: host.port || 22,
          username: host.username,
          [host.authType === 'privateKey' ? 'privateKey' : 'password']: sshKeyOrPass,
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
