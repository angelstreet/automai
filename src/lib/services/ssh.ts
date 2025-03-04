/* eslint-disable */
import { Client } from 'ssh2';
import { WebSocket } from 'ws';
import { logger } from '../logger';
import { prisma } from '../prisma';

// Define WebSocketConnection type
export type WebSocketConnection = WebSocket & {
  isAlive?: boolean;
  authTimeout?: NodeJS.Timeout;
};

// Add a type definition for the connection object
interface Connection {
  id: string;
  ssh_host: string;
  ssh_port: number;
  ssh_username: string;
  ssh_password: string | null;
  ssh_privateKey: string | null;
  userId: string;
  tenantId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  // Make these required as they're used throughout the code
  type: string;
  ip: string;
}

// Add SSH error interface
interface SSHError extends Error {
  code?: string;
  level?: string;
}

/**
 * Handle SSH connection for a WebSocket client
 */
export async function handleSshConnection(
  clientSocket: WebSocketConnection,
  connectionId: string,
  authData?:
    | {
        ssh_username?: string;
        ssh_password?: string;
        ssh_host?: string;
        ssh_port?: number;
        is_windows?: boolean;
      }
    | { username?: string; password?: string; host?: string; port?: number; is_windows?: boolean },
) {
  let isConnecting = true;
  let sshClient: Client | null = null;
  let attemptingWindowsFallback = false;

  // For backward compatibility, check both prefixed and non-prefixed parameters
  const ssh_username = (authData as any)?.ssh_username || (authData as any)?.username;
  const ssh_password = (authData as any)?.ssh_password || (authData as any)?.password;
  const ssh_host = (authData as any)?.ssh_host || (authData as any)?.host;
  const ssh_port = (authData as any)?.ssh_port || (authData as any)?.port;
  let is_windows = (authData as any)?.is_windows || false;

  // If we have a host IP, try to get the is_windows flag from the database
  if (ssh_host && !is_windows) {
    try {
      console.log(`[Windows Detection] Checking database for ${ssh_host} Windows status`);
      
      // Try to find the host record with a client-side selection to avoid errors on missing fields
      try {
        const host = await prisma.host.findFirst({
          where: { 
            ip: ssh_host,
            type: 'ssh'
          },
          select: {
            id: true,
            name: true,
            ip: true,
            // Other fields but not is_windows
          }
        });
        
        if (host) {
          console.log(`[Windows Detection] Found host in database: ${host.id}, but is_windows field might not exist yet`);
          // We can't check is_windows here since the field might not exist in the database yet
        } else {
          console.log(`[Windows Detection] No host found in database for ${ssh_host}`);
        }
      } catch (e: unknown) {
        console.log(`[Windows Detection] Error when querying for host: ${e instanceof Error ? e.message : String(e)}`);
      }
    } catch (e) {
      // Ignore database errors, just proceed with the connection
      console.error(`[Windows Detection] ❌ Database error checking Windows status for ${ssh_host}`, e);
      logger.warn('Failed to check host Windows status in database', { 
        connectionId, 
        ssh_host, 
        error: e instanceof Error ? e.message : String(e) 
      });
    }
  } else if (is_windows) {
    console.log(`[Windows Detection] 🪟 Using Windows mode from explicit flag for ${ssh_host}`);
  }

  // Function to attempt SSH connection with specified mode
  const attemptConnection = (useWindowsMode: boolean) => {
    is_windows = useWindowsMode;
    attemptingWindowsFallback = useWindowsMode && !(authData as any)?.is_windows;

    logger.info('Attempting SSH connection', {
      connectionId,
      ssh_username: ssh_username,
      ssh_password: ssh_password ? '[REDACTED]' : 'none',
      ssh_host: ssh_host,
      ssh_port: ssh_port || 22,
      is_windows: is_windows,
      isRetry: attemptingWindowsFallback,
    });

    if (attemptingWindowsFallback) {
      try {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(
            JSON.stringify({
              status: 'retry',
              message: 'Linux connection failed, trying Windows mode...',
              details: { is_windows: true },
            }),
          );
        }
      } catch (e) {
        logger.error(
          `Failed to send retry message: ${e instanceof Error ? e.message : String(e)}`,
          { connectionId },
        );
      }
    }

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
            logger.info('Detected Windows SSH server from banner', { connectionId, message });
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
            logger.info(`SSH DETAIL [${connectionId}]:`, {
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
            'ssh-dss',
            'ecdsa-sha2-nistp256',
            'ecdsa-sha2-nistp384',
            'ecdsa-sha2-nistp521',
          ],
          hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1'],
        },
      };

      // Add Windows/WSL-specific options if needed
      if (is_windows) {
        logger.info('Using Windows-specific SSH options', { connectionId, ssh_host });
        connectionOptions.pty = true; // Force PTY allocation
        connectionOptions.agentForward = false;
      }

      // Connect with appropriate options
      if (sshClient) {
        sshClient.connect(connectionOptions);
      }

      // Set a connection timeout to detect and handle hanging connections
      const connectTimeout = setTimeout(() => {
        if (isConnecting && sshClient) {
          if (!attemptingWindowsFallback && !is_windows) {
            // If normal mode timed out, try Windows mode
            logger.info('Linux connection timed out, trying Windows mode', { connectionId });
            attemptConnection(true);
          } else {
            // If this is already a Windows attempt or explicit Windows mode, give up
            logger.error('SSH connection timed out', { connectionId });

            try {
              if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(
                  JSON.stringify({
                    error: `SSH connection timed out after 25 seconds`,
                    errorType: 'SSH_CONNECTION_TIMEOUT',
                    details: {
                      ssh_host: ssh_host,
                      ssh_port: ssh_port || 22,
                      is_windows: is_windows,
                    },
                  }),
                );
              }
            } catch (e) {
              logger.error(
                `Error sending timeout error to WebSocket: ${e instanceof Error ? e.message : String(e)}`,
                { connectionId },
              );
            }

            if (sshClient) {
              sshClient.end();
            }
          }
        }
      }, 25000);

      // Clear timeout when connect is called
      if (sshClient) {
        sshClient.once('ready', () => {
          clearTimeout(connectTimeout);
        });

        sshClient.once('error', (err) => {
          clearTimeout(connectTimeout);

          // If this was a normal mode attempt and certain errors occurred, try Windows mode
          if (!attemptingWindowsFallback && !is_windows) {
            // Key errors that might indicate we should try Windows mode
            const shouldTryWindows =
              err.level === 'authentication' ||
              err.message?.includes('Authentication failed') ||
              err.message?.includes('All configured authentication methods failed') ||
              (err as SSHError).code === 'ECONNRESET';

            if (shouldTryWindows) {
              logger.info('Linux connection failed, trying Windows mode', {
                connectionId,
                error: err.message,
                code: (err as SSHError).code,
                level: err.level,
              });
              attemptConnection(true);
              return;
            }
          }

          // Otherwise, handle the error normally
          handleSshError(err);
        });
      }
    } catch (e) {
      handleConnectionError(e);
    }
  };

  // Function to setup all SSH client event handlers
  const setupSshClientEvents = () => {
    if (!sshClient) return;

    sshClient.on('banner', (message: string) => {
      logger.info('SSH banner received', { connectionId, message });
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
        logger.error(
          `Error sending banner to WebSocket: ${e instanceof Error ? e.message : String(e)}`,
          { connectionId },
        );
      }
    });

    sshClient.on('ready', () => {
      isConnecting = false;
      logger.info('SSH connection ready', {
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
        logger.error(
          `Failed to send connection success message: ${e instanceof Error ? e.message : String(e)}`,
          { connectionId },
        );
        return;
      }

      // For Windows hosts, try to use exec with cmd.exe directly
      if (is_windows && sshClient) {
        logger.info('Using Windows-specific exec method', { connectionId });
        tryWindowsConnection(0);
      } else {
        // For normal SSH, use regular shell
        createShellSession();
      }
    });

    sshClient.on('error', (err: SSHError) => {
      handleSshError(err);
    });

    // Add handshake event handler if available
    sshClient.on('handshake', (negotiated: any) => {
      logger.info('SSH handshake completed', {
        connectionId,
        kex: negotiated?.kex,
        serverHostKey: negotiated?.serverHostKey,
        cs: negotiated?.cs,
        sc: negotiated?.sc,
      });
      console.log(`SSH HANDSHAKE [${connectionId}]:`, negotiated);
    });
  };

  // Add this function to try different Windows connection methods
  const tryWindowsConnection = (retryCount = 0) => {
    if (!sshClient) return;

    const methods = [
      { cmd: 'cmd.exe', opts: { pty: true, term: 'xterm-256color' } },
      { cmd: 'cmd.exe /k "cd %USERPROFILE%"', opts: { pty: true, term: 'xterm-256color' } },
      { cmd: 'powershell.exe', opts: { pty: true, term: 'xterm-256color' } },
      { cmd: null, opts: { pty: true, term: 'xterm-256color' } } // Regular shell as last resort
    ];

    if (retryCount >= methods.length) {
      logger.error('All Windows connection methods failed', { connectionId });
      return;
    }

    const method = methods[retryCount];
    
    if (method.cmd) {
      logger.info(`Trying Windows connection method ${retryCount}: ${method.cmd}`, { connectionId });
      sshClient.exec(method.cmd, method.opts, (err, stream) => {
        if (err) {
          logger.warn(`Windows connection method ${retryCount} failed: ${err.message}`, { connectionId });
          tryWindowsConnection(retryCount + 1);
        } else {
          setupStream(stream);
        }
      });
    } else {
      createShellSession(); // Fall back to regular shell
    }
  };

  // Error handler for SSH client errors
  const handleSshError = (err: SSHError) => {
    // Skip error handling if we're already attempting fallback
    if (attemptingWindowsFallback) return;

    const errorInfo = {
      error: err.message,
      code: err.code,
      level: err.level,
      connectionId,
      ssh_host: ssh_host,
      ssh_port: ssh_port || 22,
      is_windows: is_windows,
    };

    logger.error('SSH connection error', errorInfo);
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
      logger.error(
        `Error sending error to WebSocket: ${e instanceof Error ? e.message : String(e)}`,
        { connectionId },
      );
    }
  };

  // Error handler for connection attempt errors
  const handleConnectionError = (e: unknown) => {
    // Skip error handling if we're already attempting fallback
    if (attemptingWindowsFallback) return;

    logger.error(`Error connecting to SSH server: ${e instanceof Error ? e.message : String(e)}`, {
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
      logger.error(
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
        logger.error(`SSH shell error: ${err.message}`, { connectionId, ssh_host });
        try {
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(
              JSON.stringify({
                error: `SSH shell error: ${err.message}`,
                errorType: 'SSH_SHELLerror',
                details: { ssh_host, ssh_port: ssh_port || 22, is_windows: is_windows },
              }),
            );
          }
        } catch (e) {
          logger.error(
            `Failed to send shell error message: ${e instanceof Error ? e.message : String(e)}`,
            { connectionId },
          );
        }
        return;
      }

      setupStream(stream);

      // If this is a Windows connection using shell, send cmd.exe command explicitly
      if (is_windows) {
        // Small delay to ensure the shell is ready
        setTimeout(() => {
          if (stream && !stream.destroyed) {
            logger.info('Launching Windows cmd.exe via shell', { connectionId });
            stream.write('cmd.exe\r\n');
          }
        }, 500);
      }
    });
  }

  // Common stream setup function to avoid code duplication
  function setupStream(stream: any) {
    stream.on('data', (data: Buffer) => {
      try {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(data);
        } else {
          logger.warn('Cannot send data, WebSocket is not open', { connectionId });
        }
      } catch (e) {
        logger.error(
          `Error sending data to WebSocket: ${e instanceof Error ? e.message : String(e)}`,
          { connectionId },
        );
      }
    });

    clientSocket.on('message', (message) => {
      try {
        // Only process messages if we have a stream
        if (!stream || stream.destroyed) {
          logger.warn('Cannot process message, SSH stream is closed', { connectionId });
          return;
        }

        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'disconnect') {
            logger.info('Client requested disconnect', { connectionId });
            if (sshClient) {
              sshClient.end();
            }
            clientSocket.close();
            return;
          }
          // If it's a JSON message but not a disconnect, fall through to handle as data
        } catch (e) {
          // Not a JSON message, ignore (probably terminal data)
        }

        // Handle terminal data (keystrokes, etc.)
        if (stream && !stream.destroyed) {
          stream.write(message);
        }
      } catch (e) {
        logger.error(
          `Error processing WebSocket message: ${e instanceof Error ? e.message : String(e)}`,
          { connectionId },
        );
      }
    });

    stream.on('close', () => {
      logger.info('SSH stream closed', { connectionId });
      // Don't close the WebSocket, let the client handle disconnection
    });
  }

  // Set up WebSocket close handler first
  clientSocket.on('close', () => {
    logger.info('WebSocket closed by client', { connectionId, isConnecting });
    if (sshClient) {
      try {
        logger.info('Ending SSH client due to WebSocket closure', { connectionId });
        sshClient.end();
      } catch (e) {
        logger.error(`Error ending SSH client: ${e instanceof Error ? e.message : String(e)}`, {
          connectionId,
        });
      }
    }
  });

  logger.info('Establishing SSH connection', { connectionId });
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

    logger.error('Missing SSH credentials', { connectionId, missingFields });

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
      logger.error(`Failed to send error message: ${e instanceof Error ? e.message : String(e)}`, {
        connectionId,
      });
    }
    return;
  }

  // Start connection process - first with default mode (Linux or explicit Windows)
  // Will automatically try Windows mode as fallback if needed
  attemptConnection(is_windows);
}
