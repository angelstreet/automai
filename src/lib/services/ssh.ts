/* eslint-disable */
import { Client } from 'ssh2';
import { WebSocket } from 'ws';
import { logger } from '../logger';

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
  authData?: { ssh_username?: string; ssh_password?: string; ssh_host?: string; ssh_port?: number; is_windows?: boolean } | 
             { username?: string; password?: string; host?: string; port?: number; is_windows?: boolean },
) {
  let isConnecting = true;
  let sshClient: Client | null = null;
  let attemptingWindowsFallback = false;

  // Send initial connecting status to keep client informed
  try {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(
        JSON.stringify({
          status: 'connecting',
          message: 'Establishing SSH connection...',
        }),
      );
    }
  } catch (e) {
    logger.error(`Failed to send connecting message: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
  }

  // For backward compatibility, check both prefixed and non-prefixed parameters
  const ssh_username = (authData as any)?.ssh_username || (authData as any)?.username;
  const ssh_password = (authData as any)?.ssh_password || (authData as any)?.password;
  const ssh_host = (authData as any)?.ssh_host || (authData as any)?.host;
  const ssh_port = (authData as any)?.ssh_port || (authData as any)?.port;
  let is_windows = (authData as any)?.is_windows || false;

  // Function to attempt SSH connection with specified mode
  const attemptConnection = (useWindowsMode: boolean) => {
    is_windows = useWindowsMode;
    attemptingWindowsFallback = useWindowsMode && !((authData as any)?.is_windows);
    
    logger.info('Attempting SSH connection', {
      connectionId,
      ssh_username: ssh_username,
      ssh_password: ssh_password ? '[REDACTED]' : 'none',
      ssh_host: ssh_host,
      ssh_port: ssh_port || 22,
      is_windows: is_windows,
      isRetry: attemptingWindowsFallback
    });
    
    if (attemptingWindowsFallback) {
      try {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(
            JSON.stringify({
              status: 'retry',
              message: 'Linux connection failed, trying Windows mode...',
              details: { is_windows: true }
            }),
          );
        }
      } catch (e) {
        logger.error(`Failed to send retry message: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
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
        forceIPv4: true,  // Force IPv4 to avoid IPv6 issues
        debug: (message: string) => {
          // Enhanced debug logging to capture more connection details
          if (message.includes('KEX') || message.includes('AUTH') || message.includes('USERAUTH') || 
              message.includes('handshake') || message.includes('timeout') || 
              message.includes('error') || message.includes('close') || message.includes('DISCONNECT')) {
            logger.info(`SSH DETAIL [${connectionId}]:`, { message, ssh_host, ssh_port: ssh_port || 22 });
            console.log(`SSH DEBUG [${connectionId}]:`, message);
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
            'diffie-hellman-group1-sha1'
          ],
          cipher: [
            'aes128-ctr',
            'aes192-ctr', 
            'aes256-ctr',
            'aes128-gcm',
            'aes256-gcm',
            'aes128-cbc',
            '3des-cbc'
          ],
          serverHostKey: [
            'ssh-rsa',
            'ssh-dss',
            'ecdsa-sha2-nistp256',
            'ecdsa-sha2-nistp384',
            'ecdsa-sha2-nistp521'
          ],
          hmac: [
            'hmac-sha2-256',
            'hmac-sha2-512',
            'hmac-sha1'
          ]
        }
      };
      
      // Add Windows/WSL-specific options if needed
      if (is_windows) {
        logger.info('Using Windows-specific SSH options', { connectionId, ssh_host });
        connectionOptions.pty = true;  // Force PTY allocation
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
                      is_windows: is_windows
                    }
                  }),
                );
              }
            } catch (e) {
              logger.error(`Error sending timeout error to WebSocket: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
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
                level: err.level
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

    sshClient.on('ready', () => {
      isConnecting = false;
      logger.info('SSH connection ready', { connectionId, ssh_host, ssh_port: ssh_port || 22, is_windows });

      try {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(
            JSON.stringify({
              status: 'connected',
              message: 'SSH connection established successfully',
              details: { is_windows }
            }),
          );
        }
      } catch (e) {
        logger.error(`Failed to send connection success message: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
        return;
      }

      // For Windows hosts, try to use exec with cmd.exe directly
      if (is_windows && sshClient) {
        logger.info('Using Windows-specific exec method', { connectionId });
        
        sshClient.exec('cmd.exe', { pty: true }, (err, stream) => {
          if (err) {
            logger.error(`Windows exec error: ${err.message}`, { connectionId });
            // Fall back to shell if exec fails
            createShellSession();
          } else {
            setupStream(stream);
          }
        });
      } else {
        // For normal SSH, use regular shell
        createShellSession();
      }
    });

    sshClient.on('error', handleSshError);

    // Add banner event handler to capture connection information
    sshClient.on('banner', (message: string) => {
      logger.info('SSH banner received', { connectionId, message });
      console.log(`SSH BANNER [${connectionId}]:`, message);
      
      // Send banner to client for visibility
      try {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({
            type: 'banner',
            message: message
          }));
        }
      } catch (e) {
        logger.error(`Error sending banner to WebSocket: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
      }
    });
    
    // Add handshake event handler to capture connection details
    sshClient.on('handshake', (negotiated: any) => {
      logger.info('SSH handshake completed', { 
        connectionId, 
        kex: negotiated?.kex,
        serverHostKey: negotiated?.serverHostKey,
        cs: negotiated?.cs,
        sc: negotiated?.sc
      });
      console.log(`SSH HANDSHAKE [${connectionId}]:`, negotiated);
    });
  };
  
  // Handle SSH errors
  const handleSshError = (err: SSHError) => {
    logger.error('SSH connection error', { 
      error: err.message, 
      code: err.code, 
      level: err.level,
      connectionId 
    });
    
    // Determine error type for better client feedback
    let errorType = 'SSH_CONNECTION_ERROR';
    
    if (err.level === 'authentication') {
      errorType = 'SSH_AUTH_ERROR';
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      errorType = 'SSH_NETWORK_ERROR';
    } else if (err.message?.includes('handshake')) {
      errorType = 'SSH_HANDSHAKE_ERROR';
    } else if (err.message?.includes('timeout')) {
      errorType = 'SSH_HANDSHAKE_TIMEOUT';
    }
    
    try {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            error: `SSH connection error: ${err.message}`,
            errorType: errorType,
            details: {
              ssh_host: ssh_host,
              ssh_port: ssh_port || 22,
              is_windows: is_windows
            }
          }),
        );
      }
    } catch (e) {
      logger.error(`Error sending SSH error to WebSocket: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
    }
    
    // End SSH client if it exists
    if (sshClient) {
      try {
        sshClient.end();
      } catch (e) {
        logger.error(`Error ending SSH client: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
      }
    }
  };
  
  // Handle connection errors
  const handleConnectionError = (e: unknown) => {
    const errorMessage = e instanceof Error ? e.message : String(e);
    logger.error(`Error in SSH connection attempt: ${errorMessage}`, { connectionId });
    
    try {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            error: `SSH connection attempt error: ${errorMessage}`,
            errorType: 'SSH_CONNECTION_ATTEMPT_ERROR',
            details: {
              ssh_host: ssh_host,
              ssh_port: ssh_port || 22,
              is_windows: is_windows
            }
          }),
        );
      }
    } catch (err) {
      logger.error(`Error sending connection error to WebSocket: ${err instanceof Error ? err.message : String(err)}`, { connectionId });
    }
  };
  
  // Create shell session
  function createShellSession() {
    if (!sshClient) return;
    
    sshClient.shell((err, stream) => {
      if (err) {
        logger.error(`SSH shell error: ${err.message}`, { connectionId });
        
        try {
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(
              JSON.stringify({
                error: `SSH shell error: ${err.message}`,
                errorType: 'SSH_SHELL_ERROR',
              }),
            );
          }
        } catch (e) {
          logger.error(`Error sending shell error to WebSocket: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
        }
        
        return;
      }
      
      setupStream(stream);
    });
  }
  
  // Common stream setup function
  function setupStream(stream: any) {
    // Handle stream data
    stream.on('data', (data: Buffer) => {
      try {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(data);
        }
      } catch (e) {
        logger.error(`Error sending data to WebSocket: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
      }
    });
    
    // Handle stream close
    stream.on('close', () => {
      logger.info('SSH stream closed', { connectionId });
      
      try {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(
            JSON.stringify({
              status: 'disconnected',
              message: 'SSH connection closed',
            }),
          );
          
          clientSocket.close();
        }
      } catch (e) {
        logger.error(`Error sending stream close to WebSocket: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
      }
    });
    
    // Handle WebSocket messages
    clientSocket.on('message', (message) => {
      try {
        // Try parsing as JSON for commands
        const data = JSON.parse(message.toString());
        
        // Handle resize command
        if (data.type === 'resize') {
          logger.debug('Resize terminal', { 
            connectionId, 
            rows: data.rows, 
            cols: data.cols 
          });
          
          stream.setWindow(data.rows, data.cols, 0, 0);
        }
      } catch (e) {
        // Not JSON, treat as terminal input
        try {
          stream.write(message);
        } catch (err) {
          logger.error(`Error writing to SSH stream: ${err instanceof Error ? err.message : String(err)}`, { connectionId });
        }
      }
    });
    
    // Handle WebSocket close
    clientSocket.on('close', () => {
      logger.info('WebSocket closed, ending SSH client', { connectionId });
      
      if (sshClient) {
        try {
          sshClient.end();
        } catch (e) {
          logger.error(`Error ending SSH client: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
        }
      }
    });
  }
  
  // Start the connection attempt
  attemptConnection(is_windows);
}
