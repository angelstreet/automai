# WebSocket & Terminal Implementation Guidelines

## WebSocket Architecture Overview

The project uses a WebSocket implementation integrated with Next.js:

1. **WebSocket Utility Module** (`src/lib/websocket-server.ts`)
   - Provides utility functions for WebSocket connections
   - Used within the Next.js application
   - Exports functions like `getWebSocketServer()` and `handleUpgrade()`
   - Implements a singleton pattern for the WebSocket server

2. **Next.js API Route** (`src/app/api/terminals/[id]/route.ts`)
   - Handles WebSocket upgrade requests
   - Uses the WebSocket utility module to manage connections
   - Follows the Next.js Route Handler pattern

## WebSocket Utility Module (src/lib/websocket-server.ts)

1. **Singleton Pattern**
   - **IMPORTANT**: Always use the global WebSocketServer instance
   - Never create new WebSocketServer instances in route handlers
   - Use `getWebSocketServer()` to access the singleton instance
   - Handle WebSocket upgrades through the `handleUpgrade()` utility function

2. **Connection Management**
   - Implement ping/pong for connection health monitoring
   - Set `isAlive` flag to true on connection and on pong events
   - Terminate connections that don't respond to pings
   - Clean up resources when connections close

3. **Error Handling**
   - Always wrap WebSocket operations in try/catch blocks
   - Log errors with appropriate action tags
   - Send error messages to clients in JSON format
   - Include proper status codes in error responses

## Terminal Implementation
1. **xterm.js Integration**
   - Use xterm.js for terminal UI in the browser
   - Configure with appropriate options for performance
   - Handle terminal resize events
   - Support copy/paste operations

2. **SSH Connection**
   - Use ssh2 library for SSH connections
   - Implement proper authentication flow
   - Handle fingerprint verification
   - Stream data between SSH and WebSocket

3. **Security Considerations**
   - Validate user permissions before establishing connections
   - Implement timeouts for authentication
   - Close idle connections after a period of inactivity
   - Sanitize input/output to prevent injection attacks

## WebSocket API Routes
1. **Route Configuration**
   - Set `dynamic = 'force-dynamic'` and `runtime = 'nodejs'` in the route config
   - Check for 'upgrade' header in the request
   - Return appropriate status codes for WebSocket responses

2. **Connection Establishment**
   - Follow this pattern for WebSocket setup:
   ```typescript
   // Check if this is a WebSocket upgrade request
   const upgradeHeader = request.headers.get('upgrade');
   if (upgradeHeader !== 'websocket') {
     return new NextResponse('Expected Upgrade: websocket', { status: 426 });
   }

   try {
     // Get the WebSocket server
     const wss = getWebSocketServer();
     
     // Handle the upgrade
     handleUpgrade(req, socket, buffer, path);
     
     return response;
   } catch (error) {
     // Handle errors
   }
   ```

3. **Message Handling**
   - Parse incoming messages as JSON when appropriate
   - Handle different message types (auth, resize, data)
   - Send structured responses to the client

## Frontend Integration
1. **WebSocket Client**
   - Create WebSocket connections with appropriate URL: `ws://${window.location.host}/api/terminals/${connectionId}`
   - Implement reconnection logic
   - Handle connection state changes
   - Process binary and text messages appropriately

2. **Terminal UI**
   - Initialize xterm.js with proper configuration
   - Attach WebSocket data handlers
   - Implement terminal resize logic
   - Support keyboard input and special keys

3. **User Experience**
   - Show connection status to users
   - Provide clear error messages
   - Implement loading states during connection
   - Support terminal customization (colors, font size)

## Testing WebSocket Connections
1. **Manual Testing**
   - Use browser developer tools to inspect WebSocket traffic
   - Test reconnection scenarios
   - Verify terminal functionality with various commands
   - Check error handling and recovery

2. **Automated Testing**
   - Mock WebSocket connections in tests
   - Verify correct message handling
   - Test error scenarios and recovery
   - Ensure proper cleanup of resources 