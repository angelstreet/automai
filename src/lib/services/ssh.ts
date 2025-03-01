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
  type?: string; // Add the missing type property
  ip?: string; // Add the missing ip property
}

/**
 * Get connection details from database
 */
async function getConnection(connectionId: string): Promise<Connection | null> {
  try {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    return connection as unknown as Connection;
  } catch (error: any) {
    logger.error('Error fetching connection', {
      error: error.message || String(error),
      connectionId,
    });
    return null;
  }
}

/**
 * Handle SSH connection for a WebSocket client
 */
export async function handleSshConnection(
  clientSocket: WebSocketConnection,
  connectionId: string,
  authData?: { username?: string; password?: string },
) {
  logger.info('Establishing SSH connection', { connectionId });

  // Clear any existing auth timeout
  if (clientSocket.authTimeout) {
    clearTimeout(clientSocket.authTimeout);
    delete clientSocket.authTimeout;
  }

  try {
    // Fetch connection details from database
    const connection = (await getConnection(connectionId)) as Connection;

    if (!connection) {
      logger.error('Connection not found', { connectionId });
      clientSocket.send(
        JSON.stringify({
          error: 'Connection not found',
          errorType: 'CONNECTION_NOT_FOUND',
        }),
      );
      return;
    }

    logger.info('Found connection', {
      id: connection.id,
      type: connection.type,
    });

    // Update connection with auth data if provided
    let connectionData = { ...connection };
    if (authData?.username) connectionData.username = authData.username;
    if (authData?.password) connectionData.password = authData.password;

    // Verify connection type
    if (connection.type !== 'ssh') {
      logger.error('Unsupported connection type', { type: connection.type });
      clientSocket.send(
        JSON.stringify({
          error: `Unsupported connection type: ${connection.type}`,
          errorType: 'UNSUPPORTED_CONNECTION_TYPE',
        }),
      );
      return;
    }

    // Create SSH client
    const sshClient = new Client();

    // Set up SSH client event handlers
    sshClient.on('ready', () => {
      logger.info('SSH connection ready', { connectionId });

      // Send connection status to client
      clientSocket.send(
        JSON.stringify({
          status: 'connected',
          message: 'SSH connection established successfully',
        }),
      );

      // Create an SSH shell session
      sshClient.shell((err, stream) => {
        if (err) {
          const errorMessage = `SSH shell error: ${err.message}`;
          logger.error(errorMessage, { connectionId });
          clientSocket.send(
            JSON.stringify({
              error: errorMessage,
              errorType: 'SSH_SHELL_ERROR',
              details: {
                host: connectionData.ip,
                port: connectionData.port || 22,
              },
            }),
          );
          return;
        }

        // Pipe data from SSH to WebSocket
        stream.on('data', (data: Buffer) => {
          clientSocket.send(data);
        });

        // Handle WebSocket messages
        clientSocket.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());

            // Handle resize event
            if (data.type === 'resize') {
              logger.debug('Terminal resize', data);
              stream.setWindow(data.rows, data.cols, 0, 0);
            }
          } catch (e) {
            // Not JSON data, treat as terminal input
            stream.write(message);
          }
        });

        // Handle stream close
        stream.on('close', () => {
          logger.info('SSH stream closed', { connectionId });
          clientSocket.close();
        });

        // Handle stream errors
        stream.on('error', (err: Error) => {
          logger.error('SSH stream error', { error: err.message, connectionId });
          clientSocket.send(
            JSON.stringify({
              error: `SSH stream error: ${err.message}`,
              errorType: 'SSH_STREAM_ERROR',
            }),
          );
        });
      });
    });

    // Handle SSH client errors
    sshClient.on('error', (err) => {
      logger.error('SSH connection error', { error: err.message, connectionId });
      clientSocket.send(
        JSON.stringify({
          error: `SSH connection error: ${err.message}`,
          errorType: 'SSH_CONNECTION_ERROR',
          details: {
            host: connectionData.ip,
            port: connectionData.port || 22,
          },
        }),
      );
    });

    // When using password in SSH config, convert null to undefined
    const sshConfig = {
      host: connectionData.host || connectionData.ip,
      port: connectionData.port || 22,
      username: connectionData.username,
      password: connectionData.password || undefined, // Convert null to undefined
      privateKey: connectionData.privateKey || undefined,
    };

    // Connect to SSH server
    sshClient.connect(sshConfig);

    // Handle WebSocket close
    clientSocket.on('close', () => {
      logger.info('WebSocket closed, ending SSH connection', { connectionId });
      sshClient.end();
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error handling SSH connection', { error: errorMessage, connectionId });
    clientSocket.send(
      JSON.stringify({
        error: 'Error handling SSH connection: ' + errorMessage,
        errorType: 'SSH_HANDLER_ERROR',
      }),
    );
  }
}
