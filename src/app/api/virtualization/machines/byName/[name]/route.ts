import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  context: { params: { name: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      logger.warn('Unauthorized access attempt to get machine by name', { 
        userId: session?.user?.id, 
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'MACHINE_GET_BY_NAME_UNAUTHORIZED',
        saveToDb: true 
      });
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      }, { status: 401 });
    }
    
    // Properly handle params - use context.params instead of params directly
    const { name } = context.params;
    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Machine name is required',
      }, { status: 400 });
    }
    
    const userId = session.user.id;
    const tenantId = session.user.tenantId;
    
    // Get the connection by name
    const connection = await prisma.connection.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        },
        OR: [
          { userId },
          { tenantId: tenantId || undefined }
        ]
      }
    });
    
    if (!connection) {
      logger.warn('Machine not found or unauthorized', { 
        userId: userId, 
        tenantId: tenantId,
        action: 'MACHINE_GET_BY_NAME_NOT_FOUND',
        data: { name },
        saveToDb: true
      });
      return NextResponse.json({
        success: false,
        message: 'Machine not found',
      }, { status: 404 });
    }
    
    // Map to expected format
    const machine = {
      id: connection.id,
      name: connection.name,
      description: connection.description || undefined,
      type: connection.type,
      ip: connection.ip,
      port: connection.port || undefined,
      user: connection.username || undefined,
      status: connection.status,
      lastConnected: connection.lastConnected || undefined,
      errorMessage: connection.errorMessage || undefined,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt
    };
    
    logger.info('Successfully retrieved machine by name', { 
      userId: userId, 
      tenantId: tenantId,
      action: 'MACHINE_GET_BY_NAME_SUCCESS',
      data: { name },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: true,
      data: machine,
    });
  } catch (error) {
    logger.error(`Error getting machine by name: ${error instanceof Error ? error.message : String(error)}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'MACHINE_GET_BY_NAME_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) },
      saveToDb: true
    });
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
} 