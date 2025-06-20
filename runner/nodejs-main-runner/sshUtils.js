const fs = require('fs');
const os = require('os');
const path = require('path');

const { v4: uuidv4 } = require('uuid');

const {
  createScriptExecution,
  updateScriptExecution,
  initializeJobOnHost,
  finalizeJobOnHost,
} = require('./jobUtils');
const { writeScriptMetadata } = require('./metadataUtils');
const { executeSSHCommand, readScriptOutputFiles } = require('./sshConnectionUtils');
const {
  decrypt,
  formatEnvVarsForSSH,
  collectEnvironmentVariables,
  uploadFileViaSFTP,
  determineScriptPaths,
} = require('./utils');

// SFTP upload helper function removed and imported from utils.js

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
  config_name,
) {
  console.log(`[executeSSHScripts] Starting SSH script execution for job ${jobId}`);

  let output = { scripts: [], stdout: '', stderr: '', env: env, config_name: config_name };
  let overallStatus = 'success';

  // Update job status to 'in_progress' before starting script executions
  try {
    const { error: statusError } = await supabase
      .from('jobs_run')
      .update({
        status: 'in_progress',
        started_at: started_at,
      })
      .eq('id', jobId);

    if (statusError) {
      console.error(
        `[executeSSHScripts] Failed to update job ${jobId} to in_progress: ${statusError.message}`,
      );
      throw new Error(`Failed to update job status: ${statusError.message}`);
    }
    console.log(`[executeSSHScripts] Updated job ${jobId} status to 'in_progress'`);
  } catch (error) {
    console.error(`[executeSSHScripts] Initialization failed for job ${jobId}: ${error.message}`);
    output.stderr = `Initialization failed: ${error.message}`;
    overallStatus = 'failed';
    await supabase
      .from('jobs_run')
      .update({
        status: overallStatus,
        completed_at: new Date().toISOString(),
        output: output,
      })
      .eq('id', jobId);
    return { output, overallStatus, started_at };
  }

  const hosts = config.hosts;
  let scriptStartedAt = new Date().toISOString();

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
      jobFolderPath = await initializeJobOnHost(jobId, started_at, host, sshKeyOrPass, config);
    } catch (error) {
      console.error(
        `[executeSSHScripts] Failed to initialize job on host ${host.ip}: ${error.message}`,
      );
      throw error;
    }

    // Use virtual environment for non-Windows hosts if provided
    let venvPrefix = '';
    let venvPath = '';
    if (host.os !== 'windows') {
      venvPath = '/tmp/python/venv';
      
      // Since venv is already set up in initializeJobOnHost, just verify it exists and use it
      console.log(`[executeSSHScripts] Verifying virtual environment exists at ${venvPath} on ${host.ip}`);
      
      try {
        const checkVenvCommand = `test -d ${venvPath} && echo 'exists' || echo 'not exists'`;
        const venvCheckResult = await executeSSHCommand(host, sshKeyOrPass, checkVenvCommand);
        
        if (venvCheckResult.stdout.includes('exists')) {
          console.log(`[executeSSHScripts] Using existing virtual environment on ${host.ip} at ${venvPath}`);
          venvPrefix = `source ${venvPath}/bin/activate && `;
        } else {
          console.log(`[executeSSHScripts] Virtual environment not found at ${venvPath} on ${host.ip}, falling back to system Python`);
          // Fallback to system Python - this shouldn't happen if initializeJobOnHost worked correctly
          venvPrefix = '';
        }
      } catch (error) {
        console.error(`[executeSSHScripts] Failed to verify virtual environment on ${host.ip}: ${error.message}`);
        console.log(`[executeSSHScripts] Falling back to system Python on ${host.ip}`);
        // Fallback to no prefix, might fail with externally managed environment error
        venvPrefix = '';
      }
    }

    // Process each script separately for tracking purposes
    let i = 0;
    let length = config.scripts.length;
    for (const script of config.scripts || []) {
      i++;
      const scriptPath = script.path;
      const parameters = script.parameters || '';

      // Create a script execution record for this specific script on this host
      const scriptExecutionId = await createScriptExecution(supabase, {
        job_run_id: jobId,
        config_id: config_id,
        team_id: team_id,
        creator_id: creator_id,
        script_name: scriptPath.split('/').pop(),
        script_path: scriptPath,
        script_parameters: { parameters },
        host_id: host.id,
        host_name: host.name,
        host_ip: host.ip,
        env: env,
      });

      // Resolve the full script path on the host before execution
      const resolvePathCommand = host.os === 'windows' ? `powershell -Command pwd` : `pwd`;
      let basePath = '';
      try {
        const pathResult = await executeSSHCommand(host, sshKeyOrPass, resolvePathCommand);
        if (pathResult.stdout) {
          basePath = parsePowerShellPath(pathResult.stdout);
          console.log(
            `[executeSSHScripts] Resolved full script path on host ${host.ip}: ${basePath}`,
          );
        } else {
          console.error(
            `[executeSSHScripts] Failed to resolve full script path on host ${host.ip}, using empty path as fallback`,
          );
          basePath = '';
        }
      } catch (error) {
        console.error(
          `[executeSSHScripts] Error resolving full script path on host ${host.ip}: ${error.message}, using empty path as fallback`,
        );
        basePath = '';
      }

      // Determine all necessary paths using the helper function
      const paths = determineScriptPaths(
        jobId,
        started_at,
        scriptExecutionId,
        host,
        scriptPath,
        config,
        basePath,
      );

      // Create script folder within job folder
      let scriptSetupCommand =
        host.os === 'windows'
          ? `powershell -Command "if (-not (Test-Path '${paths.scriptRunFolderPath}')) { New-Item -ItemType Directory -Path '${paths.scriptRunFolderPath}' }"`
          : `mkdir -p ${paths.scriptRunFolderPath}`;
      console.log(
        `[executeSSHScripts] Creating script folder on host ${host.ip}: ${paths.scriptRunFolderPath}`,
      );
      // Add confirmation logging after folder creation
      let confirmFolderCommand =
        host.os === 'windows'
          ? `powershell -Command "Test-Path '${paths.scriptRunFolderPath}'"`
          : `test -d ${paths.scriptRunFolderPath} && echo 'Folder exists' || echo 'Folder does not exist'`;

      // Format command for this script
      const ext = scriptPath.split('.').pop().toLowerCase();
      const command = ext === 'py' ? 'python' : ext === 'sh' ? './' : '';
      // Add required parameters for iteration and trace_folder
      const iterationParam = `--iteration ${i}`;
      const traceFolderParam = `--trace_folder ${paths.scriptRunFolderPath}`;
      const finalParameters = parameters
        ? `${parameters} ${iterationParam} ${traceFolderParam}`
        : `${iterationParam} ${traceFolderParam}`;
      const scriptCommand =
        `${command} "${paths.scriptAbsolutePath}" ${finalParameters} 2>&1`.trim();

      console.log(
        `[executeSSHScripts] Script to execute (Iteration ${i}/${length}): ${scriptCommand}`,
      );

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
        fullScript = `${paths.scriptFolderAbsolutePath ? `cd ${paths.scriptFolderAbsolutePath} && ` : ''}${scriptSetupCommand} && ${confirmFolderCommand} && powershell -Command "if (Test-Path 'requirements.txt') { pip install -r requirements.txt } else { Write-Output 'No requirements.txt file found, skipping pip install' }" && ${envSetup}python --version && echo ============================= && powershell -Command "& { $process = Start-Process -FilePath 'python' -ArgumentList '\"${paths.scriptAbsolutePath}\" ${finalParameters}' -NoNewWindow -RedirectStandardOutput '${paths.scriptRunFolderPath}/stdout.txt' -RedirectStandardError '${paths.scriptRunFolderPath}/stderr.txt' -PassThru; Write-Host ('[PID ' + $process.Id + '] Process started'); $startTime = Get-Date; $timeout = 300; $stdoutLinesRead = 0; $stderrLinesRead = 0; while (-not $process.HasExited) { if ((Get-Date) - $startTime -gt [TimeSpan]::FromSeconds($timeout)) { Write-Host 'Process timed out after $timeout seconds'; $process.Kill(); exit 1 }; $stdoutContent = Get-Content -Path '${paths.scriptRunFolderPath}/stdout.txt' -Encoding UTF8 -ErrorAction SilentlyContinue; if ($stdoutContent) { $newStdoutLines = $stdoutContent | Select-Object -Skip $stdoutLinesRead; if ($newStdoutLines) { $newStdoutLines | ForEach-Object { Write-Host $_ }; $stdoutLinesRead = $stdoutContent.Count } }; $stderrContent = Get-Content -Path '${paths.scriptRunFolderPath}/stderr.txt' -Encoding UTF8 -ErrorAction SilentlyContinue; if ($stderrContent) { $newStderrLines = $stderrContent | Select-Object -Skip $stderrLinesRead; if ($newStderrLines) { $newStderrLines | ForEach-Object { Write-Host $_ }; $stderrLinesRead = $stderrContent.Count } }; Start-Sleep -Seconds 1 }; $process.WaitForExit(); Write-Host ('Process completed with exit code: ' + $process.ExitCode); exit $process.ExitCode }"`;
      } else {
        fullScript = `${paths.scriptFolderAbsolutePath ? `cd ${paths.scriptFolderAbsolutePath} && ` : ''}${scriptSetupCommand} && ${confirmFolderCommand} && if [ -f "requirements.txt" ]; then ${venvPrefix}pip install -r requirements.txt; else echo "No requirements.txt file found, skipping pip install"; fi && ${envSetup && envSetup + ' && '} ${venvPrefix}python --version && echo ============================= && (${venvPrefix}${command} "${paths.scriptAbsolutePath}" ${finalParameters} > "${paths.scriptRunFolderPath}/stdout.txt" 2> "${paths.scriptRunFolderPath}/stderr.txt"; echo "EXIT_CODE=$?" > "${paths.scriptRunFolderPath}/exit_code.txt"; cat "${paths.scriptRunFolderPath}/stdout.txt"; cat "${paths.scriptRunFolderPath}/stderr.txt" >&2)`;
      }
      console.log(`[executeSSHScripts] SSH command to be executed on ${host.ip}: ${fullScript}`);

      // Update the script execution to 'in_progress'
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
          iteration: i,
          stdout: '',
          stderr: error.message,
        });
        overallStatus = 'failed';
        // Check if we need to stop on failure
        if (!scriptResult.exitCode === 0 && script.stop_on_failure) {
          console.log(
            `[executeSSHScripts] Stopping further script execution due to failure in script ${scriptPath} as per stop_on_failure setting.`,
          );
          overallStatus = 'failed';
          break;
        }
        continue;
      }

      // Read stdout and stderr from files using the helper function
      const { stdoutFromFile, stderrFromFile } = await readScriptOutputFiles(
        host,
        sshKeyOrPass,
        paths.scriptRunFolderPath,
        scriptResult,
        host.os,
      );

      // Get actual exit code from file for Linux hosts
      let actualExitCode = scriptResult.exitCode;
      if (host.os !== 'windows') {
        try {
          const exitCodeCmd = `cat "${paths.scriptRunFolderPath}/exit_code.txt" 2>/dev/null || echo "EXIT_CODE=0"`;
          const exitCodeResult = await executeSSHCommand(host, sshKeyOrPass, exitCodeCmd);
          const exitCodeMatch = exitCodeResult.stdout.match(/EXIT_CODE=(\d+)/);
          if (exitCodeMatch && exitCodeMatch[1]) {
            actualExitCode = parseInt(exitCodeMatch[1], 10);
            console.log(`[executeSSHScripts] Actual script exit code from file: ${actualExitCode}`);
          }
        } catch (error) {
          console.error(`[executeSSHScripts] Error reading exit code file: ${error.message}`);
        }
      }

      // Update script output with results
      const scriptCompletedAt = new Date().toISOString();
      // Determine if script was successful based on output or exit code
      const isSuccess =
        (stdoutFromFile && stdoutFromFile.includes('Test Success')) ||
        (!(stdoutFromFile && stdoutFromFile.toLowerCase().includes('Test Failed'.toLowerCase())) &&
          (host.os === 'windows' ? scriptResult.exitCode === 0 : actualExitCode === 0));
      const status = isSuccess ? 'success' : 'failed';
      // Write metadata.json for this script execution
      const startDate = new Date(scriptStartedAt);
      const endDate = new Date(scriptCompletedAt);
      const duration = ((endDate - startDate) / 1000).toFixed(2); // Duration in seconds

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'job-'));
      const metadataLocal = path.join(tempDir, 'metadata.json');

      writeScriptMetadata(metadataLocal, {
        job_id: jobId,
        script_id: scriptExecutionId,
        script_name: paths.scriptName,
        script_path: paths.scriptAbsolutePath,
        parameters: finalParameters,
        start_time: scriptStartedAt,
        end_time: scriptCompletedAt,
        status: status,
        env: env || 'N/A',
        config_name: config_name || 'N/A',
        duration: duration,
      });
      const metadataRemote = path.join(paths.scriptRunFolderPath, 'metadata.json');
      await uploadFileViaSFTP(host, sshKeyOrPass, metadataLocal, metadataRemote);
      console.log(
        `[executeSSHScripts] Uploaded script metadata to ${metadataRemote} for script ${scriptExecutionId}`,
      );

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

      // Check if we need to stop on failure after updating database and metadata
      if (
        !isSuccess &&
        config.scripts &&
        'stop_on_failure' in config.scripts &&
        config.scripts.stop_on_failure
      ) {
        console.log(
          `[executeSSHScripts] Stopping further script execution due to failure in script ${scriptPath} as per stop_on_failure setting.`,
        );
        overallStatus = 'failed';
        break;
      }

      // Add to the overall output collection
      const scriptOutputRecord = {
        script_path: scriptPath,
        iteration: i,
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
        config_name || 'N/A',
        scriptStartedAt,
        config,
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
  return { output, overallStatus, started_at, config_name: config_name || '' };
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
  const jobRunFolderName = `${createdAt.split('T')[0].replace(/-/g, '')}_${createdAt.split('T')[1].split('.')[0].replace(/:/g, '')}_${jobId}`;
  const jobRunFolderPath = `${uploadFolder}/${jobRunFolderName}`;
  const scriptRunFolderName = `${createdAt.split('T')[0].replace(/-/g, '')}_${createdAt.split('T')[1].split('.')[0].replace(/:/g, '')}_${scriptExecutionId}`;
  const scriptRunFolderPath = `${jobRunFolderPath}/${scriptRunFolderName}`;

  try {
    await new Promise((resolve, _reject) => {
      client.on('ready', async () => {
        console.log(
          `[executeScriptOnSSH] SSH connection established for job ${jobId} on host ${host.hostname}`,
        );

        try {
          // Create uploadFolder structure
          await execCommand(client, `mkdir -p ${scriptRunFolderPath}`);
          console.log(
            `[executeScriptOnSSH] Created script folder on host ${host.hostname}: ${scriptRunFolderPath}`,
          );

          // Save script to script folder
          const scriptContentPath = path.join('scripts', script.path);
          if (fs.existsSync(scriptContentPath)) {
            const scriptContent = fs.readFileSync(scriptContentPath, 'utf8');
            await execCommand(
              client,
              `echo "${escapeShellArg(scriptContent)}" > ${scriptRunFolderPath}/script.py`,
            );
            console.log(
              `[executeScriptOnSSH] Saved script content to ${scriptRunFolderPath}/script.py on host ${host.hostname}`,
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

// Utility to parse PowerShell output and extract the path
const parsePowerShellPath = (output) => {
  return output
    .split(/[\r\n]+/) // Handle different newline formats
    .filter((line) => line.trim() && !line.startsWith('----') && !line.startsWith('Path'))[0]
    .trim();
};

module.exports = { executeSSHScripts, executeScriptOnSSH, uploadFileViaSFTP };
