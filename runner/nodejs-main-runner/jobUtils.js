async function getJobFromQueue(redis) {
  const queueLength = await redis.llen('jobs_queue');
  console.log(`[getJobFromQueue] Queue length: ${queueLength} jobs`);

  // Peek at the last job without removing it
  const job = await redis.lindex('jobs_queue', -1);
  if (!job) {
    console.log(`[getJobFromQueue] Queue is empty`);
    return null;
  }

  console.log(`[getJobFromQueue] Peeking at job: ${job}`);
  return job;
}

async function fetchJobConfig(supabase, config_id) {
  const { data, error } = await supabase
    .from('jobs_configuration')
    .select('config, is_active, team_id, creator_id')
    .eq('id', config_id)
    .single();
  if (error || !data) {
    console.error(`[fetchJobConfig] Failed to fetch config ${config_id}: ${error?.message}`);
    throw new Error(`Failed to fetch config ${config_id}: ${error?.message}`);
  }
  console.log(`[fetchJobConfig] Config: ${JSON.stringify(data.config)}`);
  return {
    config: data.config,
    team_id: data.team_id,
    creator_id: data.creator_id,
    is_active: data.is_active,
  };
}

async function createJobRun(supabase, config_id, env) {
  const created_at = new Date().toISOString();
  const { data: jobRunData, error: jobError } = await supabase
    .from('jobs_run')
    .insert({
      config_id,
      status: 'pending',
      output: { scripts: [] },
      created_at: created_at,
      env: env,
    })
    .select('id')
    .single();

  if (jobError) {
    console.error(`[createJobRun] Failed to create pending job: ${jobError.message}`);
    throw new Error(`Failed to create pending job: ${jobError.message}`);
  }

  const jobId = jobRunData.id;
  console.log(`[createJobRun] Created job with ID ${jobId} and status 'pending'`);
  return { jobId, created_at };
}

async function updateJobStatus(supabase, jobId, status, output = null, completed_at = null) {
  const updateData = { status };
  if (output) updateData.output = output;
  if (completed_at) updateData.completed_at = completed_at;

  const { error: statusError } = await supabase.from('jobs_run').update(updateData).eq('id', jobId);

  if (statusError) {
    console.error(
      `[updateJobStatus] Failed to update job ${jobId} to ${status}: ${statusError.message}`,
    );
    throw new Error(`Failed to update job status: ${statusError.message}`);
  }

  console.log(`[updateJobStatus] Updated job ${jobId} to status: ${status}`);
}

async function createScriptExecution(
  supabase,
  {
    job_run_id,
    config_id,
    team_id,
    creator_id,
    script_name,
    script_path,
    script_parameters,
    host_id = null,
    host_name = null,
    host_ip = null,
    env = 'preprod',
  },
) {
  console.log(
    `[@db:jobUtils:createScriptExecution] Starting to create script execution for job: ${job_run_id}, with creator_id: ${creator_id}`,
  );

  try {
    const { data, error } = await supabase
      .from('scripts_run')
      .insert({
        job_run_id: job_run_id,
        config_id: config_id,
        team_id: team_id,
        creator_id: creator_id,
        script_name: script_name,
        script_path: script_path,
        script_parameters: script_parameters,
        host_id: host_id,
        host_name: host_name,
        host_ip: host_ip,
        env: env,
      })
      .select('id')
      .single();

    if (error) {
      console.error(
        `[@db:jobUtils:createScriptExecution] ERROR: Failed to insert script execution: ${error.message}`,
      );
      throw new Error(`Failed to insert script execution: ${error.message}`);
    }

    console.log(
      `[@db:jobUtils:createScriptExecution] Successfully created script execution with ID: ${data.id}`,
    );
    return data.id; // Returns script execution ID
  } catch (err) {
    console.error(`[@db:jobUtils:createScriptExecution] ERROR: Unexpected error: ${err.message}`);
    throw err;
  }
}

async function updateScriptExecution(
  supabase,
  {
    script_id,
    status,
    output = null,
    logs = null,
    error = null,
    started_at = null,
    completed_at = null,
    report_url = null,
  },
) {
  console.log(
    `[@db:jobUtils:updateScriptExecution] Updating script execution: ${script_id} with status: ${status}`,
  );

  try {
    const updateData = { status };
    if (output) updateData.output = output;
    if (logs) updateData.logs = logs;
    if (error) updateData.error = error;
    if (started_at) updateData.started_at = started_at;
    if (completed_at) updateData.completed_at = completed_at;
    if (report_url) updateData.report_url = report_url;

    const { error: updateError } = await supabase
      .from('scripts_run')
      .update(updateData)
      .eq('id', script_id);

    if (updateError) {
      console.error(
        `[@db:jobUtils:updateScriptExecution] ERROR: Failed to update script execution: ${updateError.message}`,
      );
      throw new Error(`Failed to update script execution: ${updateError.message}`);
    }

    console.log(
      `[@db:jobUtils:updateScriptExecution] Successfully updated script execution: ${script_id}`,
    );
  } catch (err) {
    console.error(`[@db:jobUtils:updateScriptExecution] ERROR: Unexpected error: ${err.message}`);
    throw err;
  }
}

const { Client } = require('ssh2');
const fs = require('fs');

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
        console.log(`[initializeJobOnHost] SFTP uploading ${localPath} to ${remotePath}`);
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

async function initializeJobOnHost(_supabase, jobId, started_at, config, host, sshKeyOrPass) {
  console.log(`[initializeJobOnHost] Initializing job ${jobId} on host ${host.ip}`);
  const uploadFolder = host.os === 'windows' ? 'C:/tmp/uploadFolder' : '/tmp/uploadFolder';
  const jobFolderName = `${started_at.split('T')[0].replace(/-/g, '')}_${started_at.split('T')[1].split('.')[0].replace(/:/g, '')}_${jobId}`;
  const jobFolderPath = `${uploadFolder}/${jobFolderName}`;

  // 1. Create directory (OS-specific)
  let createDirCmd;
  if (host.os === 'windows') {
    createDirCmd = `powershell -Command "if (-not (Test-Path '${jobFolderPath}')) { New-Item -ItemType Directory -Path '${jobFolderPath}' }"`;
  } else {
    createDirCmd = `mkdir -p ${jobFolderPath}`;
  }
  console.log(`[initializeJobOnHost] Executing command on host ${host.ip}: ${createDirCmd}`);
  await new Promise((resolve, reject) => {
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
      conn.exec(createDirCmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        stream.on('close', (code) => {
          conn.end();
          if (code === 0) resolve();
          else reject(new Error(`Directory creation failed with code ${code}`));
        });
      });
    });
    conn.on('error', (err) => reject(err));
    conn.connect(sshConfig);
  });

  // 2. Upload files via SFTP (all OSes)
  const uploadScriptLocal = 'upload_and_report.py';
  const requirementsLocal = 'requirements.txt';
  if (!fs.existsSync(requirementsLocal)) {
    fs.writeFileSync(requirementsLocal, 'boto3\npython-dotenv\nsupabase\n');
  }
  const configNameLocal = './config_name.txt';
  fs.writeFileSync(configNameLocal, config.config_name || '');
  const envFileLocal = './.env';
  fs.writeFileSync(
    envFileLocal,
    `CLOUDFLARE_R2_ENDPOINT=${process.env.CLOUDFLARE_R2_ENDPOINT || ''}\nCLOUDFLARE_R2_ACCESS_KEY_ID=${process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || ''}\nCLOUDFLARE_R2_SECRET_ACCESS_KEY=${process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || ''}\nSUPABASE_URL=${process.env.SUPABASE_URL || ''}\nSUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}\n`,
  );
  const uploadScriptRemote = `${jobFolderPath}/upload_and_report.py`;
  const requirementsRemote = `${jobFolderPath}/requirements.txt`;
  const configNameRemote = `${jobFolderPath}/config_name.txt`;
  const envFileRemote = `${jobFolderPath}/.env`;
  await uploadFileViaSFTP(host, sshKeyOrPass, uploadScriptLocal, uploadScriptRemote);
  await uploadFileViaSFTP(host, sshKeyOrPass, requirementsLocal, requirementsRemote);
  await uploadFileViaSFTP(host, sshKeyOrPass, configNameLocal, configNameRemote);
  await uploadFileViaSFTP(host, sshKeyOrPass, envFileLocal, envFileRemote);

  // 3. Install dependencies (OS-specific)
  let pipInstallCmd;
  if (host.os === 'windows') {
    pipInstallCmd = `powershell -Command "pip install -r '${requirementsRemote}'"`;
  } else {
    pipInstallCmd = `pip install -r ${requirementsRemote}`;
  }
  console.log(`[initializeJobOnHost] Executing command on host ${host.ip}: ${pipInstallCmd}`);
  await new Promise((resolve, reject) => {
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
      conn.exec(pipInstallCmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        stream.on('close', (code) => {
          conn.end();
          if (code === 0) resolve();
          else reject(new Error(`pip install failed with code ${code}`));
        });
      });
    });
    conn.on('error', (err) => reject(err));
    conn.connect(sshConfig);
  });
  console.log(`[initializeJobOnHost] Job initialization completed on host ${host.ip}`);
  return jobFolderPath;
}

async function finalizeJobOnHost(
  supabase,
  jobId,
  overallStatus,
  output,
  host,
  sshKeyOrPass,
  jobFolderPath,
) {
  console.log(
    `[finalizeJobOnHost] Finalizing job ${jobId} on host ${host.ip} with upload_and_report.py`,
  );
  const { Client } = require('ssh2');
  const finalizeCommand =
    host.os === 'windows'
      ? `powershell -Command "cd '${jobFolderPath}' && python upload_and_report.py"`
      : `cd ${jobFolderPath} && python upload_and_report.py`;
  const connFinalize = new Client();
  let reportUrl = '';
  try {
    const finalizeResult = await new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        connFinalize.end();
        reject(new Error('SSH connection timeout for finalization'));
      }, 120000); // 120 seconds timeout for finalization

      connFinalize.on('ready', () => {
        clearTimeout(connectionTimeout);
        console.log(`[finalizeJobOnHost] Connected to ${host.ip} for finalization`);
        connFinalize.exec(finalizeCommand, (err, stream) => {
          if (err) {
            connFinalize.end();
            reject(err);
            return;
          }
          let stdout = '';
          let stderr = '';
          stream.on('data', (data) => {
            stdout += data;
            console.log(`${data}`);
            // Extract report URL from output if available
            const reportUrlMatch = stdout.match(
              /Job Run Report URL for job [^:]+: (https?:\/\/[^\s]+)/,
            );
            if (reportUrlMatch && reportUrlMatch[1]) {
              reportUrl = reportUrlMatch[1];
            }
          });
          stream.stderr.on('data', (data) => {
            stderr += data;
            console.log(`[finalizeJobOnHost] Stderr during finalize: ${data}`);
          });
          stream.on('close', (code, signal) => {
            console.log(
              `[finalizeJobOnHost] Finalization command completed with code: ${code}, signal: ${signal}`,
            );
            connFinalize.end();
            resolve({ stdout, stderr, exitCode: code });
          });
        });
      });
      connFinalize.on('error', (err) => {
        clearTimeout(connectionTimeout);
        reject(err);
      });
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
      connFinalize.connect(sshConfig);
    });
    console.log(`[finalizeJobOnHost] Job finalization completed on host ${host.ip}`);
    // Use finalizeResult to avoid linter error, even if just logging
    console.log(
      `[finalizeJobOnHost] Finalization result: ${JSON.stringify(finalizeResult, null, 2)}`,
    );
    // Update job status with report URL if available
    if (reportUrl) {
      await supabase
        .from('jobs_run')
        .update({
          status: overallStatus,
          output: output,
          completed_at: new Date().toISOString(),
          report_url: reportUrl,
        })
        .eq('id', jobId);
      console.log(`[finalizeJobOnHost] Updated job ${jobId} with report URL: ${reportUrl}`);
    } else {
      console.log(`[finalizeJobOnHost] No report URL found in finalize output for job ${jobId}`);
      await supabase
        .from('jobs_run')
        .update({
          status: overallStatus,
          output: output,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }
  } catch (error) {
    console.error(`[finalizeJobOnHost] Error finalizing job on host ${host.ip}: ${error.message}`);
    // Update job status without report URL
    await supabase
      .from('jobs_run')
      .update({
        status: overallStatus,
        output: output,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

module.exports = {
  getJobFromQueue,
  fetchJobConfig,
  createJobRun,
  updateJobStatus,
  createScriptExecution,
  updateScriptExecution,
  initializeJobOnHost,
  finalizeJobOnHost,
};
