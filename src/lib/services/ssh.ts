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
  host: string;
  port: number;
  username: string;
  password: string | null;
  privateKey: string | null;
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
  authData?: { username?: string; password?: string; host: string; port?: number },
) {
  let isConnecting = true;
  let sshClient: Client | null = null;

  // Set up WebSocket close handler first
  clientSocket.on('close', () => {
    logger.info('WebSocket closed by client', { connectionId, isConnecting });
    if (sshClient) {
      try {
        logger.info('Ending SSH client due to WebSocket closure', { connectionId });
        sshClient.end();
      } catch (e) {
        logger.error(`Error ending SSH client: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
      }
    }
  });

  logger.info('Establishing SSH connection', { connectionId });
  console.log('DEBUG: handleSshConnection called with connectionId:', connectionId);
  
  // Log connection details for troubleshooting but sanitize password
  console.log('DEBUG: authData:', JSON.stringify({
    username: authData?.username,
    password: authData?.password ? '[REDACTED]' : 'none',
    host: authData?.host,
    port: authData?.port || 22
  }));

  if (clientSocket.authTimeout) {
    clearTimeout(clientSocket.authTimeout);
    delete clientSocket.authTimeout;
  }

  if (!authData || !authData.host || !authData.username) {
    const missingFields = [];
    if (!authData) missingFields.push('authData');
    else {
      if (!authData.host) missingFields.push('host');
      if (!authData.username) missingFields.push('username');
    }
    
    logger.error('Missing SSH credentials', { connectionId, missingFields });
    
    try {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            error: `Missing SSH credentials: ${missingFields.join(', ')}`,
            errorType: 'MISSING_CREDENTIALS',
            details: { missingFields }
          }),
        );
      }
    } catch (e) {
      logger.error(`Failed to send error message: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
    }
    return;
  }

  sshClient = new Client();

  sshClient.on('ready', () => {
    isConnecting = false;
    logger.info('SSH connection ready', { connectionId, host: authData.host, port: authData.port || 22 });

    try {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            status: 'connected',
            message: 'SSH connection established successfully',
          }),
        );
      }
    } catch (e) {
      logger.error(`Failed to send connection success message: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
      return;
    }

    sshClient.shell((err, stream) => {
      if (err) {
        logger.error(`SSH shell error: ${err.message}`, { connectionId, host: authData.host });
        try {
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(
              JSON.stringify({
                error: `SSH shell error: ${err.message}`,
                errorType: 'SSH_SHELL_ERROR',
                details: { host: authData.host, port: authData.port || 22 }
              }),
            );
          }
        } catch (e) {
          logger.error(`Failed to send shell error message: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
        }
        return;
      }

      stream.on('data', (data: Buffer) => {
        try {
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(data);
          } else {
            logger.warn('Cannot send data, WebSocket is not open', { connectionId });
          }
        } catch (e) {
          logger.error(`Error sending data to WebSocket: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
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
          logger.error(`Error processing WebSocket message: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
        }
      });

      stream.on('close', () => {
        logger.info('SSH stream closed', { connectionId });
        // Don't close the WebSocket, let the client handle disconnection
      });
    });
  });

  sshClient.on('error', (err: SSHError) => {
    const errorInfo = {
      error: err.message, 
      code: err.code,
      level: err.level,
      connectionId,
      host: authData.host,
      port: authData.port || 22
    };
    
    logger.error('SSH connection error', errorInfo);
    console.error(`SSH connection error for ${connectionId}:`, err);
    
    try {
      const errorType = err.code === 'ECONNREFUSED' ? 'SSH_CONNECTION_REFUSED' : 
                        err.code === 'ECONNRESET' ? 'SSH_CONNECTION_RESET' :
                        err.level === 'authentication' ? 'SSH_AUTH_ERROR' : 'SSH_CONNECTION_ERROR';
      
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            error: `SSH connection error: ${err.message}`,
            errorType: errorType,
            details: {
              code: err.code,
              level: err.level,
              host: authData.host,
              port: authData.port || 22
            }
          }),
        );
      }
      // Don't close the WebSocket on SSH errors, let client handle reconnection if needed
    } catch (e) {
      logger.error(`Error sending error to WebSocket: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
    }
  });

  try {
    logger.info('Attempting to connect to SSH server', { 
      host: authData.host, 
      port: authData.port || 22, 
      username: authData.username,
      hasPassword: !!authData.password,
      connectionId
    });
    
    sshClient.connect({
      host: authData.host,
      port: authData.port || 22,
      username: authData.username,
      password: authData.password,
      debug: (message: string) => {
        console.log(`SSH DEBUG [${connectionId}]:`, message);
        if (message.includes('KEX') || message.includes('AUTH') || message.includes('USERAUTH')) {
          console.log(`SSH DETAIL [${connectionId}]:`, message);
        }
      },
      readyTimeout: 10000,
      keepaliveInterval: 30000,
      algorithms: {
        kex: ['diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
        cipher: ['aes128-ctr', '3des-cbc'],
        serverHostKey: ['ssh-rsa', 'ssh-dss']
      }
    });
    
    // Set a connection timeout to detect and handle hanging connections
    const connectTimeout = setTimeout(() => {
      if (isConnecting && sshClient) {
        logger.error('SSH connection timed out', { connectionId });
        
        try {
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(
              JSON.stringify({
                error: `SSH connection timed out after 15 seconds`,
                errorType: 'SSH_CONNECTION_TIMEOUT',
                details: {
                  host: authData.host,
                  port: authData.port || 22
                }
              }),
            );
          }
        } catch (e) {
          logger.error(`Error sending timeout error to WebSocket: ${e instanceof Error ? e.message : String(e)}`, { connectionId });
        }
        
        sshClient.end();
      }
    }, 15000);
    
    // Clear timeout when connect is called
    sshClient.once('ready', () => {
      clearTimeout(connectTimeout);
    });
    
    sshClient.once('error', () => {
      clearTimeout(connectTimeout);
    });
    
  } catch (e) {
    logger.error(`Error connecting to SSH server: ${e instanceof Error ? e.message : String(e)}`, { 
      connectionId,
      host: authData.host,
      port: authData.port || 22
    });
    
    try {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            error: `SSH connection attempt error: ${e instanceof Error ? e.message : String(e)}`,
            errorType: 'SSH_CONNECTION_ATTEMPT_ERROR',
            details: {
              host: authData.host,
              port: authData.port || 22
            }
          }),
        );
      }
    } catch (sendErr) {
      logger.error(`Error sending connection error to WebSocket: ${sendErr instanceof Error ? sendErr.message : String(sendErr)}`, { connectionId });
    }
  }
}
