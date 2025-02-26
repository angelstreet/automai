import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

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

    logger.info(`Closing ${type} connection to ${ip}:${port}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'CLOSE_CONNECTION_INITIATED',
      data: { type, ip, port },
      saveToDb: true
    });

    // In a real implementation, we would close the actual connection
    // For now, we'll just return success
    return NextResponse.json({
      success: true,
      message: 'Connection closed successfully',
    });
  } catch (error) {
    logger.error(`Error closing connection: ${error.message}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'CLOSE_CONNECTION_ERROR',
      data: { error: error.message },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
} 