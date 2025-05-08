const fs = require('fs');
const os = require('os');
const path = require('path');

const { Client } = require('ssh2');

const { writeJobMetadata } = require('./metadataUtils');
const { uploadFileViaSFTP } = require('./utils');

// Helper function to get the queue name based on environment
function getQueueName(env = process.env.RUNNER_ENV) {
  const runnerEnv = env || 'preprod';
  return runnerEnv === 'prod' ? 'jobs_queue_prod' : 'jobs_queue_preprod';
}

async function getJobFromQueue(redis_queue) {
  const queueName = getQueueName();

  const queueLength = await redis_queue.llen(queueName);
  console.log(`[@db:jobUtils:getJobFromQueue] Queue length for ${queueName}: ${queueLength} jobs`);

  // Peek at the last job without removing it
  const job = await redis_queue.lindex(queueName, -1);
  if (!job) {
    console.log(`[@db:jobUtils:getJobFromQueue] Queue ${queueName} is empty`);
    return null;
  }

  console.log(`[@db:jobUtils:getJobFromQueue] Peeking at job from ${queueName}: ${job}`);
  return job;
}

async function removeJobFromQueue(redis_queue, jobData) {
  const queueName = getQueueName();
  const jobString = typeof jobData === 'string' ? jobData : JSON.stringify(jobData);

  await redis_queue.lrem(queueName, 1, jobString);
  console.log(`[@db:jobUtils:removeJobFromQueue] Removed job from ${queueName}`);
}

async function addJobToQueue(redis_queue, jobData) {
  const queueName = getQueueName();
  const jobString = typeof jobData === 'string' ? jobData : JSON.stringify(jobData);

  await redis_queue.lpush(queueName, jobString);
  console.log(`[@db:jobUtils:addJobToQueue] Added job to ${queueName}`);
}

async function fetchJobConfig(supabase, config_id) {
  const { data, error } = await supabase
    .from('jobs_configuration')
    .select('config, is_active, team_id, creator_id, name')
    .eq('id', config_id)
    .single();
  if (error || !data) {
    console.error(
      `[@db:jobUtils:fetchJobConfig] Failed to fetch config ${config_id}: ${error?.message}`,
    );
    throw new Error(`Failed to fetch config ${config_id}: ${error?.message}`);
  }
  console.log(`[@db:jobUtils:fetchJobConfig] Config: ${JSON.stringify(data.config)}`);
  return {
    config: data.config,
    team_id: data.team_id,
    creator_id: data.creator_id,
    is_active: data.is_active,
    name: data.name,
    env: data.config.env,
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

async function initializeJobOnHost(jobId, started_at, host, sshKeyOrPass, config) {
  const jobFolderName = `${started_at.split('T')[0].replace(/-/g, '')}_${started_at.split('T')[1].split('.')[0].replace(/:/g, '')}_${jobId}`;
  const uploadFolder = host.os === 'windows' ? 'C:/temp/uploadFolder' : '/tmp/uploadFolder';
  const jobFolderPath = `${uploadFolder}/${jobFolderName}`;
  let command;
  let repoCommands = '';
  let repoDir = '';
  console.log(`[initializeJobOnHost] Config: ${JSON.stringify(config)}`);
  if (config && config.repository) {
    const repoUrl = config.repository;
    const branch = config.branch;
    repoDir =
      repoUrl
        .split('/')
        .pop()
        .replace(/\.git$/, '') || 'repo';
    console.log(`[initializeJobOnHost] Setting up repository ${repoDir} on host ${host.ip}`);

    if (host.os === 'windows') {
      console.log(
        `[initializeJobOnHost] WARNING: Git must be installed on Windows host ${host.ip} for repository operations.`,
      );
      let repoScript = `if (Test-Path '${repoDir}') { Write-Output 'Repository exists, pulling latest changes'; cd '${repoDir}'; git pull origin ${branch} } else { Write-Output 'Repository does not exist, cloning'; git clone -b ${branch} ${repoUrl} '${repoDir}'; cd '${repoDir}' }`;
      repoCommands = `powershell -Command "${repoScript}"`;
    } else {
      repoCommands = `if [ -d "${repoDir}" ]; then cd ${repoDir} && git pull origin ${branch} || exit 1; else rm -rf ${repoDir} && git clone -b ${branch} ${repoUrl} ${repoDir} && cd ${repoDir} || exit 1; fi`;
    }
    console.log(`[initializeJobOnHost] Repository setup command: ${repoCommands}`);
  }

  if (host.os === 'windows') {
    command = `powershell -Command "if (-not (Test-Path '${jobFolderPath}')) { New-Item -ItemType Directory -Path '${jobFolderPath}' }"`;
    if (repoCommands) {
      command = `${command} && ${repoCommands}`;
    }
  } else {
    command = `mkdir -p ${jobFolderPath}`;
    if (repoCommands) {
      command = `${command} && ${repoCommands}`;
    }
  }
  console.log(`[initializeJobOnHost] Executing command on host ${host.ip}: ${command}`);
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
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        stream.on('close', (code) => {
          console.log('[SSH stream close]', code);
          conn.end();
          if (code === 0) resolve();
          else reject(new Error(`Directory creation failed with code ${code}`));
        });
        stream.on('end', () => {
          console.log('[SSH stream end]');
        });
        stream.on('exit', (code) => {
          console.log('[SSH stream exit]', code);
        });
        stream.on('data', (data) => {
          console.log('[SSH STDOUT]:', data.toString());
        });
        stream.stderr.on('data', (data) => {
          console.log('[SSH STDERR]:', data.toString());
        });
      });
    });
    conn.on('error', (err) => reject(err));
    conn.connect(sshConfig);
  });

  // 2. Use a temp directory for job files
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'job-'));
  try {
    // Write files to tempDir
    const uploadScriptLocal = path.join(tempDir, 'upload_and_report.py');
    const requirementsLocal = path.join(tempDir, 'requirements.txt');
    const envFileLocal = path.join(tempDir, '.env');
    // Copy or write content
    fs.copyFileSync('upload_and_report.py', uploadScriptLocal);
    if (!fs.existsSync(requirementsLocal)) {
      fs.writeFileSync(requirementsLocal, 'boto3\npython-dotenv\nsupabase\n');
    }
    fs.writeFileSync(
      envFileLocal,
      `CLOUDFLARE_R2_ENDPOINT=${process.env.CLOUDFLARE_R2_ENDPOINT || ''}\nCLOUDFLARE_R2_ACCESS_KEY_ID=${process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || ''}\nCLOUDFLARE_R2_SECRET_ACCESS_KEY=${process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || ''}\nSUPABASE_URL=${process.env.SUPABASE_URL || ''}\nSUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}\n`,
    );

    // Remote paths
    const uploadScriptRemote = `${jobFolderPath}/upload_and_report.py`;
    const requirementsRemote = `${jobFolderPath}/requirements.txt`;
    const envFileRemote = `${jobFolderPath}/.env`;

    // Upload
    await uploadFileViaSFTP(host, sshKeyOrPass, uploadScriptLocal, uploadScriptRemote);
    await uploadFileViaSFTP(host, sshKeyOrPass, requirementsLocal, requirementsRemote);
    await uploadFileViaSFTP(host, sshKeyOrPass, envFileLocal, envFileRemote);
  } finally {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // 3. Install dependencies (OS-specific)
  let pipInstallCmd;
  if (host.os === 'windows') {
    pipInstallCmd = `powershell -Command "pip install -r '${jobFolderPath}/requirements.txt'"`;
  } else {
    pipInstallCmd = `pip install -r ${jobFolderPath}/requirements.txt`;
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
          console.log('[SSH stream close]', code);
          conn.end();
          if (code === 0) resolve();
          else reject(new Error(`pip install failed with code ${code}`));
        });
        stream.on('end', () => {
          console.log('[SSH stream end]');
        });
        stream.on('exit', (code) => {
          console.log('[SSH stream exit]', code);
        });
        stream.on('data', (data) => {
          console.log('[SSH STDOUT]:', data.toString());
        });
        stream.stderr.on('data', (data) => {
          console.log('[SSH STDERR]:', data.toString());
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
  config_name,
  scriptStartedAt,
) {
  console.log(
    `[finalizeJobOnHost] Finalizing job ${jobId} on host ${host.ip} with upload_and_report.py for config ${config_name}`,
  );
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'job-'));
  const metadataLocal = path.join(tempDir, 'metadata.json');
  writeJobMetadata(metadataLocal, {
    job_id: jobId,
    start_time: scriptStartedAt,
    end_time: new Date().toISOString(),
    config_name: config_name || 'N/A',
    env: output.env || 'N/A',
    status: overallStatus,
    duration: output.started_at
      ? ((new Date() - new Date(output.started_at)) / 1000).toFixed(2)
      : 'N/A',
  });
  const metadataRemote = path.join(jobFolderPath, 'metadata.json');
  await uploadFileViaSFTP(host, sshKeyOrPass, metadataLocal, metadataRemote);
  // Ensure upload_and_report.py handles all files in the job folder
  const finalizeCommand =
    host.os === 'windows'
      ? `powershell -Command "cd '${jobFolderPath}'; python upload_and_report.py"`
      : `cd ${jobFolderPath} && python upload_and_report.py`;
  const connFinalize = new Client();

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
    console.log(`[finalizeJobOnHost]--------------------------------`);
    console.log(`[finalizeJobOnHost] Job finalization completed on host ${host.ip}`);
    console.log(
      `[finalizeJobOnHost] Finalization result: ${JSON.stringify(finalizeResult, null, 2)}`,
    );
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
  getQueueName,
  getJobFromQueue,
  removeJobFromQueue,
  addJobToQueue,
  fetchJobConfig,
  createJobRun,
  updateJobStatus,
  createScriptExecution,
  updateScriptExecution,
  initializeJobOnHost,
  finalizeJobOnHost,
};
