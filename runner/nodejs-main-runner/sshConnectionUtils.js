const { Client } = require('ssh2');

/**
 * Establishes an SSH connection and executes a command on the host.
 * @param {Object} host - Host configuration object with ip, port, username, and authType.
 * @param {string} sshKeyOrPass - Decrypted key or password for authentication.
 * @param {string} command - Command to execute on the host.
 * @param {number} timeout - Connection timeout in milliseconds.
 * @returns {Promise<Object>} - Promise resolving to an object with stdout, stderr, and exitCode.
 */
async function executeSSHCommand(host, sshKeyOrPass, command, timeout = 60000) {
  const conn = new Client();
  return new Promise((resolve, reject) => {
    const connectionTimeout = setTimeout(() => {
      conn.end();
      reject(new Error('SSH connection timeout'));
    }, timeout);

    conn.on('ready', () => {
      clearTimeout(connectionTimeout);
      console.log(`[executeSSHCommand] Connected to ${host.ip}`);
      conn.exec(command, (err, stream) => {
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
          console.log(`[executeSSHCommand] Stderr: ${data}`);
        });
        stream.on('close', (code, signal) => {
          console.log(
            `[executeSSHCommand] Command completed with code: ${code}, signal: ${signal}`,
          );
          conn.end();
          resolve({ stdout, stderr, exitCode: code });
        });
      });
    });

    conn.on('error', (err) => {
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
    conn.connect(sshConfig);
  });
}

/**
 * Reads script output files (stdout and stderr) from the host.
 * @param {Object} host - Host configuration object.
 * @param {string} sshKeyOrPass - Decrypted key or password for authentication.
 * @param {string} scriptFolderPath - Path to the script folder on the host.
 * @param {Object} scriptResult - Initial script execution result for fallback.
 * @param {string} os - Operating system type of the host.
 * @returns {Promise<Object>} - Promise resolving to an object with stdout and stderr from files.
 */
async function readScriptOutputFiles(host, sshKeyOrPass, scriptFolderPath, scriptResult, os) {
  const stdoutFileCommand =
    os === 'windows'
      ? `powershell -Command "Get-Content -Path '${scriptFolderPath}/stdout.txt'"`
      : `cat ${scriptFolderPath}/stdout.txt`;
  const stderrFileCommand =
    os === 'windows'
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
        console.log(`[readScriptOutputFiles] Connected to ${host.ip} for reading output files`);
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
            console.log(`[readScriptOutputFiles] Stderr while reading stdout file: ${data}`);
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
                console.log(`[readScriptOutputFiles] Stderr while reading stderr file: ${data}`);
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
      `[readScriptOutputFiles] Error reading output files on host ${host.ip}: ${error.message}`,
    );
    stdoutFromFile = scriptResult.stdout;
    stderrFromFile = scriptResult.stderr;
  }
  console.log(
    `[readScriptOutputFiles] stdoutFromFile: ${stdoutFromFile}`,
    `stderrFromFile: ${stderrFromFile}`,
  );
  return { stdoutFromFile, stderrFromFile };
}

module.exports = { executeSSHCommand, readScriptOutputFiles };
