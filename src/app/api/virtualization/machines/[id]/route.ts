import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// DELETE /api/virtualization/machines/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      logger.warn('Unauthorized access attempt to delete machine', { 
        userId: session?.user?.id, 
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'MACHINE_DELETE_UNAUTHORIZED',
        saveToDb: true 
      });
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      }, { status: 401 });
    }
    
    const id = params.id;
    const userId = session.user.id;
    const tenantId = session.user.tenantId;
    
    // Delete the connection
    const deletedConnection = await prisma.connection.delete({
      where: {
        id,
        OR: [
          { userId },
          { tenantId: tenantId || undefined }
        ]
      }
    });
    
    if (!deletedConnection) {
      logger.warn('Machine not found or unauthorized', { 
        userId: userId, 
        tenantId: tenantId,
        action: 'MACHINE_DELETE_NOT_FOUND',
        data: { id },
        saveToDb: true
      });
      return NextResponse.json({
        success: false,
        message: 'Machine not found',
      }, { status: 404 });
    }
    
    logger.info('Successfully deleted machine', { 
      userId: userId, 
      tenantId: tenantId,
      action: 'MACHINE_DELETE_SUCCESS',
      data: { id },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: true,
      message: 'Machine deleted successfully',
    });
  } catch (error) {
    logger.error(`Error deleting machine: ${error instanceof Error ? error.message : String(error)}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'MACHINE_DELETE_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) },
      saveToDb: true
    });
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
}

// PATCH /api/virtualization/machines/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      logger.warn('Unauthorized access attempt to update machine', { 
        userId: session?.user?.id, 
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'MACHINE_UPDATE_UNAUTHORIZED',
        saveToDb: true 
      });
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      }, { status: 401 });
    }
    
    const id = params.id;
    const userId = session.user.id;
    const tenantId = session.user.tenantId;
    const body = await request.json();
    
    // Update the connection
    const updatedConnection = await prisma.connection.update({
      where: {
        id,
        OR: [
          { userId },
          { tenantId: tenantId || undefined }
        ]
      },
      data: {
        status: body.status,
        lastConnected: body.lastConnected ? new Date(body.lastConnected) : undefined,
        errorMessage: body.errorMessage
      }
    });
    
    if (!updatedConnection) {
      logger.warn('Machine not found or unauthorized', { 
        userId: userId, 
        tenantId: tenantId,
        action: 'MACHINE_UPDATE_NOT_FOUND',
        data: { id },
        saveToDb: true
      });
      return NextResponse.json({
        success: false,
        message: 'Machine not found',
      }, { status: 404 });
    }
    
    // Map to expected format
    const machine = {
      id: updatedConnection.id,
      name: updatedConnection.name,
      description: updatedConnection.description || undefined,
      type: updatedConnection.type,
      ip: updatedConnection.ip,
      port: updatedConnection.port || undefined,
      user: updatedConnection.username || undefined,
      status: updatedConnection.status,
      lastConnected: updatedConnection.lastConnected || undefined,
      errorMessage: updatedConnection.errorMessage || undefined,
      createdAt: updatedConnection.createdAt,
      updatedAt: updatedConnection.updatedAt
    };
    
    logger.info('Successfully updated machine', { 
      userId: userId, 
      tenantId: tenantId,
      action: 'MACHINE_UPDATE_SUCCESS',
      data: { id },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: true,
      data: machine,
    });
  } catch (error) {
    logger.error(`Error updating machine: ${error instanceof Error ? error.message : String(error)}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'MACHINE_UPDATE_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) },
      saveToDb: true
    });
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
} 