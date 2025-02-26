import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      logger.warn('Unauthorized access attempt to disconnect from machine', { 
        userId: session?.user?.id, 
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'MACHINE_DISCONNECT_UNAUTHORIZED',
        saveToDb: true 
      });
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      }, { status: 401 });
    }
    
    const userId = session.user.id;
    const tenantId = session.user.tenantId;
    const body = await request.json();
    
    const { machineId } = body;
    
    if (!machineId) {
      return NextResponse.json({
        success: false,
        message: 'Machine ID is required',
      }, { status: 400 });
    }
    
    // Verify the user has access to this machine
    const connection = await prisma.connection.findFirst({
      where: {
        id: machineId,
        OR: [
          { userId },
          { tenantId: tenantId || undefined }
        ]
      }
    });
    
    if (!connection) {
      logger.warn('Unauthorized disconnect attempt from machine', { 
        userId: userId, 
        tenantId: tenantId,
        action: 'MACHINE_DISCONNECT_UNAUTHORIZED',
        data: { machineId },
        saveToDb: true
      });
      return NextResponse.json({
        success: false,
        message: 'Machine not found or unauthorized',
      }, { status: 404 });
    }
    
    // In a real implementation, this would close the SSH connection
    // For now, we'll just update the status
    
    // Update the connection status
    await prisma.connection.update({
      where: { id: machineId },
      data: {
        status: 'disconnected'
      }
    });
    
    logger.info('Successfully disconnected from machine', { 
      userId: userId, 
      tenantId: tenantId,
      connectionId: machineId,
      action: 'MACHINE_DISCONNECT_SUCCESS',
      data: { machineId },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: true,
      message: 'Disconnected successfully',
    });
  } catch (error) {
    logger.error(`Error disconnecting from machine: ${error instanceof Error ? error.message : String(error)}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'MACHINE_DISCONNECT_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) },
      saveToDb: true
    });
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
} 