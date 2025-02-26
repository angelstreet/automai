import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { serverCache } from '@/lib/cache';
import { Client } from 'ssh2';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const params = await Promise.resolve(context.params);
    const { id } = params;
    
    if (!id) {
      return new Response('Machine ID is required', { status: 400 });
    }
    
    const userId = session.user.id;
    const tenantId = session.user.tenantId;
    
    // Verify the user has access to this machine
    const connection = await prisma.connection.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { tenantId: tenantId || undefined }
        ]
      }
    });
    
    if (!connection) {
      return new Response('Machine not found or unauthorized', { status: 404 });
    }
    
    // Update connection status to connected
    await prisma.connection.update({
      where: { id },
      data: {
        status: 'connected',
        lastConnected: new Date(),
        errorMessage: null
      }
    });
    
    // Invalidate cache for machines data
    const cacheKey = `machines_${userId}_${tenantId || 'personal'}`;
    await serverCache.delete(cacheKey);
    
    // This is a WebSocket endpoint
    if (!request.headers.get('upgrade')?.includes('websocket')) {
      return new Response('Expected WebSocket connection', { status: 400 });
    }
    
    // Create a WebSocket connection
    const { socket: clientSocket, response } = await new Promise<any>((resolve) => {
      const { socket, response } = Reflect.get(
        Object.getPrototypeOf(request),
        'socket'
      )(request);
      
      resolve({ socket, response });
    });
    
    // Log the connection
    logger.info('Terminal WebSocket connection established', {
      action: 'TERMINAL_WS_CONNECTED',
      data: { machineId: id, ip: connection.ip },
      saveToDb: true
    });

    // Set up authentication handler
    let isAuthenticated = false;
    let authTimeout: NodeJS.Timeout | null = null;
    
    // Set authentication timeout
    authTimeout = setTimeout(() => {
      if (!isAuthenticated) {
        logger.error('Authentication timeout', {
          action: 'TERMINAL_AUTH_TIMEOUT',
          data: { machineId: id },
          saveToDb: true
        });
        clientSocket.send(JSON.stringify({ error: 'Authentication timeout. Please try again.' }));
        clientSocket.close();
      }
    }, 10000); // 10 seconds timeout

    // Handle authentication message
    const handleAuthMessage = (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth') {
          logger.info('Received authentication message', {
            action: 'TERMINAL_AUTH_RECEIVED',
            data: { 
              machineId: id, 
              connectionType: data.connectionType,
              username: data.username || connection.username
            },
            saveToDb: true
          });
          
          // Clear the timeout
          if (authTimeout) {
            clearTimeout(authTimeout);
            authTimeout = null;
          }
          
          isAuthenticated = true;
          
          // Use credentials from the message if provided, otherwise use the ones from the database
          const credentials = {
            username: data.username || connection.username,
            password: data.password || connection.password
          };
          
          // Store the credentials for later use
          connection.username = credentials.username;
          connection.password = credentials.password;
          
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    };

    // Check if this is an SSH connection
    if (connection.type === 'ssh') {
      // Create SSH client
      const sshClient = new Client();
      
      // Set up message handler for initial authentication
      clientSocket.once('message', (message) => {
        const isAuth = handleAuthMessage(message);
        
        if (!isAuth) {
          logger.error('First message was not authentication', {
            action: 'TERMINAL_AUTH_MISSING',
            data: { machineId: id },
            saveToDb: true
          });
          clientSocket.send(JSON.stringify({ error: 'Authentication required' }));
          return;
        }
        
        // Now connect to SSH with the authenticated credentials
        try {
          logger.info('Attempting SSH connection after authentication', {
            action: 'SSH_CONNECTION_ATTEMPT',
            data: { 
              machineId: id, 
              host: connection.ip, 
              port: connection.port || 22,
              username: connection.username,
              hasPassword: !!connection.password
            },
            saveToDb: true
          });
          
          sshClient.connect({
            host: connection.ip,
            port: connection.port || 22,
            username: connection.username,
            password: connection.password,
            readyTimeout: 10000, // 10 seconds timeout
            keepaliveInterval: 10000, // Send keepalive every 10 seconds
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`SSH connection setup error: ${errorMessage}`, {
            action: 'SSH_SETUP_ERROR',
            data: { 
              machineId: id, 
              error: errorMessage 
            },
            saveToDb: true
          });
          clientSocket.send(JSON.stringify({ error: `SSH setup error: ${errorMessage}` }));
        }
      });
      
      // Handle SSH client events
      sshClient.on('ready', () => {
        logger.info('SSH connection established', {
          action: 'SSH_CONNECTED',
          data: { machineId: id, ip: connection.ip },
          saveToDb: true
        });
        
        // Create an SSH shell session
        sshClient.shell((err, stream) => {
          if (err) {
            logger.error(`SSH shell error: ${err.message}`, {
              action: 'SSH_SHELL_ERROR',
              data: { machineId: id, error: err.message },
              saveToDb: true
            });
            clientSocket.send(JSON.stringify({ error: err.message }));
            return;
          }
          
          // Pipe data from SSH to WebSocket
          stream.on('data', (data) => {
            clientSocket.send(data);
          });
          
          // Handle WebSocket messages
          clientSocket.on('message', (message) => {
            try {
              const data = JSON.parse(message.toString());
              
              // Handle resize event
              if (data.type === 'resize') {
                logger.info('Terminal resize', {
                  action: 'TERMINAL_RESIZE',
                  data: { machineId: id, cols: data.cols, rows: data.rows },
                  saveToDb: false
                });
                stream.setWindow(data.rows, data.cols, 0, 0);
              } else if (data.type === 'auth') {
                // Authentication already handled during connection
                logger.info('Terminal authentication received after connection', {
                  action: 'TERMINAL_AUTH_AFTER_CONNECT',
                  data: { machineId: id },
                  saveToDb: false
                });
              }
            } catch (error) {
              // For non-JSON messages, send as terminal input
              stream.write(message.toString());
            }
          });
          
          // Handle SSH stream close
          stream.on('close', () => {
            logger.info('SSH stream closed', {
              action: 'SSH_STREAM_CLOSED',
              data: { machineId: id },
              saveToDb: true
            });
            sshClient.end();
          });
          
          // Handle SSH stream errors
          stream.on('error', (err) => {
            logger.error(`SSH stream error: ${err.message}`, {
              action: 'SSH_STREAM_ERROR',
              data: { machineId: id, error: err.message },
              saveToDb: true
            });
          });
        });
      });
      
      sshClient.on('error', (err) => {
        logger.error(`SSH connection error: ${err.message}`, {
          action: 'SSH_CONNECTION_ERROR',
          data: { machineId: id, error: err.message },
          saveToDb: true
        });
        clientSocket.send(JSON.stringify({ error: `Connection error: ${err.message}` }));
        sshClient.end();
      });
      
      // Handle WebSocket close
      clientSocket.on('close', () => {
        logger.info('Terminal WebSocket connection closed', {
          action: 'TERMINAL_WS_CLOSED',
          data: { machineId: id },
          saveToDb: true
        });
        sshClient.end();
      });
      
      return response;
    } else {
      // For non-SSH connections, use the mock implementation
      logger.info('Using mock terminal for non-SSH connection', {
        action: 'MOCK_TERMINAL',
        data: { machineId: id, connectionType: connection.type },
        saveToDb: true
      });
      
      // Handle WebSocket messages
      clientSocket.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          
          // Handle resize event
          if (data.type === 'resize') {
            logger.info('Terminal resize', {
              action: 'TERMINAL_RESIZE',
              data: { machineId: id, cols: data.cols, rows: data.rows },
              saveToDb: false
            });
          }
          
          // Handle authentication
          if (data.type === 'auth') {
            logger.info('Terminal authentication', {
              action: 'TERMINAL_AUTH',
              data: { 
                machineId: id, 
                connectionType: data.connectionType 
              },
              saveToDb: true
            });
            
            // Send initial terminal output with current directory
            clientSocket.send(`Last login: ${new Date().toLocaleString()}\r\n`);
            clientSocket.send(`Welcome to ${connection.name} (${connection.ip})\r\n\r\n`);
            clientSocket.send(`user@${connection.name}:~$ pwd\r\n/home/user\r\n`);
            clientSocket.send(`user@${connection.name}:~$ `);
            return;
          }
          
          // Echo back the message (simulating terminal output)
          if (message.toString().trim()) {
            const command = message.toString().trim();
            
            // Simulate command execution
            if (command === 'pwd') {
              clientSocket.send(`/home/user\r\n`);
            } else if (command === 'ls') {
              clientSocket.send(`Documents  Downloads  Pictures  Videos\r\n`);
            } else if (command.startsWith('cd ')) {
              // Just acknowledge cd commands
              clientSocket.send(``);
            } else {
              clientSocket.send(`${command}: command not found\r\n`);
            }
            
            // Show prompt after command execution
            clientSocket.send(`user@${connection.name}:~$ `);
          }
        } catch (error) {
          // For non-JSON messages, try to handle as terminal input
          const input = message.toString();
          if (input.trim()) {
            // Echo the input and show a new prompt
            clientSocket.send(`${input}\r\n`);
            clientSocket.send(`user@${connection.name}:~$ `);
          }
        }
      });
      
      // Handle WebSocket close
      clientSocket.on('close', () => {
        logger.info('Terminal WebSocket connection closed', {
          action: 'TERMINAL_WS_CLOSED',
          data: { machineId: id },
          saveToDb: true
        });
      });
      
      return response;
    }
  } catch (error) {
    logger.error(`Error in terminal WebSocket: ${error instanceof Error ? error.message : String(error)}`);
    return new Response('Internal Server Error', { status: 500 });
  }
} 