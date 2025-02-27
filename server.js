const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { Client } = require('ssh2');

// Make WebSocketServer globally available
global.wss = null;

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Import prisma for database access
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Implement SSH connection handler directly
function handleSshConnection(clientSocket, connection, machineId) {
  console.log('[SSH] Establishing connection to:', {
    host: connection.ip,
    port: connection.port || 22,
    username: connection.username
  });
  
  // Clear any existing auth timeout
  const authTimeout = clientSocket.authTimeout;
  if (authTimeout) {
    clearTimeout(authTimeout);
    delete clientSocket.authTimeout;
  }
  
  const sshClient = new Client();
  
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
        console.error('[SSH] Shell error:', errorMessage);
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
      stream.on('data', (data) => {
        clientSocket.send(data);
      });
      
      // Handle WebSocket messages
      clientSocket.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          // Handle resize event
          if (data.type === 'resize') {
            console.log('[SSH] Terminal resize:', data);
            stream.setWindow(data.rows, data.cols, 0, 0);
          }
        } catch (e) {
          // Not JSON data, treat as terminal input
          stream.write(message);
        }
      });
      
      // Handle stream close
      stream.on('close', () => {
        console.log('[SSH] Stream closed');
        clientSocket.close();
      });
      
      // Handle stream errors
      stream.on('error', (err) => {
        console.error('[SSH] Stream error:', err.message);
        clientSocket.send(JSON.stringify({ 
          error: `SSH stream error: ${err.message}`,
          errorType: 'SSH_STREAM_ERROR'
        }));
      });
    });
  });
  
  // Handle SSH client errors
  sshClient.on('error', (err) => {
    console.error('[SSH] Connection error:', err.message);
    clientSocket.send(JSON.stringify({ 
      error: `SSH connection error: ${err.message}`,
      errorType: 'SSH_CONNECTION_ERROR',
      details: {
        host: connection.ip,
        port: connection.port || 22
      }
    }));
  });
  
  // Connect to SSH server
  sshClient.connect({
    host: connection.ip,
    port: connection.port || 22,
    username: connection.username,
    password: connection.password,
    readyTimeout: 10000 // 10 seconds timeout
  });
  
  // Handle WebSocket close
  clientSocket.on('close', () => {
    console.log('[SSH] WebSocket closed, ending SSH connection');
    sshClient.end();
  });
}

// Implement mock terminal handler
function handleMockTerminal(clientSocket, connection, machineId) {
  console.log('[Mock] Setting up mock terminal for:', connection.name);
  
  // Clear any existing auth timeout
  const authTimeout = clientSocket.authTimeout;
  if (authTimeout) {
    clearTimeout(authTimeout);
    delete clientSocket.authTimeout;
  }
  
  // Send connection status to client
  clientSocket.send(JSON.stringify({
    status: 'connected',
    message: 'Mock terminal connected successfully'
  }));
  
  // Send welcome message
  clientSocket.send(`\r\n\x1B[1;3;32mWelcome to Mock Terminal for ${connection.name}\x1B[0m\r\n\r\n`);
  clientSocket.send(`\x1B[1;34mThis is a simulated terminal environment.\x1B[0m\r\n`);
  clientSocket.send(`Type 'help' for available commands.\r\n\r\n$ `);
  
  // Handle messages from client
  clientSocket.on('message', (message) => {
    try {
      // Try to parse as JSON (for resize events)
      const data = JSON.parse(message.toString());
      if (data.type === 'resize') {
        console.log('[Mock] Terminal resize:', data);
        // No action needed for mock terminal
      }
    } catch (e) {
      // Not JSON, treat as command input
      const command = message.toString().trim();
      
      // Process mock commands
      setTimeout(() => {
        if (command === 'help') {
          clientSocket.send(`\r\nAvailable commands:\r\n`);
          clientSocket.send(`  help     - Show this help\r\n`);
          clientSocket.send(`  ls       - List files\r\n`);
          clientSocket.send(`  echo     - Echo text\r\n`);
          clientSocket.send(`  clear    - Clear screen\r\n`);
          clientSocket.send(`  exit     - Exit terminal\r\n\r\n$ `);
        } else if (command.startsWith('echo ')) {
          const text = command.substring(5);
          clientSocket.send(`\r\n${text}\r\n\r\n$ `);
        } else if (command === 'ls') {
          clientSocket.send(`\r\nfile1.txt\r\nfile2.txt\r\ndirectory1\r\n\r\n$ `);
        } else if (command === 'clear') {
          clientSocket.send(`\x1B[2J\x1B[H$ `);
        } else if (command === 'exit') {
          clientSocket.send(`\r\nClosing session...\r\n`);
          clientSocket.close();
        } else if (command !== '') {
          clientSocket.send(`\r\nCommand not found: ${command}\r\n\r\n$ `);
        } else {
          clientSocket.send(`\r\n$ `);
        }
      }, 100);
    }
  });
  
  // Handle WebSocket close
  clientSocket.on('close', () => {
    console.log('[Mock] WebSocket closed');
  });
}

app.prepare().then(async () => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      // Parse URL
      const parsedUrl = parse(req.url, true);
      
      // Let Next.js handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Initialize WebSocket server
  const wss = new WebSocketServer({ noServer: true });
  // Make it globally available
  global.wss = wss;
  
  console.log('[WebSocketServer] Initializing with HTTP server');
  
  // Set up ping interval for WebSocket connections
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(pingInterval);
  });
  
  wss.on('connection', (ws, request) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    console.log('[WebSocketServer] Client connected');
    
    // Extract machine ID from URL
    const { pathname } = parse(request.url);
    const machineIdMatch = pathname.match(/\/api\/virtualization\/machines\/([^\/]+)\/terminal/);
    const machineId = machineIdMatch ? machineIdMatch[1] : null;
    
    if (!machineId) {
      console.error('[WebSocketServer] No machine ID found in URL:', pathname);
      ws.send(JSON.stringify({ 
        error: 'Invalid machine ID',
        errorType: 'INVALID_MACHINE_ID'
      }));
      return;
    }
    
    console.log('[WebSocketServer] Machine ID:', machineId);
    
    // Set up authentication timeout (5 seconds)
    const authTimeout = setTimeout(() => {
      console.log('[WebSocketServer] Authentication timeout for machine:', machineId);
      ws.send(JSON.stringify({ 
        error: 'Authentication timeout',
        errorType: 'AUTH_TIMEOUT'
      }));
      ws.terminate();
    }, 5000);
    
    // Store the timeout in the socket for later cleanup
    ws.authTimeout = authTimeout;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'auth') {
          console.log('[WebSocketServer] Received auth request:', {
            connectionType: data.connectionType,
            username: data.username
          });
          
          // Clear authentication timeout
          clearTimeout(authTimeout);
          delete ws.authTimeout;
          
          // Fetch connection details from database
          try {
            console.log('[WebSocketServer] Looking up connection in database:', machineId);
            
            const connection = await prisma.connection.findUnique({
              where: { id: machineId }
            });
            
            if (!connection) {
              console.error('[WebSocketServer] Connection not found:', machineId);
              ws.send(JSON.stringify({ 
                error: 'Connection not found',
                errorType: 'CONNECTION_NOT_FOUND'
              }));
              return;
            }
            
            console.log('[WebSocketServer] Found connection:', { 
              id: connection.id, 
              type: connection.type 
            });
            
            // Update connection with auth data if provided
            if (data.username) connection.username = data.username;
            if (data.password) connection.password = data.password;
            
            // Handle connection based on type
            if (connection.type === 'ssh') {
              console.log('[WebSocketServer] Handling SSH connection');
              handleSshConnection(ws, connection, machineId);
            } else {
              console.log('[WebSocketServer] Handling mock terminal connection');
              handleMockTerminal(ws, connection, machineId);
            }
          } catch (dbError) {
            console.error('[WebSocketServer] Database error:', dbError);
            ws.send(JSON.stringify({ 
              error: 'Database error: ' + dbError.message,
              errorType: 'DATABASE_ERROR'
            }));
          }
        } else if (data.type === 'resize') {
          // Handle terminal resize - this will be handled by the SSH connection
          console.log('[WebSocketServer] Resize request:', data);
        }
      } catch (error) {
        console.error('[WebSocketServer] Error processing message:', error);
        ws.send(JSON.stringify({ 
          error: 'Invalid message format: ' + error.message,
          errorType: 'INVALID_MESSAGE'
        }));
      }
    });
    
    ws.on('close', () => {
      // Clear any pending timeouts
      if (ws.authTimeout) {
        clearTimeout(ws.authTimeout);
        delete ws.authTimeout;
      }
      console.log('[WebSocketServer] Client disconnected');
    });
  });
  
  // Handle upgrade requests
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url);
    console.log('[WebSocketServer] Received upgrade request:', pathname);
    
    // Handle terminal WebSocket connections
    if (pathname.startsWith('/api/virtualization/machines/') && pathname.endsWith('/terminal')) {
      console.log('[WebSocketServer] Handling terminal WebSocket upgrade');
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      console.log('[WebSocketServer] Invalid WebSocket path:', pathname);
      socket.destroy();
    }
  });
  
  // Start listening
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server initialized and ready`);
  });
}); 