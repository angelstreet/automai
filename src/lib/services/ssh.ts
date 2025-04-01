/* eslint-disable */
import { Client } from 'ssh2';
import { WebSocket } from 'ws';
import { logger } from '../logger';
import {  WebSocketConnection, SSHAuthData, SSHError  } from '@/types/component/sshComponentType';

/**
 * Handle SSH connection for a WebSocket client
 */
export async function handleSshConnection(
  clientSocket: WebSocketConnection,
  connectionId: string,
  authData?: SSHAuthData,
) {
  console.info('Starting SSH connection handler', { connectionId });

  // Declare variables at the top to fix linter errors
  let stream: any = null;
  let sshClient: Client | null = null;

  // For backward compatibility, check both prefixed and non-prefixed parameters
  const ssh_username = (authData as any)?.ssh_username || (authData as any)?.username;
  const ssh_password = (authData as any)?.ssh_password || (authData as any)?.password;
  const ssh_host = (authData as any)?.ssh_host || (authData as any)?.host;
  const ssh_port = (authData as any)?.ssh_port || (authData as any)?.port;
  let is_windows = (authData as any)?.is_windows || false;

  // If we have a host IP and Windows flag is explicitly set, log it
  if (is_windows) {
    console.log(`[Windows Detection] 🪟 Using Windows mode from explicit flag for ${ssh_host}`);
  }

  // Function to attempt SSH connection with specified mode
  const attemptConnection = (useWindowsMode: boolean) => {
    is_windows = useWindowsMode;

    // Store Windows value on the client socket for reference in client messages
    (clientSocket as any).is_windows = is_windows;

    console.info('Attempting SSH connection', {
      connectionId,
      ssh_username: ssh_username,
      ssh_password: ssh_password ? '[REDACTED]' : 'none',
      ssh_host: ssh_host,
      ssh_port: ssh_port || 22,
      is_windows: is_windows,
    });

    try {
      // Create new SSH client for retry
      if (sshClient) {
        try {
          sshClient.end();
        } catch (e) {
          // Ignore errors ending previous client
        }
      }

      sshClient = new Client();
      setupSshClientEvents();

      // Connection options with improved algorithm support for different SSH server types
      const connectionOptions: any = {
        host: ssh_host,
        port: ssh_port || 22,
        username: ssh_username,
        password: ssh_password,
        forceIPv4: true, // Force IPv4 to avoid IPv6 issues
        debug: (message: string) => {
          console.log(`SSH DEBUG [${connectionId}]:`, message);
          if (message.includes('Remote ident') && message.includes('Windows')) {
            console.info('Detected Windows SSH server from banner', { connectionId, message });
          }
          if (
            message.includes('KEX') ||
            message.includes('AUTH') ||
            message.includes('USERAUTH') ||
            message.includes('handshake') ||
            message.includes('timeout') ||
            message.includes('error') ||
            message.includes('close')
          ) {
            console.info(`SSH DETAIL [${connectionId}]:`, {
              message,
              ssh_host,
              ssh_port: ssh_port || 22,
            });
          }
        },
        readyTimeout: 25000, // 25 seconds timeout for slow networks
        keepaliveInterval: 30000,
        // Support a wide range of algorithms for compatibility with different SSH servers
        algorithms: {
          kex: [
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group16-sha512',
            'diffie-hellman-group18-sha512',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group1-sha1',
          ],
          cipher: [
            'aes128-ctr',
            'aes192-ctr',
            'aes256-ctr',
            'aes128-gcm',
            'aes256-gcm',
            'aes128-cbc',
            '3des-cbc',
          ],
          serverHostKey: [
            'ssh-rsa',
            'ecdsa-sha2-nistp256',
            'ecdsa-sha2-nistp384',
            'ecdsa-sha2-nistp521',
            'ssh-ed25519',
          ],
          hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1'],
        },
      };

      // Connect to SSH server
      sshClient.connect(connectionOptions);
    } catch (e) {
      handleConnectionError(e);
    }
  };

  // Function to setup all SSH client event handlers
  const setupSshClientEvents = () => {
    if (!sshClient) return;

    sshClient.on('banner', (message: string) => {
      console.info('SSH banner received', { connectionId, message });
      console.log(`SSH BANNER [${connectionId}]:`, message);

      // Send banner to client for visibility
      try {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(
            JSON.stringify({
              type: 'banner',
              message: message,
            }),
          );
        }
      } catch (e) {
        console.error(
          `Error sending banner to WebSocket: ${e instanceof Error ? e.message : String(e)}`,
          { connectionId },
        );
      }
    });

    sshClient.on('ready', () => {
      console.info('SSH connection ready', {
        connectionId,
        ssh_host,
        ssh_port: ssh_port || 22,
        is_windows: is_windows,
      });

      try {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(
            JSON.stringify({
              status: 'connected',
              message: 'SSH connection established successfully',
              details: { is_windows: is_windows },
            }),
          );
        }
      } catch (e) {
        console.error(
          `Failed to send connection success message: ${e instanceof Error ? e.message : String(e)}`,
          { connectionId },
        );
      }

      // Create shell session based on whether it's Windows or not
      if (is_windows) {
        tryWindowsConnection(0);
      } else {
        createShellSession();
      }
    });

    sshClient.on('error', handleSshError);
  };

  // Add this function to try different Windows connection methods
  const tryWindowsConnection = (retryCount = 0) => {
    if (!sshClient) return;

    const methods = [
      { cmd: 'cmd.exe', opts: { pty: true, term: 'xterm-256color' } },
      { cmd: 'cmd.exe /k "cd %USERPROFILE%"', opts: { pty: true, term: 'xterm-256color' } },
      { cmd: 'powershell.exe', opts: { pty: true, term: 'xterm-256color' } },
      { cmd: null, opts: { pty: true, term: 'xterm-256color' } },
    ];

    if (retryCount >= methods.length) {
      console.error('All Windows connection methods failed', { connectionId });
      if (sshClient) sshClient.end(); // Ensure cleanup
      return;
    }

    const method = methods[retryCount];
    if (method.cmd) {
      console.info(`Trying Windows connection method ${retryCount}: ${method.cmd}`, {
        connectionId,
      });
      sshClient.exec(method.cmd, method.opts, (err, stream) => {
        if (err) {
          console.warn(`Method ${retryCount} failed: ${err.message}`, {
            connectionId,
            errorDetails: err,
          });
          tryWindowsConnection(retryCount + 1);
        } else {
          console.info(`Connected via ${method.cmd}`, { connectionId });
          setupStream(stream);
        }
      });
    } else {
      console.info('Falling back to regular shell', { connectionId });
      createShellSession();
    }
  };

  // Error handler for SSH client errors
  const handleSshError = (err: SSHError) => {
    const errorInfo = {
      error: err.message,
      code: err.code,
      level: err.level,
      connectionId,
      ssh_host: ssh_host,
      ssh_port: ssh_port || 22,
      is_windows: is_windows,
    };

    console.error('SSH connection error', errorInfo);
    console.error(`SSH connection error for ${connectionId}:`, err);

    try {
      const errorType =
        err.code === 'ECONNREFUSED'
          ? 'SSH_CONNECTION_REFUSED'
          : err.code === 'ECONNRESET'
            ? 'SSH_CONNECTION_RESET'
            : err.level === 'authentication'
              ? 'SSH_AUTHerror'
              : err.level === 'client-timeout'
                ? 'SSH_HANDSHAKE_TIMEOUT'
                : 'SSH_CONNECTIONerror';

      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            error: `SSH connection error: ${err.message}`,
            errorType: errorType,
            details: {
              code: err.code,
              level: err.level,
              ssh_host: ssh_host,
              ssh_port: ssh_port || 22,
              is_windows: is_windows,
            },
          }),
        );
      }
    } catch (e) {
      console.error(
        `Error sending error to WebSocket: ${e instanceof Error ? e.message : String(e)}`,
        { connectionId },
      );
    }
  };

  // Error handler for connection attempt errors
  const handleConnectionError = (e: unknown) => {
    console.error(`Error connecting to SSH server: ${e instanceof Error ? e.message : String(e)}`, {
      connectionId,
      ssh_host: ssh_host,
      ssh_port: ssh_port || 22,
      is_windows: is_windows,
    });

    try {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            error: `SSH connection attempt error: ${e instanceof Error ? e.message : String(e)}`,
            errorType: 'SSH_CONNECTION_ATTEMPTerror',
            details: {
              ssh_host: ssh_host,
              ssh_port: ssh_port || 22,
              is_windows: is_windows,
            },
          }),
        );
      }
    } catch (sendErr) {
      console.error(
        `Error sending connection error to WebSocket: ${sendErr instanceof Error ? sendErr.message : String(sendErr)}`,
        { connectionId },
      );
    }
  };

  // Function to create a shell session (normal SSH or fallback for Windows)
  function createShellSession() {
    if (!sshClient) return;

    const shellOptions: any = {};

    // Even in shell mode, use pty for Windows
    if (is_windows) {
      shellOptions.pty = true;
      shellOptions.term = 'xterm-256color';
    }

    sshClient.shell(shellOptions, (err, stream) => {
      if (err) {
        console.error(`SSH shell error: ${err.message}`, { connectionId });
        try {
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(
              JSON.stringify({
                error: `SSH shell error: ${err.message}`,
                errorType: 'SSH_SHELLerror',
              }),
            );
          }
        } catch (e) {
          console.error(
            `Error sending shell error to WebSocket: ${e instanceof Error ? e.message : String(e)}`,
            { connectionId },
          );
        }
        return;
      }

      setupStream(stream);
    });
  }

  function setupStream(stream: any) {
    // Pipe data from SSH to WebSocket
    stream.on('data', (data: Buffer) => {
      try {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(data);
        }
      } catch (e) {
        console.error(
          `Error sending data to WebSocket: ${e instanceof Error ? e.message : String(e)}`,
          { connectionId },
        );
      }
    });

    // Handle WebSocket messages
    clientSocket.on('message', (message: any) => {
      try {
        // Try parsing as JSON for commands
        const data = JSON.parse(message.toString());
        if (data.type === 'resize') {
          stream.setWindow(data.rows, data.cols, 0, 0);
        }
      } catch (e) {
        // Not JSON, treat as terminal input
        try {
          stream.write(message);
        } catch (err) {
          console.error(
            `Error writing to SSH stream: ${err instanceof Error ? err.message : String(err)}`,
            { connectionId },
          );
        }
      }
    });

    stream.on('close', () => {
      console.info('SSH stream closed', { connectionId });
      // Don't close the WebSocket, let the client handle disconnection
    });
  }

  // Set up WebSocket close handler first
  clientSocket.on('close', (code, reason) => {
    console.info('WebSocket closed', { connectionId, code, reason: reason.toString() });

    // Clean up stream
    if (stream) {
      console.debug('Destroying SSH stream', { connectionId });
      stream.destroy(); // No try-catch; let it fail silently if it must
    }

    // Clean up SSH client
    if (sshClient) {
      console.info('Ending SSH client due to WebSocket closure', { connectionId });
      sshClient.end(); // Synchronous, no callback needed for simplicity
      console.debug('SSH client ended', { connectionId });
    }
  });

  console.info('Establishing SSH connection', { connectionId });
  console.log('DEBUG: handleSshConnection called with connectionId:', connectionId);

  // Log connection details for troubleshooting but sanitize password
  console.log(
    'DEBUG: authData:',
    JSON.stringify({
      ssh_username: ssh_username,
      ssh_password: ssh_password ? '[REDACTED]' : 'none',
      ssh_host: ssh_host,
      ssh_port: ssh_port || 22,
      raw_keys: Object.keys(authData || {}).join(', '),
      is_windows: is_windows,
    }),
  );

  if (clientSocket.authTimeout) {
    clearTimeout(clientSocket.authTimeout);
    delete clientSocket.authTimeout;
  }

  if (!ssh_host || !ssh_username) {
    const missingFields = [];
    if (!ssh_host) missingFields.push('ssh_host');
    if (!ssh_username) missingFields.push('ssh_username');

    console.error('Missing SSH credentials', { connectionId, missingFields });

    try {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            error: `Missing SSH credentials: ${missingFields.join(', ')}`,
            errorType: 'MISSING_CREDENTIALS',
            details: { missingFields },
          }),
        );
      }
    } catch (e) {
      console.error(`Failed to send error message: ${e instanceof Error ? e.message : String(e)}`, {
        connectionId,
      });
    }
    return;
  }

  // Start connection process with the detected Windows mode from test-connection
  attemptConnection(is_windows);
}
