const crypto = require('crypto');

const { Client } = require('ssh2');

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

function prepareJobInitializationPayload(jobId, started_at, uploadScriptContent, config = {}) {
  return {
    job_id: jobId,
    created_at: started_at,
    upload_script_content: uploadScriptContent,
    config_name: config.config_name || '',
    credentials: {
      CLOUDFLARE_R2_ENDPOINT: process.env.CLOUDFLARE_R2_ENDPOINT || '',
      CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
  };
}

function prepareJobFinalizationPayload(
  jobId,
  started_at,
  overallStatus = 'success',
  env = 'prod',
  config_name = '',
) {
  return {
    job_id: jobId,
    created_at: started_at,
    overall_status: overallStatus,
    env: env,
    config_name: config_name,
    start_time: started_at, // Using the real start time
  };
}

function formatEnvVarsForSSH(decryptedEnvVars, osType) {
  if (Object.keys(decryptedEnvVars).length === 0) {
    return '';
  }
  const envSetup =
    osType === 'windows'
      ? Object.entries(decryptedEnvVars)
          .map(([key, value]) => `set ${key}=${value}`)
          .join(' && ')
      : Object.entries(decryptedEnvVars)
          .map(([key, value]) => `export ${key}=${value}`)
          .join(' && ');
  return envSetup + (osType === 'windows' ? ' && ' : ' && ');
}

function collectEnvironmentVariables(decryptedEnvVars) {
  return Object.keys(decryptedEnvVars).length > 0 ? decryptedEnvVars : {};
}

// SFTP upload helper
async function uploadFileViaSFTP(host, sshKeyOrPass, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const sshConfig = {
      host: host.ip,
      port: host.port || 22,
      username: host.username,
    };
    if (host.authType === 'privateKey') {
      sshConfig.privateKey = sshKeyOrPass;
    } else {
      sshConfig.password = sshKeyOrPass;
    }
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        console.log(`[@utils:uploadFileViaSFTP] SFTP uploading ${localPath} to ${remotePath}`);
        sftp.fastPut(localPath, remotePath, (err) => {
          conn.end();
          if (err) return reject(err);
          resolve();
        });
      });
    });
    conn.on('error', (err) => {
      reject(err);
    });
    conn.connect(sshConfig);
  });
}

module.exports = {
  decrypt,
  ALGORITHM,
  prepareJobInitializationPayload,
  prepareJobFinalizationPayload,
  formatEnvVarsForSSH,
  collectEnvironmentVariables,
  uploadFileViaSFTP,
};
