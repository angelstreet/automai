const { v4: uuidv4 } = require('uuid');

const {
  createScriptExecution,
  updateScriptExecution,
  initializeJobOnHost,
  finalizeJobOnHost,
} = require('./jobUtils');
const { writeScriptMetadata } = require('./metadataUtils');
const { pingRepository } = require('./repoUtils');
const { executeSSHCommand, readScriptOutputFiles } = require('./sshConnectionUtils');
const { decrypt, formatEnvVarsForSSH, collectEnvironmentVariables } = require('./utils');

async function executeSSHScripts(
  config,
  jobId,
  started_at,
  decryptedEnvVars,
  supabase,
  config_id,
  team_id,
  creator_id,
  env,
) {
  const hosts = config.hosts;
  let output = { scripts: [], stdout: '', stderr: '' };
  let overallStatus = 'success';

  console.log(
    `[executeSSHScripts] Job data at start of SSH section: team_id=${team_id}, config_id=${config_id}`,
  );

  console.log(
    `[executeSSHScripts] Before creating script execution: team_id=${team_id}, creator_id=${creator_id}`,
  );

  for (const host of hosts) {
    console.log(`[executeSSHScripts] Host: ${host.ip}, OS: ${host.os}, Username: ${host.username}`);
    let sshKeyOrPass = host.key || host.password;
    if (!sshKeyOrPass) {
      console.error(`[executeSSHScripts] No key/password for ${host.ip}`);
      throw new Error(`No key/password for ${host.ip}`);
    }

    if (host.authType === 'privateKey' && sshKeyOrPass.includes(':')) {
      try {
        sshKeyOrPass = decrypt(sshKeyOrPass, process.env.ENCRYPTION_KEY);
        console.log(`[executeSSHScripts] Decrypted key: ${sshKeyOrPass.slice(0, 50)}...`);
      } catch (decryptError) {
        console.error(`[executeSSHScripts] Decryption failed: ${decryptError.message}`);
        throw new Error(`Decryption failed: ${decryptError.message}`);
      }
    } else {
      console.log(`[executeSSHScripts] Plain key/password: ${sshKeyOrPass.slice(0, 50)}...`);
    }

    // Initialize job on SSH host using jobUtils function
    let jobFolderPath;
    try {
      jobFolderPath = await initializeJobOnHost(
        supabase,
        jobId,
        started_at,
        config,
        host,
        sshKeyOrPass,
      );
    } catch (error) {
      console.error(
        `[executeSSHScripts] Failed to initialize job on host ${host.ip}: ${error.message}`,
      );
      throw error;
    }

    // Process each script separately for tracking purposes
    for (const script of config.scripts || []) {
      const scriptPath = script.path;
      const scriptName = scriptPath.split('/').pop();
      const parameters = script.parameters || '';

      // Create a script execution record for this specific script on this host
      const scriptExecutionId = await createScriptExecution(supabase, {
        job_run_id: jobId,
        config_id: config_id,
        team_id: team_id,
        creator_id: creator_id,
        script_name: scriptName,
        script_path: scriptPath,
        script_parameters: { parameters },
        host_id: host.id,
        host_name: host.name,
        host_ip: host.ip,
        env: env,
      });

      // Create script folder within job folder
      const scriptFolderName = `${started_at.split('T')[0].replace(/-/g, '')}_${started_at.split('T')[1].split('.')[0].replace(/:/g, '')}_${scriptExecutionId}`;
      const scriptFolderPath = `${jobFolderPath}/${scriptFolderName}`;
      let scriptSetupCommand =
        host.os === 'windows'
          ? `powershell -Command "if (-not (Test-Path '${scriptFolderPath}')) { New-Item -ItemType Directory -Path '${scriptFolderPath}' }"`
          : `mkdir -p ${scriptFolderPath}`;
      console.log(
        `[executeSSHScripts] Creating script folder on host ${host.ip}: ${scriptFolderPath}`,
      );

      // Format command for this script
      const ext = scriptPath.split('.').pop().toLowerCase();
      const command = ext === 'py' ? 'python' : ext === 'sh' ? './' : '';
      const scriptCommand = `${command} ${scriptPath} ${parameters || ''} 2>&1`.trim();

      console.log(`[executeSSHScripts] Script to execute: ${scriptCommand}`);

      let repoCommands = '';
      let scriptFolder = config.script_folder || '';
      let repoDir = '';
      console.log(`[executeSSHScripts] Script folder: ${scriptFolder}`);

      if (config.repository) {
        const repoUrl = config.repository;
        const branch = config.branch || 'main';

        const isRepoAccessible = await pingRepository(repoUrl);
        if (!isRepoAccessible) {
          console.error(
            `[executeSSHScripts] Repository ${repoUrl} is not accessible, aborting job execution.`,
          );
          const completed_at = new Date().toISOString();

          // Update the script execution to 'failed'
          await updateScriptExecution(supabase, {
            script_id: scriptExecutionId,
            status: 'failed',
            error: `Repository ${repoUrl} is not accessible, job aborted.`,
            completed_at: completed_at,
          });

          await supabase
            .from('jobs_run')
            .update({
              status: 'failed',
              output: {
                scripts: [],
                stdout: '',
                stderr: `Repository ${repoUrl} is not accessible, job aborted.`,
              },
              completed_at: completed_at,
            })
            .eq('id', jobId);
          console.log(
            `[executeSSHScripts] Updated job ${jobId} to failed status due to inaccessible repository.`,
          );
          throw new Error(`Repository ${repoUrl} is not accessible`);
        }

        // Derive repository directory name from the URL for meaningful identification
        repoDir =
          repoUrl
            .split('/')
            .pop()
            .replace(/\.git$/, '') || 'repo';

        if (host.os === 'windows') {
          console.log(
            `[executeSSHScripts] WARNING: Git must be installed on Windows host ${host.ip} for repository operations.`,
          );
          // Use PowerShell for repository check and operations on Windows
          let repoScript = `if (Test-Path '${repoDir}') { Write-Output 'Repository exists, pulling latest changes'; cd '${repoDir}'; git pull origin ${branch} } else { Write-Output 'Repository does not exist, cloning'; git clone -b ${branch} ${repoUrl} '${repoDir}'; cd '${repoDir}' }`;
          repoCommands = `powershell -Command "${repoScript}"; cd '${scriptFolder}'`;
        } else {
          repoCommands = `
            if [ -d "${repoDir}" ]; then
              cd ${repoDir} && git pull origin ${branch} || exit 1
            else
              rm -rf ${repoDir} && git clone -b ${branch} ${repoUrl} ${repoDir} && cd ${repoDir} || exit 1
            fi
          `;
        }
        console.log(
          `[executeSSHScripts] Repository setup: ${repoDir} exists ? git pull : clone ${repoUrl} branch ${branch}${scriptFolder ? `, then navigate to ${scriptFolder}` : ''}`,
        );
      } else {
        if (config.scripts && config.scripts.length > 0 && config.scripts[0].folder) {
          scriptFolder = config.scripts[0].folder;
          console.log(
            `[executeSSHScripts] Using folder from script configuration as working directory: ${scriptFolder}`,
          );
        } else {
          console.log(
            `[executeSSHScripts] No folder specified in script configuration or repository, using default SSH directory (if any)`,
          );
        }
      }

      // Add environment variables to the SSH script
      const envVars = collectEnvironmentVariables(decryptedEnvVars);
      let envSetup = formatEnvVarsForSSH(envVars, host.os);
      if (envSetup) {
        console.log(
          `[executeSSHScripts] Environment variables setup for SSH: ${Object.keys(envVars).join(', ')}`,
        );
      } else {
        console.log(`[executeSSHScripts] No environment variables to set for SSH host ${host.ip}`);
      }

      // Build the full script command with all setup including script folder creation
      let fullScript;
      if (host.os === 'windows') {
        fullScript = `${repoCommands}${repoCommands ? ' && ' : ''}${repoDir ? `cd ${repoDir} && ` : ''} cd ${scriptFolder} && ${scriptSetupCommand} && powershell -Command "if (Test-Path 'requirements.txt') { pip install -r requirements.txt } else { Write-Output 'No requirements.txt file found, skipping pip install' }" && ${envSetup}python --version && echo ============================= && ${scriptCommand} > ${scriptFolderPath}/stdout.txt 2> ${scriptFolderPath}/stderr.txt`;
      } else {
        fullScript = `${repoCommands} ${repoCommands ? '' : repoDir ? `cd ${repoDir} && ` : ''} cd ${scriptFolder} && ${scriptSetupCommand} && if [ -f "requirements.txt" ]; then pip install -r requirements.txt; else echo "No requirements.txt file found, skipping pip install"; fi && ${envSetup}python --version && echo ============================= && ${scriptCommand} > ${scriptFolderPath}/stdout.txt 2> ${scriptFolderPath}/stderr.txt`;
      }
      console.log(`[executeSSHScripts] SSH command to be executed on ${host.ip}: ${fullScript}`);

      // Update the script execution to 'in_progress'
      const scriptStartedAt = new Date().toISOString();
      await updateScriptExecution(supabase, {
        script_id: scriptExecutionId,
        status: 'in_progress',
        started_at: scriptStartedAt,
      });

      // Execute the script using the helper function
      let scriptResult;
      try {
        scriptResult = await executeSSHCommand(host, sshKeyOrPass, fullScript);
        // Update main job status to in_progress if not already
        supabase
          .from('jobs_run')
          .update({
            status: 'in_progress',
            started_at: started_at,
          })
          .eq('id', jobId)
          .then(() => {
            console.log(`[executeSSHScripts] Updated job ${jobId} status to 'in_progress'`);
          })
          .catch((err) => {
            console.error(`[executeSSHScripts] Failed to update job status: ${err.message}`);
          });
      } catch (error) {
        console.error(`[executeSSHScripts] Error executing script: ${error.message}`);
        // Update script execution with error
        await updateScriptExecution(supabase, {
          script_id: scriptExecutionId,
          status: 'failed',
          error: error.message,
          completed_at: new Date().toISOString(),
        });
        // Add error to output collection
        output.scripts.push({
          script_path: scriptPath,
          iteration: 1,
          stdout: '',
          stderr: error.message,
        });
        overallStatus = 'failed';
        continue;
      }

      // Read stdout and stderr from files using the helper function
      const { stdoutFromFile, stderrFromFile } = await readScriptOutputFiles(
        host,
        sshKeyOrPass,
        scriptFolderPath,
        scriptResult,
        host.os,
      );

      // Update script output with results
      const scriptCompletedAt = new Date().toISOString();
      // Determine if script was successful based on output or exit code
      const isSuccess =
        (stdoutFromFile && stdoutFromFile.includes('Test Success')) || scriptResult.exitCode === 0;
      const status = isSuccess ? 'success' : 'failed';
      // Write metadata.json for this script execution
      const startDate = new Date(scriptStartedAt);
      const endDate = new Date(scriptCompletedAt);
      const duration = ((endDate - startDate) / 1000).toFixed(2); // Duration in seconds
      writeScriptMetadata(scriptFolderPath, {
        job_id: jobId,
        script_id: scriptExecutionId,
        script_name: scriptName,
        script_path: scriptPath,
        parameters,
        start_time: scriptStartedAt,
        end_time: scriptCompletedAt,
        status,
        env: env || 'N/A',
        job_name: config.config_name || 'N/A',
        duration: duration,
      });
      // Update script execution in database without report URL (handled by upload_and_report.py)
      await updateScriptExecution(supabase, {
        script_id: scriptExecutionId,
        status: status,
        output: {
          stdout: stdoutFromFile,
          stderr: stderrFromFile,
          exitCode: scriptResult.exitCode,
        },
        completed_at: scriptCompletedAt,
      });

      // Add to the overall output collection
      const scriptOutputRecord = {
        script_path: scriptPath,
        iteration: 1,
        stdout: stdoutFromFile,
        stderr: stderrFromFile,
      };
      output.scripts.push(scriptOutputRecord);

      // Update overall status if any script fails
      if (!isSuccess) {
        overallStatus = 'failed';
      }
    }

    // Finalize job on SSH host using jobUtils function
    try {
      await finalizeJobOnHost(
        supabase,
        jobId,
        overallStatus,
        output,
        host,
        sshKeyOrPass,
        jobFolderPath,
      );
    } catch (error) {
      console.error(
        `[executeSSHScripts] Failed to finalize job on host ${host.ip}: ${error.message}`,
      );
      // Fallback to updating job status without report URL if finalization fails
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

  // Return output and status without final job update (handled by upload_and_report.py)
  return { output, overallStatus, started_at, config_name: config.config_name || '' };
}

async function executeScriptOnSSH(jobId, script, createdAt, host) {
  const scriptExecutionId = uuidv4();
  console.log(
    `[executeScriptOnSSH] Executing script ${script.path} for job ${jobId} on host ${host.hostname}, script execution ID: ${scriptExecutionId}`,
  );

  await jobUtils.createScriptExecution(
    jobId,
    scriptExecutionId,
    script.path,
    script.parameters || '',
    createdAt,
    env,
  );
  await jobUtils.updateScriptExecution(scriptExecutionId, 'in_progress', createdAt);

  const client = new SSHClient();
  let status = 'success';
  let stdout = '';
  let stderr = '';
  let startTime = new Date().toISOString();

  // Create uploadFolder structure on SSH host
  const uploadFolder = '/tmp/uploadFolder';
  const jobFolderName = `${createdAt.split('T')[0].replace(/-/g, '')}_${createdAt.split('T')[1].split('.')[0].replace(/:/g, '')}_${jobId}`;
  const jobFolderPath = `${uploadFolder}/${jobFolderName}`;
  const scriptFolderName = `${createdAt.split('T')[0].replace(/-/g, '')}_${createdAt.split('T')[1].split('.')[0].replace(/:/g, '')}_${scriptExecutionId}`;
  const scriptFolderPath = `${jobFolderPath}/${scriptFolderName}`;

  try {
    await new Promise((resolve, reject) => {
      client.on('ready', async () => {
        console.log(
          `[executeScriptOnSSH] SSH connection established for job ${jobId} on host ${host.hostname}`,
        );

        try {
          // Create uploadFolder structure
          await execCommand(client, `mkdir -p ${scriptFolderPath}`);
          console.log(
            `[executeScriptOnSSH] Created script folder on host ${host.hostname}: ${scriptFolderPath}`,
          );

          // Save script to script folder
          const scriptContentPath = path.join('scripts', script.path);
          if (fs.existsSync(scriptContentPath)) {
            const scriptContent = fs.readFileSync(scriptContentPath, 'utf8');
            await execCommand(
              client,
              `echo "${escapeShellArg(scriptContent)}" > ${scriptFolderPath}/script.py`,
            );
            console.log(
              `[executeScriptOnSSH] Saved script content to ${scriptFolderPath}/script.py on host ${host.hostname}`,
            );
          }

          // Prepare command to execute the script and save outputs
          // (Commented out or incomplete code removed to fix linter error)
        } catch (error) {
          console.error(`[executeScriptOnSSH] Error: ${error.message}`);
          status = 'failed';
        } finally {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error(`[executeScriptOnSSH] Error: ${error.message}`);
    status = 'failed';
  }

  return { status, stdout, stderr, startTime, endTime: new Date().toISOString() };
}

module.exports = { executeSSHScripts, executeScriptOnSSH };
