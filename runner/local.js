require('dotenv').config(); // Load environment variables from .env

const crypto = require('crypto');

const { Redis } = require('@upstash/redis');
const { Client } = require('ssh2');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

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
    const { config_id } = typeof job === 'string' ? JSON.parse(job) : job;

    // Hardcode config for local testing (replace with your actual config)
    const config = {
      repository: 'https://github.com/angelstreet/automai.git',
      hosts: [
        {
          ip: '77.56.53.130',
          os: 'windows',
          username: 'sunri',
          authType: 'privateKey',
          key: '05d419acb27e10d95c7167c590a29d48:e87a005ec796a97e085520443400b967:e4ca2f06c53d53eed23243e04f9cc86ba365e5ac2d8ceb79fc4ddf777a923f6555d8240b1f966b4b608b92dda54aba036db1777500d074d690a3404ff6455aa77f9eef231fa50fc6d0cf0916e39da48768444db7ba19d7672c5ce884b3917927730851e2d4430fa269779686fe9d75dd3e3fb53996603c00798067278750c429bcc8cfb161a58d18208bde59abc893d18bc5a9bd5356f8faff7e409f6602c9bc3afcaadaafc14e8f3133ceb6880181796fd052d754605b802b4feefba57246de383ab31398ecf751a3ea8293626b0a95e4fd3d1612be84e8e825075eec186ebd7cda9cec8de2e1419acb2f8140ce228d7035ced3fd5d1c3a5278df72ee99d3b370c66b6ac143d6a94f18abe82a70821698e496fe93c05c91a1b43137b5ee0a36025f1c5f9e0d3050afad8a2fbeca2c57b9883d62a296aa6fb21d7b4eefe4b42b9e5a2346347fed7cc4979ddb2a2167ae7380bf67d122b1cafd1f54d61c34e2d29f790f1c22a6a7d09b928dd051b31ec42c58ed48cc942bd42a385f7ec79948081ec448198b990eb022e44b0152206652e8f866644cd6ca67a3f9',
        },
      ],
    };
    console.log(`[@runner:processJob] Config: ${JSON.stringify(config)}`);

    const hosts = config.hosts || [];
    const repoUrl = config.repository;
    const repoName = repoUrl.split('/').pop().replace('.git', '');

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
                console.log(`[@runner:processJob] Stdout: ${data}`);
              })
              .stderr.on('data', (data) => {
                output.stderr += data;
                console.log(`[@runner:processJob] Stderr: ${data}`);
              })
              .on('close', (code, signal) => {
                console.log(`[@runner:processJob] Stream closed, code: ${code}, signal: ${signal}`);
                console.log(`[@runner:processJob] Final stdout: ${output.stdout}`);
                console.log(`[@runner:processJob] Final stderr: ${output.stderr}`);
                conn.end();
              });
          });
        })
        .on('error', (err) => {
          console.error(`[@runner:processJob] SSH error: ${err.message}`);
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
