require('dotenv').config(); // Load environment variables from .env
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

    const jobs = await redis.lrange('jobs_queue', -1, -1);
    if (!jobs || jobs.length === 0) {
      console.log(`[@runner:processJob] Queue is empty`);
      return;
    }
    const job = jobs[0];

    console.log(`[@runner:processJob] Processing job: ${JSON.stringify(job)}`);
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
    const repoUrl = config.repository;
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    // Define env vars in Render (not repo)
    const envVars = {
      FTP_SERVER: process.env.FTP_SERVER,
      FTP_USER: process.env.FTP_USER,
      FTP_PASS: process.env.FTP_PASS,
      FTP_DIRECTORY: process.env.FTP_DIRECTORY,
    };
    const envPrefix = Object.entries(envVars)
      .map(([key, value]) => `set ${key}=${value}`)
      .join(' && ');
    const scripts = (config.scripts || [])
      .map((script) => {
        const ext = script.path.split('.').pop().toLowerCase();
        const command = ext === 'py' ? 'python3' : ext === 'sh' ? './' : '';
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

      const cleanupCommand = `if exist ${repoName} rmdir /s /q ${repoName}`;
      const cloneCommand = `git clone ${repoUrl} ${repoName} 2>&1`;
      const cdCommand = `cd ${repoName} 2>&1`;
      const dirCommand = `dir`;
      const scriptCommand = `${scripts}`;
      const fullScript =
        host.os === 'windows'
          ? `cmd.exe /c ${envPrefix} && ${cdCommand} && ${dirCommand} && ${scriptCommand}}`
          : `${cleanupCommand} && ${cloneCommand} && ${cdCommand} && ${scriptCommand}`;
      console.log(`[@runner:processJob] SSH command: ${fullScript}`);
      const conn = new Client();
      conn
        .on('ready', () => {
          console.log(`[@runner:processJob] Connected to ${host.ip}`);
          conn.exec(fullScript, (err, stream) => {
            if (err) {
              console.error(`[@runner:processJob] Exec error: ${err.message}`);
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
                //console.log(`[@runner:processJob] Stderr: ${data}`);
              })
              .on('close', (code, signal) => {
                //console.log(`[@runner:processJob] Stream closed, code: ${code}, signal: ${signal}`);
                //console.log(`[@runner:processJob] Final stdout: ${output.stdout}`);
                //console.log(`[@runner:processJob] Final stderr: ${output.stderr}`);
                console.error(`[@runner:processJob] SSH connection closed`);
                conn.end();
              });
          });
        })
        .on('error', (err) => {
          if (err.message.includes('ECONNRESET')) {
            console.error(`[@runner:processJob] SSH connection closed`);
          } else {
            console.error(`[@runner:processJob] SSH error: ${err.message}`);
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

// Run once for local testing
processJob().then(() => console.log('Test complete'));
