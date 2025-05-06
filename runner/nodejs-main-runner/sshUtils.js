const { Client } = require('ssh2');
const { v4: uuidv4 } = require('uuid');

const {
  createScriptExecution,
  updateScriptExecution,
  updateJobStatus,
  initializeJobOnHost,
  finalizeJobOnHost,
} = require('./jobUtils');
const { pingRepository } = require('./repoUtils');
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

  // Log current jobData state at the start of SSH section
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
          // Not setting a specific scriptFolder, letting SSH use its default directory
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

      const conn = new Client();

      // Create a promise to handle the SSH connection and command execution
      try {
        const scriptResult = await new Promise((resolve, reject) => {
          // Set a timeout for the SSH connection
          const connectionTimeout = setTimeout(() => {
            conn.end();
            reject(new Error('SSH connection timeout'));
          }, 60000); // 60 seconds timeout

          conn.on('ready', () => {
            // Clear the connection timeout
            clearTimeout(connectionTimeout);
            console.log(`[executeSSHScripts] Connected to ${host.ip}`);

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

            // Execute the script
            conn.exec(fullScript, (err, stream) => {
              if (err) {
                conn.end();
                reject(err);
                return;
              }

              let stdout = '';
              let stderr = '';

              stream.on('data', (data) => {
                stdout += data;
                console.log(`${data}`);
              });

              stream.stderr.on('data', (data) => {
                stderr += data;
                console.log(`[executeSSHScripts] Stderr: ${data}`);
              });

              stream.on('close', (code, signal) => {
                console.log(
                  `[executeSSHScripts] SSH command completed with code: ${code}, signal: ${signal}`,
                );

                // Determine if script was successful based on output or exit code
                const isSuccess = (stdout && stdout.includes('Test Success')) || code === 0;

                conn.end();
                resolve({
                  stdout,
                  stderr,
                  exitCode: code,
                  isSuccess,
                });
              });
            });
          });

          conn.on('error', (err) => {
            clearTimeout(connectionTimeout);
            reject(err);
          });

          // Connect to the SSH server
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

          conn.connect(sshConfig);
        });

        // Read stdout and stderr from files
        const stdoutFileCommand =
          host.os === 'windows'
            ? `powershell -Command "Get-Content -Path '${scriptFolderPath}/stdout.txt'"`
            : `cat ${scriptFolderPath}/stdout.txt`;
        const stderrFileCommand =
          host.os === 'windows'
            ? `powershell -Command "Get-Content -Path '${scriptFolderPath}/stderr.txt'"`
            : `cat ${scriptFolderPath}/stderr.txt`;

        const connRead = new Client();
        let stdoutFromFile = '';
        let stderrFromFile = '';
        try {
          await new Promise((resolve, reject) => {
            const connectionTimeout = setTimeout(() => {
              connRead.end();
              reject(new Error('SSH connection timeout for reading output files'));
            }, 60000);

            connRead.on('ready', () => {
              clearTimeout(connectionTimeout);
              console.log(`[executeSSHScripts] Connected to ${host.ip} for reading output files`);
              connRead.exec(stdoutFileCommand, (err, stream) => {
                if (err) {
                  connRead.end();
                  reject(err);
                  return;
                }
                stream.on('data', (data) => {
                  stdoutFromFile += data;
                });
                stream.stderr.on('data', (data) => {
                  console.log(`[executeSSHScripts] Stderr while reading stdout file: ${data}`);
                });
                stream.on('close', () => {
                  connRead.exec(stderrFileCommand, (err, stream2) => {
                    if (err) {
                      connRead.end();
                      reject(err);
                      return;
                    }
                    stream2.on('data', (data) => {
                      stderrFromFile += data;
                    });
                    stream2.stderr.on('data', (data) => {
                      console.log(`[executeSSHScripts] Stderr while reading stderr file: ${data}`);
                    });
                    stream2.on('close', () => {
                      connRead.end();
                      resolve();
                    });
                  });
                });
              });
            });
            connRead.on('error', (err) => {
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
            connRead.connect(sshConfig);
          });
        } catch (error) {
          console.error(
            `[executeSSHScripts] Error reading output files on host ${host.ip}: ${error.message}`,
          );
          stdoutFromFile = scriptResult.stdout;
          stderrFromFile = scriptResult.stderr;
        }

        // Update script output with results
        const scriptCompletedAt = new Date().toISOString();

        // Update script execution in database without report URL (handled by upload_and_report.py)
        await updateScriptExecution(supabase, {
          script_id: scriptExecutionId,
          status: scriptResult.isSuccess ? 'success' : 'failed',
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
        if (!scriptResult.isSuccess) {
          overallStatus = 'failed';
        }
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
          const scriptCommand = `python3 ${scriptFolderPath}/script.py ${script.parameters || ''}`;
          const fullCommand = `${scriptCommand} > ${scriptFolderPath}/stdout.txt 2> ${scriptFolderPath}/stderr.txt`;
          const result = await execCommand(client, fullCommand, 360);

          stdout = await execCommand(client, `cat ${scriptFolderPath}/stdout.txt`);
          stderr = await execCommand(client, `cat ${scriptFolderPath}/stderr.txt`);

          console.log(
            `[executeScriptOnSSH] Script execution completed for job ${jobId} on host ${host.hostname}`,
          );

          if (result.code !== 0) {
            status = 'failed';
            console.error(
              `[executeScriptOnSSH] Script execution failed with exit code ${result.code} for job ${jobId} on host ${host.hostname}`,
            );
          } else {
            status = 'success';
            console.log(
              `[executeScriptOnSSH] Script executed successfully for job ${jobId} on host ${host.hostname}`,
            );
          }

          client.end();
          resolve();
        } catch (error) {
          console.error(
            `[executeScriptOnSSH] Error during SSH execution for job ${jobId} on host ${host.hostname}:`,
            error,
          );
          status = 'failed';
          stderr = error.message;
          client.end();
          reject(error);
        }
      });

      client.on('error', (err) => {
        console.error(
          `[executeScriptOnSSH] SSH connection error for job ${jobId} on host ${host.hostname}:`,
          err,
        );
        status = 'failed';
        stderr = err.message;
        client.end();
        reject(err);
      });

      client.connect({
        host: host.hostname,
        port: host.port || 22,
        username: host.username,
        password: host.password,
      });
    });
  } catch (error) {
    console.error(
      `[executeScriptOnSSH] Error executing script for job ${jobId} on host ${host.hostname}:`,
      error,
    );
    status = 'failed';
    stderr = error.message;
  } finally {
    client.end();
  }

  const endTime = new Date().toISOString();
  await jobUtils.updateScriptExecution(
    scriptExecutionId,
    status,
    createdAt,
    startTime,
    endTime,
    stdout,
    stderr,
  );
  return { status, stdout, stderr };
}

async function finalizeJobOnSSH(jobId, host) {
  console.log(
    `[finalizeJobOnSSH] Finalizing job ${jobId} on host ${host.hostname} for upload and report generation`,
  );
  const client = new SSHClient();

  try {
    await new Promise((resolve, reject) => {
      client.on('ready', async () => {
        console.log(
          `[finalizeJobOnSSH] SSH connection established for finalizing job ${jobId} on host ${host.hostname}`,
        );

        try {
          // Check if upload_and_report.py exists, if not, copy it to the host
          const uploadScriptPath = path.join(os.cwd(), 'upload_and_report.py');
          if (fs.existsSync(uploadScriptPath)) {
            const uploadScriptContent = fs.readFileSync(uploadScriptPath, 'utf8');
            await execCommand(
              client,
              `echo "${escapeShellArg(uploadScriptContent)}" > /tmp/upload_and_report.py`,
            );
            console.log(
              `[finalizeJobOnSSH] Uploaded upload_and_report.py to /tmp on host ${host.hostname}`,
            );
          }

          // Set environment variables for Cloudflare R2
          const envVars = [
            `export CLOUDFLARE_R2_ENDPOINT=${escapeShellArg(process.env.CLOUDFLARE_R2_ENDPOINT || '')}`,
            `export CLOUDFLARE_R2_ACCESS_KEY_ID=${escapeShellArg(process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '')}`,
            `export CLOUDFLARE_R2_SECRET_ACCESS_KEY=${escapeShellArg(process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '')}`,
            `export SUPABASE_URL=${escapeShellArg(process.env.SUPABASE_URL || '')}`,
            `export SUPABASE_SERVICE_ROLE_KEY=${escapeShellArg(process.env.SUPABASE_SERVICE_ROLE_KEY || '')}`,
          ].join('; ');

          // Execute upload_and_report.py
          const command = `${envVars}; cd /tmp; python3 /tmp/upload_and_report.py`;
          const result = await execCommand(client, command);

          console.log(
            `[finalizeJobOnSSH] Upload and report generation command executed for job ${jobId} on host ${host.hostname}`,
          );

          if (result.code === 0) {
            console.log(
              `[finalizeJobOnSSH] Successfully finalized job ${jobId} on host ${host.hostname}`,
            );
            try {
              const outputJson = JSON.parse(result.stdout);
              const reportUrl = outputJson.uploaded_files?.find(
                (file) => file.name === 'report.html',
              )?.public_url;
              if (reportUrl) {
                console.log(`[finalizeJobOnSSH] Job report URL: ${reportUrl}`);
                await updateJobStatus(jobId, 'success', reportUrl);
              }
              resolve(outputJson);
            } catch (e) {
              console.error(
                `[finalizeJobOnSSH] Failed to parse JSON output from upload_and_report.py for job ${jobId} on host ${host.hostname}:`,
                e,
              );
              resolve({ status: 'error', message: 'Failed to parse upload script output' });
            }
          } else {
            console.error(
              `[finalizeJobOnSSH] Failed to execute upload_and_report.py for job ${jobId} on host ${host.hostname}, exit code: ${result.code}`,
            );
            console.error(`[finalizeJobOnSSH] Stderr: ${result.stderr}`);
            resolve({ status: 'error', message: 'Upload script execution failed' });
          }

          client.end();
        } catch (error) {
          console.error(
            `[finalizeJobOnSSH] Error finalizing job ${jobId} on host ${host.hostname}:`,
            error,
          );
          client.end();
          reject(error);
        }
      });

      client.on('error', (err) => {
        console.error(
          `[finalizeJobOnSSH] SSH connection error for job ${jobId} on host ${host.hostname}:`,
          err,
        );
        client.end();
        reject(err);
      });

      client.connect({
        host: host.hostname,
        port: host.port || 22,
        username: host.username,
        password: host.password,
      });
    });
  } catch (error) {
    console.error(
      `[finalizeJobOnSSH] Error finalizing job ${jobId} on host ${host.hostname}:`,
      error,
    );
    throw error;
  } finally {
    client.end();
  }
}

module.exports = { executeSSHScripts, executeScriptOnSSH, finalizeJobOnSSH };
