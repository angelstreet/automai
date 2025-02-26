import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { serverCache } from '@/lib/cache';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      logger.warn('Unauthorized access attempt to connect to machine', { 
        userId: session?.user?.id, 
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'MACHINE_CONNECT_UNAUTHORIZED',
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
    
    const { machineId, type, ip, port, username, password } = body;
    
    if (!machineId || !type || !ip) {
      return NextResponse.json({
        success: false,
        message: 'Missing required connection parameters',
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
      logger.warn('Unauthorized connection attempt to machine', { 
        userId: userId, 
        tenantId: tenantId,
        action: 'MACHINE_CONNECT_UNAUTHORIZED',
        data: { machineId },
        saveToDb: true
      });
      return NextResponse.json({
        success: false,
        message: 'Machine not found or unauthorized',
      }, { status: 404 });
    }
    
    // In a real implementation, this would establish an SSH connection
    // For now, we'll just simulate a successful connection
    
    // Update the connection status
    await prisma.connection.update({
      where: { id: machineId },
      data: {
        status: 'connected',
        lastConnected: new Date(),
        errorMessage: null
      }
    });
    
    // Invalidate cache for machines data
    const cacheKey = `machines_${userId}_${tenantId || 'personal'}`;
    await serverCache.del(cacheKey);
    
    logger.info('Successfully connected to machine', { 
      userId: userId, 
      tenantId: tenantId,
      connectionId: machineId,
      action: 'MACHINE_CONNECT_SUCCESS',
      data: { machineId, ip },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: true,
      message: 'Connection established successfully',
    });
  } catch (error) {
    logger.error(`Error connecting to machine: ${error instanceof Error ? error.message : String(error)}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'MACHINE_CONNECT_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) },
      saveToDb: true
    });
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
} 