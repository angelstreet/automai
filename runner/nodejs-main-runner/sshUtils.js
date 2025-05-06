const { Client } = require('ssh2');

const { pingRepository } = require('./repoUtils');
const { generateAndUploadReport } = require('./reportUtils');
const { decrypt } = require('./utils');

async function executeSSHScripts(
  config,
  jobId,
  started_at,
  decryptedEnvVars,
  supabase,
  team_id,
  config_id,
) {
  const hosts = config.hosts;
  let output = { scripts: [], stdout: '', stderr: '' };
  let overallStatus = 'success';

  // Log current jobData state at the start of SSH section
  console.log(
    `[executeSSHScripts] Job data at start of SSH section: team_id=${team_id}, config_id=${config_id}`,
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

    const scripts = (config.scripts || [])
      .map((script) => {
        const ext = script.path.split('.').pop().toLowerCase();
        const command = ext === 'py' ? 'python' : ext === 'sh' ? './' : '';
        return `${command} ${script.path} ${script.parameters || ''} 2>&1`.trim();
      })
      .join(' && ');

    console.log(`[executeSSHScripts] Scripts: ${scripts}`);

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
    let envSetup = '';
    if (Object.keys(decryptedEnvVars).length > 0) {
      envSetup =
        host.os === 'windows'
          ? Object.entries(decryptedEnvVars)
              .map(([key, value]) => `set ${key}=${value}`)
              .join(' && ')
          : Object.entries(decryptedEnvVars)
              .map(([key, value]) => `export ${key}=${value}`)
              .join(' && ');
      envSetup += host.os === 'windows' ? ' && ' : ' && ';
      console.log(
        `[executeSSHScripts] Environment variables setup for SSH: ${Object.keys(decryptedEnvVars).join(', ')}`,
      );
    } else {
      console.log(`[executeSSHScripts] No environment variables to set for SSH host ${host.ip}`);
    }
    const scriptCommand = `${scripts}`;
    let fullScript;
    if (host.os === 'windows') {
      fullScript = `${repoCommands}${repoCommands ? ' && ' : ''}${repoDir ? `cd ${repoDir} && ` : ''} cd ${scriptFolder} && powershell -Command "if (Test-Path 'requirements.txt') { pip install -r requirements.txt } else { Write-Output 'No requirements.txt file found, skipping pip install' }" && ${envSetup}python --version && echo ============================= && ${scriptCommand}`;
    } else {
      fullScript = `${repoCommands} ${repoCommands ? '' : repoDir ? `cd ${repoDir} && ` : ''} cd ${scriptFolder} && if [ -f "requirements.txt" ]; then pip install -r requirements.txt; else echo "No requirements.txt file found, skipping pip install"; fi && ${envSetup}python --version && echo ============================= && ${scriptCommand}`;
    }
    console.log(`[executeSSHScripts] SSH command to be executed on ${host.ip}: ${fullScript}`);

    const conn = new Client();
    conn
      .on('ready', async () => {
        console.log(`[executeSSHScripts] Connected to ${host.ip}`);

        started_at = new Date().toISOString();
        await supabase
          .from('jobs_run')
          .update({
            status: 'in_progress',
            started_at: started_at,
          })
          .eq('id', jobId);

        console.log(`[executeSSHScripts] Updated job ${jobId} status to 'in_progress'`);

        conn.exec(fullScript, async (err, stream) => {
          if (err) {
            console.error(`[executeSSHScripts] Exec error: ${err.message}`);
            await supabase
              .from('jobs_run')
              .update({
                status: 'failed',
                output: {
                  scripts: [{ script_path: 'N/A', iteration: 1, stdout: '', stderr: err.message }],
                },
                completed_at: new Date().toISOString(),
              })
              .eq('id', jobId);
            console.log(
              `[executeSSHScripts] Updated job ${jobId} to failed status due to exec error`,
            );
            conn.end();
            return;
          }

          let scriptOutput = {
            script_path: config.scripts[0]?.path || 'N/A',
            iteration: 1,
            stdout: '',
            stderr: '',
          };
          stream
            .on('data', (data) => {
              scriptOutput.stdout += data;
              console.log(`${data}`);
            })
            .stderr.on('data', (data) => {
              scriptOutput.stderr += data;
              console.log(`[executeSSHScripts] Stderr: ${data}`);
            })
            .on('close', async (code, signal) => {
              console.log(`[executeSSHScripts] Final stdout: ${scriptOutput.stdout}`);
              console.log(`[executeSSHScripts] Final stderr: ${scriptOutput.stderr}`);
              console.log(`[executeSSHScripts] SSH connection closed: ${code}, signal: ${signal}`);

              const completed_at = new Date().toISOString();
              const isSuccess =
                (scriptOutput.stdout && scriptOutput.stdout.includes('Test Success')) || code === 0;

              output.scripts.push(scriptOutput);
              if (!isSuccess) {
                overallStatus = 'failed';
              }

              await supabase
                .from('jobs_run')
                .update({
                  status: isSuccess ? 'success' : 'failed',
                  output: output,
                  completed_at: completed_at,
                })
                .eq('id', jobId);

              console.log(
                `[executeSSHScripts] Updated job ${jobId} to final status: ${isSuccess ? 'success' : 'failed'}`,
              );

              const sshReportUrl = await generateAndUploadReport(
                jobId,
                config_id,
                output,
                started_at,
                started_at,
                completed_at,
                isSuccess ? 'success' : 'failed',
                decryptedEnvVars || {},
              );
              if (sshReportUrl) {
                const { error: sshReportError } = await supabase
                  .from('jobs_run')
                  .update({ report_url: sshReportUrl })
                  .eq('id', jobId);
                if (sshReportError) {
                  console.error(
                    `[executeSSHScripts] Failed to update report URL for SSH job ${jobId}: ${sshReportError.message}`,
                  );
                } else {
                  console.log(
                    `[executeSSHScripts] Updated job ${jobId} with SSH report URL: ${sshReportUrl}`,
                  );
                }
              }

              conn.end();
            });
        });
      })
      .on('error', async (err) => {
        if (err.message.includes('ECONNRESET')) {
          console.error(`[executeSSHScripts] SSH connection closed due to ECONNRESET`);
          const completed_at = new Date().toISOString();
          const isSuccess =
            output.scripts.length > 0 &&
            output.scripts[0].stdout &&
            output.scripts[0].stdout.includes('Test Success');

          await supabase
            .from('jobs_run')
            .update({
              status: isSuccess ? 'success' : 'failed',
              output: output,
              error: 'ECONNRESET',
              completed_at: completed_at,
            })
            .eq('id', jobId);
          console.log(
            `[executeSSHScripts] Updated job ${jobId} to ${isSuccess ? 'success' : 'failed'} status despite ECONNRESET`,
          );
        } else {
          console.error(`[executeSSHScripts] SSH error: ${err.message}`);
          await supabase
            .from('jobs_run')
            .update({
              status: 'failed',
              output: output,
              error: err.message,
              completed_at: new Date().toISOString(),
            })
            .eq('id', jobId);
          console.log(`[executeSSHScripts] Updated job ${jobId} to failed status due to SSH error`);
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

  return { output, overallStatus, started_at };
}

module.exports = { executeSSHScripts };
