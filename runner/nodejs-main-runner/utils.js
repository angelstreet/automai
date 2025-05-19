const crypto = require('crypto');
const path = require('path');

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
          .map(([key, value]) => {
            // Escape only specific characters that would break shell syntax, avoiding over-escaping
            // Don't escape parentheses unnecessarily as they are valid in passwords
            const escapedValue = value.replace(/(['"\\$`!|&;<>])/g, '\\$1');
            return `export ${key}='${escapedValue}'`;
          })
          .join(' && ');
  return envSetup;
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

function determineScriptPaths(
  jobId,
  started_at,
  scriptExecutionId,
  host,
  scriptPath,
  config,
  basePath = '',
) {
  const scriptName = scriptPath.split('/').pop();
  let repoDir = '';
  let scriptFolder = config.script_folder || '';

  if (config.repository) {
    const repoUrl = config.repository;
    repoDir =
      repoUrl
        .split('/')
        .pop()
        .replace(/\.git$/, '') || 'repo';
    console.log(`[@utils:determineScriptPaths] Using repository directory: ${repoDir}`);
  } else if (config.scripts && config.scripts.length > 0 && config.scripts[0].folder) {
    scriptFolder = config.scripts[0].folder;
    console.log(
      `[@utils:determineScriptPaths] Using folder from script configuration: ${scriptFolder}`,
    );
  } else {
    console.log(
      `[@utils:determineScriptPaths] No repository or folder specified, using default SSH directory`,
    );
  }

  const uploadFolder = host.os === 'windows' ? 'C:/temp/uploadFolder' : '/tmp/uploadFolder';
  const jobRunFolderName = `${started_at.split('T')[0].replace(/-/g, '')}_${started_at.split('T')[1].split('.')[0].replace(/:/g, '')}_${jobId}`;
  const jobRunFolderPath = `${uploadFolder}/${jobRunFolderName}`;
  const scriptRunFolderName = `${started_at.split('T')[0].replace(/-/g, '')}_${started_at.split('T')[1].split('.')[0].replace(/:/g, '')}_${scriptExecutionId}`;
  const scriptRunFolderPath = `${jobRunFolderPath}/${scriptRunFolderName}`;

  let scriptRelativePath = scriptPath;
  let scriptAbsolutePath = scriptPath;
  let scriptFolderAbsolutePath = scriptFolder;

  if (repoDir) {
    scriptRelativePath =
      host.os === 'windows'
        ? `${scriptFolder ? scriptFolder + '/' : ''}${scriptPath}`
        : path.join(scriptFolder || '', scriptPath);
    scriptAbsolutePath =
      host.os === 'windows'
        ? `${basePath}/${repoDir}/${scriptRelativePath}`.replace(/\\/g, '/')
        : path.join(basePath, repoDir, scriptRelativePath).replace(/\\/g, '/');
    scriptFolderAbsolutePath =
      host.os === 'windows'
        ? `${basePath}/${repoDir}/${scriptFolder}`.replace(/\\/g, '/')
        : path.join(basePath, repoDir, scriptFolder).replace(/\\/g, '/');
  } else if (scriptFolder) {
    scriptRelativePath = scriptPath;
    // Check if scriptFolder is a full path
    const isFullPath =
      host.os === 'windows' ? /[a-zA-Z]:/.test(scriptFolder) : scriptFolder.startsWith('/');
    if (isFullPath) {
      scriptAbsolutePath =
        host.os === 'windows'
          ? `${scriptFolder}/${scriptPath}`.replace(/\\/g, '/')
          : path.join(scriptFolder, scriptPath).replace(/\\/g, '/');
      scriptFolderAbsolutePath = scriptFolder.replace(/\\/g, '/');
      console.log(
        `[@utils:determineScriptPaths] Detected full path for scriptFolder: ${scriptFolder}`,
      );
    } else {
      scriptAbsolutePath =
        host.os === 'windows'
          ? `${basePath}/${scriptFolder}/${scriptPath}`.replace(/\\/g, '/')
          : path.join(basePath, scriptFolder, scriptPath).replace(/\\/g, '/');
      scriptFolderAbsolutePath = `${basePath}/${scriptFolder}`.replace(/\\/g, '/');
      console.log(
        `[@utils:determineScriptPaths] Using relative path for scriptFolder: ${scriptFolder}`,
      );
    }
  } else {
    scriptAbsolutePath =
      host.os === 'windows'
        ? `${basePath}/${scriptPath}`.replace(/\\/g, '/')
        : path.join(basePath, scriptPath).replace(/\\/g, '/');
  }

  console.log(`[@utils:determineScriptPaths] Determined paths for script ${scriptName}:`);
  console.log(`[@utils:determineScriptPaths]   - scriptRelativePath: ${scriptRelativePath}`);
  console.log(`[@utils:determineScriptPaths]   - scriptAbsolutePath: ${scriptAbsolutePath}`);
  console.log(
    `[@utils:determineScriptPaths]   - scriptFolderAbsolutePath: ${scriptFolderAbsolutePath}`,
  );
  console.log(`[@utils:determineScriptPaths]   - jobRunFolderPath: ${jobRunFolderPath}`);
  console.log(`[@utils:determineScriptPaths]   - scriptRunFolderPath: ${scriptRunFolderPath}`);

  return {
    scriptName,
    scriptRelativePath,
    scriptAbsolutePath,
    scriptFolderAbsolutePath,
    jobRunFolderPath,
    scriptRunFolderPath,
  };
}

module.exports = {
  decrypt,
  ALGORITHM,
  prepareJobInitializationPayload,
  prepareJobFinalizationPayload,
  formatEnvVarsForSSH,
  collectEnvironmentVariables,
  uploadFileViaSFTP,
  determineScriptPaths,
};
