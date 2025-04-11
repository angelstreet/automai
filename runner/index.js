const crypto = require('crypto');

const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
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

    console.log(`[@runner:processJob] Processing job: ${JSON.stringify(job)}`);
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
    console.log(`[@runner:processJob] Config: ${JSON.stringify(config)}`);
    const hosts = config.hosts || [];
    const repoUrl = config.repository;
    const repoName = repoUrl.split('/').pop().replace('.git', '');

    for (const host of hosts) {
      console.log(
        `[@runner:processJob] Host: ${host.ip}, OS: ${host.os}, Username: ${host.username}`,
      );
      let sshKeyOrPass = host.key || host.password;
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

      const cleanupCommand = `if exist ${repoName} rmdir /s /q ${repoName}`;
      const cloneCommand = `git clone ${repoUrl} ${repoName}`;
      const cdCommand = `cd ${repoName}`;
      const dirCommand = `dir`;
      const fullScript =
        host.os === 'windows'
          ? `cmd.exe /c "(${cleanupCommand} && ${cloneCommand} && ${cdCommand} && ${dirCommand}) || echo Command failed"`
          : `${cleanupCommand} && ${cloneCommand} && ${cdCommand} && ${dirCommand}`;
      console.log(`[@runner:processJob] SSH command: ${fullScript}`);

      const conn = new Client();
      conn
        .on('ready', () => {
          console.log(`[@runner:processJob] Connected to ${host.ip}`);
          conn.exec(fullScript, async (err, stream) => {
            let output = { stdout: '', stderr: '' };
            stream
              .on('data', (data) => {
                output.stdout += data;
                console.log(`[@runner:processJob] Stdout: ${data}`);
              })
              .stderr.on('data', (data) => {
                output.stderr += data;
                console.log(`[@runner:processJob] Stderr: ${data}`);
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
    console.error(`[@runner:processJob] Error: ${error.message}`);
  }
}

setInterval(processJob, 5000);
console.log('Worker running...');
