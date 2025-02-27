import { Client } from 'ssh2';
import { logger } from '@/lib/logger';
import { Connection } from '@prisma/client';
import { WebSocketConnection } from '@/lib/websocket-server';

export function handleSshConnection(
  clientSocket: WebSocketConnection,
  connection: Connection,
  machineId: string
) {
  // Clear any existing auth timeout
  const authTimeout = (clientSocket as any).authTimeout;
  if (authTimeout) {
    clearTimeout(authTimeout);
    delete (clientSocket as any).authTimeout;
  }
  
  logger.info('Establishing SSH connection', {
    action: 'SSH_CONNECTION_ATTEMPT',
    data: { 
      machineId,
      host: connection.ip,
      port: connection.port || 22,
      username: connection.username
    },
    saveToDb: true
  });
  
  console.log('[SSH] Establishing connection to:', {
    host: connection.ip,
    port: connection.port || 22,
    username: connection.username
  });
  
  const sshClient = new Client();
  
  // Set up message handler for initial authentication
  clientSocket.once('message', (message: any) => {
    const isAuth = handleAuthMessage(message, clientSocket, connection, machineId);
    
    if (!isAuth) {
      logger.error('First message was not authentication', {
        action: 'TERMINAL_AUTH_MISSING',
        data: { machineId },
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
          machineId, 
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
        username: connection.username as string,
        password: connection.password as string,
        readyTimeout: 10000, // 10 seconds timeout
        keepaliveInterval: 10000, // Send keepalive every 10 seconds
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`SSH connection setup error: ${errorMessage}`, {
        action: 'SSH_SETUP_ERROR',
        data: { 
          machineId, 
          error: errorMessage 
        },
        saveToDb: true
      });
      clientSocket.send(JSON.stringify({ 
        error: `SSH setup error: ${errorMessage}`,
        errorType: 'SSH_SETUP_ERROR',
        details: {
          host: connection.ip,
          port: connection.port || 22
        }
      }));
    }
  });
  
  // Handle SSH client events
  sshClient.on('ready', () => {
    console.log('[SSH] Connection ready');
    
    // Send connection status to client
    clientSocket.send(JSON.stringify({
      status: 'connected',
      message: 'SSH connection established successfully'
    }));
    
    // Create an SSH shell session
    sshClient.shell((err, stream) => {
      if (err) {
        const errorMessage = `SSH shell error: ${err.message}`;
        logger.error(errorMessage, {
          action: 'SSH_SHELL_ERROR',
          data: { machineId, error: err.message },
          saveToDb: true
        });
        clientSocket.send(JSON.stringify({ 
          error: errorMessage,
          errorType: 'SSH_SHELL_ERROR',
          details: {
            host: connection.ip,
            port: connection.port || 22
          }
        }));
        return;
      }
      
      // Pipe data from SSH to WebSocket
      stream.on('data', (data: any) => {
        clientSocket.send(data);
      });
      
      // Handle WebSocket messages
      clientSocket.on('message', (message: any) => {
        try {
          const data = JSON.parse(message.toString());
          
          // Handle resize event
          if (data.type === 'resize') {
            logger.info('Terminal resize', {
              action: 'TERMINAL_RESIZE',
              data: { machineId, cols: data.cols, rows: data.rows },
              saveToDb: false
            });
            stream.setWindow(data.rows, data.cols, 0, 0);
          } else if (data.type === 'auth') {
            // Authentication already handled during connection
            logger.info('Terminal authentication received after connection', {
              action: 'TERMINAL_AUTH_AFTER_CONNECT',
              data: { machineId },
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
          data: { machineId },
          saveToDb: true
        });
        sshClient.end();
      });
      
      // Handle SSH stream errors
      stream.on('error', (err: any) => {
        logger.error(`SSH stream error: ${err.message}`, {
          action: 'SSH_STREAM_ERROR',
          data: { machineId, error: err.message },
          saveToDb: true
        });
      });
    });
  });
  
  sshClient.on('error', (err) => {
    const errorMessage = `SSH connection error: ${err.message}`;
    logger.error(errorMessage, {
      action: 'SSH_CONNECTION_ERROR',
      data: { machineId, error: err.message },
      saveToDb: true
    });
    
    // Determine error type for better client-side handling
    let errorType = 'SSH_CONNECTION_ERROR';
    if (err.message.includes('Authentication failed')) {
      errorType = 'SSH_AUTH_ERROR';
    } else if (err.message.includes('connect ETIMEDOUT') || err.message.includes('connect ECONNREFUSED')) {
      errorType = 'SSH_NETWORK_ERROR';
    }
    
    clientSocket.send(JSON.stringify({ 
      error: errorMessage,
      errorType: errorType,
      details: {
        host: connection.ip,
        port: connection.port || 22
      }
    }));
    sshClient.end();
  });
  
  // Handle WebSocket close
  clientSocket.on('close', () => {
    logger.info('Terminal WebSocket connection closed', {
      action: 'TERMINAL_WS_CLOSED',
      data: { machineId },
      saveToDb: true
    });
    sshClient.end();
  });
  
  return sshClient;
}

export function handleMockTerminal(
  clientSocket: WebSocketConnection,
  connection: Connection,
  machineId: string
) {
  logger.info('Using mock terminal for non-SSH connection', {
    action: 'MOCK_TERMINAL',
    data: { machineId, connectionType: connection.type },
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
          data: { machineId, cols: data.cols, rows: data.rows },
          saveToDb: false
        });
      }
      
      // Handle authentication
      if (data.type === 'auth') {
        logger.info('Terminal authentication', {
          action: 'TERMINAL_AUTH',
          data: { 
            machineId, 
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
      data: { machineId },
      saveToDb: true
    });
  });
}

export function handleAuthMessage(
  message: any, 
  clientSocket: WebSocketConnection, 
  connection: Connection, 
  machineId: string
) {
  try {
    const data = JSON.parse(message.toString());
    
    if (data.type === 'auth') {
      logger.info('Received authentication message', {
        action: 'TERMINAL_AUTH_RECEIVED',
        data: { 
          machineId, 
          connectionType: data.connectionType,
          username: data.username || connection.username
        },
        saveToDb: true
      });
      
      // Use credentials from the message if provided, otherwise use the ones from the database
      connection.username = data.username || connection.username;
      connection.password = data.password || connection.password;
      
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
} 