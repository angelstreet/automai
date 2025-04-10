const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const cron = require('node-cron');
const { Client } = require('ssh2');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function processJob() {
  const job = await redis.rpop('jobs_queue');
  if (!job) return;

  const { config_id, input_overrides } = JSON.parse(job);
  const { data } = await supabase
    .from('configs')
    .select('config_json')
    .eq('id', config_id)
    .single();
  if (!data) return;

  const config = data.config_json;
  const inputs = { ...config.inputs, ...input_overrides };
  const steps = config.steps.map((step) =>
    step.run.replace(/\${{ inputs\.(\w+) }}/g, (_, key) => inputs[key] || ''),
  );
  const script =
    config.os === 'windows' ? `cmd.exe /c "${steps.join(' && ')}"` : steps.join(' && ');

  const conn = new Client();
  conn
    .on('ready', () => {
      conn.exec(script, async (err, stream) => {
        if (err) throw err;
        let output = { stdout: '', stderr: '' };
        stream
          .on('data', (data) => (output.stdout += data))
          .stderr.on('data', (data) => (output.stderr += data))
          .on('close', async () => {
            await supabase.from('jobs').insert({
              config_id,
              user_id: config.user_id,
              status: 'success',
              output,
            });
            conn.end();
          });
      });
    })
    .connect({
      host: config.host,
      username: config.username,
      privateKey: config.ssh_key,
    });
}

async function setupSchedules() {
  const { data } = await supabase.from('configs').select('id, config_json');
  data.forEach(({ id, config_json }) => {
    if (config_json.schedule) {
      cron.schedule(config_json.schedule, async () => {
        await redis.lpush('jobs_queue', JSON.stringify({ config_id: id, input_overrides: {} }));
      });
    }
  });
}

// Poll every 5 seconds
setInterval(processJob, 5000);
setupSchedules();

console.log('Worker running...');
