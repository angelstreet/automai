import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { serverCache } from '@/lib/cache';

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
    
    // Create a mock WebSocket server
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
        
        // Echo back the message (simulating terminal output)
        clientSocket.send(`Received: ${message.toString()}\r\n`);
      } catch (error) {
        // For non-JSON messages, just echo them back
        clientSocket.send(`${message.toString()}\r\n`);
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
  } catch (error) {
    logger.error(`Error in terminal WebSocket: ${error instanceof Error ? error.message : String(error)}`);
    return new Response('Internal Server Error', { status: 500 });
  }
} 