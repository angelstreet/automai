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
  const job = await redis.rpop('jobs_queue');
  if (!job) return;

  const { config_id, input_overrides } = JSON.parse(job);
  const { data, error } = await supabase
    .from('configs')
    .select('config_json')
    .eq('id', config_id)
    .single();
  if (error || !data) {
    console.error(`Failed to fetch config ${config_id}: ${error?.message}`);
    return;
  }

  const config = data.config_json;
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
            await supabase.from('jobs').insert({
              config_id,
              user_id: config.user_id,
              status: 'failed',
              output: { stderr: err.message },
            });
            conn.end();
            return;
          }
          let output = { stdout: '', stderr: '' };
          stream
            .on('data', (data) => (output.stdout += data))
            .stderr.on('data', (data) => (output.stderr += data))
            .on('close', async () => {
              await supabase
                .from('jobs')
                .insert({ config_id, user_id: config.user_id, status: 'success', output });
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
}

async function setupSchedules() {
  const { data, error } = await supabase.from('configs').select('id, config_json');
  if (error) {
    console.error(`Failed to fetch configs for scheduling: ${error.message}`);
    return;
  }
  if (!data || data.length === 0) {
    console.log('No configs found for scheduling.');
    return;
  }

  data.forEach(({ id, config_json }) => {
    if (config_json.schedule && config_json.schedule !== 'now') {
      cron.schedule(config_json.schedule, async () => {
        await redis.lpush('jobs_queue', JSON.stringify({ config_id: id, input_overrides: {} }));
        console.log(`Scheduled job queued for config ${id}`);
      });
    } else if (config_json.schedule === 'now') {
      redis.lpush('jobs_queue', JSON.stringify({ config_id: id, input_overrides: {} }));
      console.log(`Immediate job queued for config ${id}`);
    }
  });
}

setInterval(processJob, 5000);
setupSchedules().catch((err) => console.error('Setup schedules failed:', err));
console.log('Worker running...');
