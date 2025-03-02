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
  authData?: { username?: string; password?: string; host?: string; port?: number; is_windows?: boolean },
) {
  logger.info('Establishing SSH connection', { connectionId });

  // Send 'connecting' status immediately
  if (clientSocket.readyState === WebSocket.OPEN) {
    clientSocket.send(
      JSON.stringify({
        status: 'connecting',
        message: 'Establishing SSH connection...',
      }),
    );
    logger.info('Sent connecting status to client', { connectionId });
  } else {
    logger.error('WebSocket not open when sending connecting status', { connectionId });
    return;
  }

  if (!authData || !authData.host || !authData.username) {
    clientSocket.send(
      JSON.stringify({
        error: 'Missing SSH credentials',
        errorType: 'MISSING_CREDENTIALS',
      }),
    );
    return;
  }

  const sshClient = new Client();

  // Set a longer timeout for the SSH connection
  const connectionTimeout = setTimeout(() => {
    logger.error('SSH connection timeout', { connectionId });
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(
        JSON.stringify({
          error: 'SSH connection timed out',
          errorType: 'SSH_CONNECTION_TIMEOUT',
        }),
      );
    }
    sshClient.end();
  }, 30000); // 30 second timeout

  // Send periodic status updates to keep WebSocket alive
  const statusInterval = setInterval(() => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(
        JSON.stringify({
          status: 'connecting',
          message: 'Still establishing SSH connection...',
        }),
      );
      logger.info('Sent keepalive status to client', { connectionId });
    } else {
      clearInterval(statusInterval);
    }
  }, 3000); // Send status update every 3 seconds

  sshClient.on('ready', () => {
    clearTimeout(connectionTimeout);
    clearInterval(statusInterval);
    
    logger.info('SSH connection ready', { connectionId });
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(
        JSON.stringify({
          status: 'connected',
          message: 'SSH connection established successfully',
        }),
      );

      sshClient.shell((err, stream) => {
        if (err) {
          logger.error(`SSH shell error: ${err.message}`, { connectionId });
          clientSocket.send(
            JSON.stringify({
              error: `SSH shell error: ${err.message}`,
              errorType: 'SSH_SHELL_ERROR',
            }),
          );
          return;
        }

        stream.on('data', (data: Buffer) => {
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(data);
          }
        });

        clientSocket.on('message', (message) => {
          if (stream.writable) {
            stream.write(message);
          }
        });

        stream.on('close', () => {
          logger.info('SSH stream closed', { connectionId });
          clientSocket.close();
        });
      });
    } else {
      logger.warn('WebSocket closed before SSH ready', { connectionId });
      sshClient.end();
    }
  });

  sshClient.on('error', (err) => {
    clearTimeout(connectionTimeout);
    clearInterval(statusInterval);
    
    logger.error('SSH connection error', { error: err.message, connectionId });
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(
        JSON.stringify({
          error: `SSH connection error: ${err.message}`,
          errorType: 'SSH_CONNECTION_ERROR',
        }),
      );
    }
  });

  sshClient.connect({
    host: authData.host,
    port: authData.port || 22,
    username: authData.username,
    password: authData.password,
    readyTimeout: 30000, // 30 seconds timeout
  });

  clientSocket.on('close', () => {
    clearTimeout(connectionTimeout);
    clearInterval(statusInterval);
    
    logger.info('WebSocket closed by client', { connectionId });
    sshClient.end();
  });
}
