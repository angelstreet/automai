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

/**
 * Handle SSH connection for a WebSocket client
 */
export async function handleSshConnection(
  clientSocket: WebSocketConnection,
  connectionId: string,
  authData?: { username?: string; password?: string; host: string; port?: number },
) {
  logger.info('Establishing SSH connection', { connectionId });
  console.log('DEBUG: handleSshConnection called with connectionId:', connectionId);
  console.log('DEBUG: authData:', JSON.stringify(authData));

  if (clientSocket.authTimeout) {
    clearTimeout(clientSocket.authTimeout);
    delete clientSocket.authTimeout;
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

  sshClient.on('ready', () => {
    logger.info('SSH connection ready', { connectionId });

    clientSocket.send(
      JSON.stringify({
        status: 'connected',
        message: 'SSH connection established successfully',
      }),
    );

    sshClient.shell((err, stream) => {
      if (err) {
        logger.error(`SSH shell error: ${err.message}`, { connectionId });
        return;
      }

      stream.on('data', (data: Buffer) => clientSocket.send(data));

      clientSocket.on('message', (message) => stream.write(message));

      stream.on('close', () => clientSocket.close());
    });
  });

  sshClient.on('error', (err) => {
    logger.error('SSH connection error', { error: err.message, connectionId });
    clientSocket.send(
      JSON.stringify({
        error: `SSH connection error: ${err.message}`,
        errorType: 'SSH_CONNECTION_ERROR',
      }),
    );
  });

  sshClient.connect({
    host: authData.host,
    port: authData.port || 22,
    username: authData.username,
    password: authData.password,
  });

  clientSocket.on('close', () => sshClient.end());
}
