import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// POST /api/virtualization/machines/close-connection
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      logger.warn('Unauthorized access attempt to close connection endpoint', { 
        userId: session?.user?.id, 
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CLOSE_CONNECTION_UNAUTHORIZED',
        saveToDb: true 
      });
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      }, { status: 401 });
    }
    
    const body = await request.json();
    const { type, ip, port } = body;

    logger.info(`Closing ${type} connection to ${ip}:${port || 'default port'}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'CLOSE_CONNECTION_INITIATED',
      data: { type, ip, port },
      saveToDb: true
    });

    if (!ip) {
      logger.warn('Missing IP address for connection closure', { 
        userId: session?.user?.id, 
        tenantId: session?.user?.tenantId,
        action: 'CLOSE_CONNECTION_MISSING_IP',
        data: { type },
        saveToDb: true
      });
      return NextResponse.json({
        success: false,
        message: 'IP address is required',
      }, { status: 400 });
    }

    // Find active connection in database
    const connection = await prisma.connection.findFirst({
      where: {
        ip,
        port: port || undefined,
        type,
        OR: [
          { userId: session.user.id },
          { tenantId: session.user.tenantId || undefined }
        ]
      }
    });

    if (connection) {
      // Update connection status
      await prisma.connection.update({
        where: { id: connection.id },
        data: { 
          status: 'disconnected',
          lastConnected: new Date()
        }
      });

      logger.info(`Updated connection status for ${ip}:${port || 'default port'}`, { 
        userId: session?.user?.id, 
        tenantId: session?.user?.tenantId,
        connectionId: connection.id,
        action: 'CLOSE_CONNECTION_STATUS_UPDATED',
        data: { type, ip, port, status: 'disconnected' },
        saveToDb: true
      });
    }

    // Log specific connection type closure
    if (type === 'ssh') {
      logger.debug('SSH: Closing session', { 
        userId: session?.user?.id,
        action: 'SSH_SESSION_CLOSE',
        data: { ip, port }
      });

      logger.debug('SSH: Terminating channels', { 
        userId: session?.user?.id,
        action: 'SSH_CHANNELS_TERMINATE',
        data: { ip, port }
      });

      logger.debug('SSH: Disconnecting transport', { 
        userId: session?.user?.id,
        action: 'SSH_TRANSPORT_DISCONNECT',
        data: { ip, port }
      });
    } else if (type === 'docker') {
      logger.debug('Docker: Closing API connection', { 
        userId: session?.user?.id,
        action: 'DOCKER_API_DISCONNECT',
        data: { ip, port }
      });
    } else if (type === 'portainer') {
      logger.debug('Portainer: Invalidating session', { 
        userId: session?.user?.id,
        action: 'PORTAINER_SESSION_INVALIDATE',
        data: { ip, port }
      });
    }

    logger.info(`Successfully closed ${type} connection to ${ip}:${port || 'default port'}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      connectionId: connection?.id,
      action: 'CLOSE_CONNECTION_SUCCESS',
      data: { type, ip, port },
      saveToDb: true
    });

    return NextResponse.json({
      success: true,
      message: 'Connection closed successfully',
    });
  } catch (error) {
    logger.error(`Error closing connection: ${error instanceof Error ? error.message : String(error)}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'CLOSE_CONNECTION_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: false,
      message: 'Failed to close connection',
    }, { status: 500 });
  }
} 