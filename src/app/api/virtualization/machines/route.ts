import { NextResponse } from 'next/server';
import { Machine } from '@/types/virtualization';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Client } from 'ssh2';

async function testConnection(connection: any, userId: string, tenantId?: string): Promise<boolean> {
  try {
    if (connection.type === 'ssh') {
      return new Promise((resolve) => {
        const conn = new Client();
        let timeout: NodeJS.Timeout;
        
        conn.on('ready', () => {
          logger.info(`Successfully tested connection to ${connection.ip}`, { 
            userId,
            tenantId,
            action: 'CONNECTION_TEST_SUCCESS',
            data: { id: connection.id, type: connection.type, ip: connection.ip },
            saveToDb: true
          });
          clearTimeout(timeout);
          conn.end();
          resolve(true);
        });

        conn.on('error', (err) => {
          logger.error(`Connection test failed: ${err.message}`, { 
            userId,
            tenantId,
            action: 'CONNECTION_TEST_ERROR',
            data: { id: connection.id, type: connection.type, ip: connection.ip, error: err.message },
            saveToDb: true
          });
          clearTimeout(timeout);
          conn.end();
          resolve(false);
        });

        conn.on('close', () => {
          clearTimeout(timeout);
          resolve(false);
        });

        // Set timeout to ensure connection is closed
        timeout = setTimeout(() => {
          logger.warn(`Connection test timeout for ${connection.ip}`, {
            userId,
            tenantId,
            action: 'CONNECTION_TEST_TIMEOUT',
            data: { id: connection.id, type: connection.type, ip: connection.ip },
            saveToDb: true
          });
          conn.end();
          resolve(false);
        }, 5000);

        conn.connect({
          host: connection.ip,
          port: connection.port || 22,
          username: connection.username,
          password: connection.password,
          readyTimeout: 5000
        });
      });
    } else if (connection.type === 'docker') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(`http://${connection.ip}:${connection.port || 2375}/version`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        clearTimeout(timeoutId);
        return false;
      }
    } else if (connection.type === 'portainer') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(`http://${connection.ip}:${connection.port || 9000}/api/status`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        clearTimeout(timeoutId);
        return false;
      }
    }
    return false;
  } catch (error) {
    logger.error(`Connection test failed: ${error instanceof Error ? error.message : String(error)}`, { 
      userId,
      tenantId,
      action: 'CONNECTION_TEST_ERROR',
      data: { id: connection.id, type: connection.type, ip: connection.ip },
      saveToDb: true
    });
    return false;
  }
}

// GET /api/virtualization/machines
export async function GET(request: Request) {
  let sessionUser = null;
  let sessionUserId = null;
  let sessionTenantId = null;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      logger.warn('Unauthorized access attempt to machines endpoint', { 
        userId: session?.user?.id, 
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'MACHINES_GET_UNAUTHORIZED',
        saveToDb: true 
      });
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      }, { status: 401 });
    }
    
    sessionUser = session.user;
    sessionUserId = session.user.id;
    sessionTenantId = session.user.tenantId;
    
    const userId = session.user.id;
    const tenantId = session.user.tenantId;
    
    logger.info('Fetching machines', { 
      userId: userId, 
      tenantId: tenantId,
      action: 'MACHINES_GET',
      saveToDb: true
    });
    
    // Get connections for this user or tenant
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { userId },
          { tenantId: tenantId || undefined }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Test each connection and update status
    const updatedConnections = await Promise.all(
      connections.map(async (conn) => {
        const isConnected = await testConnection(conn, userId, tenantId);
        
        // Update connection status in database
        const updated = await prisma.connection.update({
          where: { id: conn.id },
          data: {
            status: isConnected ? 'connected' : 'failed',
            lastConnected: isConnected ? new Date() : conn.lastConnected,
            errorMessage: isConnected ? null : 'Connection failed'
          }
        });
        
        return updated;
      })
    );
    
    logger.debug(`Successfully fetched and tested ${connections.length} connections`, { 
      userId: userId, 
      tenantId: tenantId,
      action: 'MACHINES_GET_SUCCESS',
      data: { count: connections.length },
      saveToDb: true
    });
    
    // Map to expected format
    const machines: Machine[] = updatedConnections.map(conn => ({
      id: conn.id,
      name: conn.name,
      description: conn.description || undefined,
      type: conn.type as 'ssh' | 'docker' | 'portainer',
      ip: conn.ip,
      port: conn.port || undefined,
      user: conn.username || undefined,
      status: conn.status as 'connected' | 'failed' | 'pending',
      lastConnected: conn.lastConnected || undefined,
      errorMessage: conn.errorMessage || undefined,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt
    }));
    
    return NextResponse.json({
      success: true,
      data: machines,
    });
  } catch (error) {
    logger.error(`Error fetching machines: ${error instanceof Error ? error.message : String(error)}`, { 
      userId: sessionUserId, 
      tenantId: sessionTenantId,
      action: 'MACHINES_GET_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch connections',
    }, { status: 500 });
  }
}

// POST /api/virtualization/machines
export async function POST(request: Request) {
  let sessionUser = null;
  let sessionUserId = null;
  let sessionTenantId = null;
  let requestBody = null;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      logger.warn('Unauthorized access attempt to create machine', { 
        userId: session?.user?.id, 
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'MACHINE_CREATE_UNAUTHORIZED',
        saveToDb: true 
      });
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      }, { status: 401 });
    }
    
    sessionUser = session.user;
    sessionUserId = session.user.id;
    sessionTenantId = session.user.tenantId;
    
    const userId = session.user.id;
    const tenantId = session.user.tenantId;
    
    const body = await request.json();
    requestBody = body;
    const { name, description, type, ip, port, username, password, status, statusLabel } = body;
    
    logger.info('Creating new machine connection', { 
      userId: userId, 
      tenantId: tenantId,
      action: 'MACHINE_CREATE',
      data: { name, type, ip, port },
      saveToDb: true
    });
    
    if (!name || !type || !ip) {
      logger.warn('Missing required fields for machine creation', { 
        userId: userId, 
        tenantId: tenantId,
        action: 'MACHINE_CREATE_MISSING_FIELDS',
        data: { name, type, ip },
        saveToDb: true
      });
      
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: name, type, and ip are required',
      }, { status: 400 });
    }
    
    // Create connection in database
    const connection = await prisma.connection.create({
      data: {
        name,
        description,
        type,
        ip,
        port: port ? Number(port) : undefined,
        username,
        password,
        status: status || 'connected',
        lastConnected: new Date(),
        userId,
        tenantId: tenantId || undefined
      }
    });
    
    logger.info('Successfully created machine connection', { 
      userId: userId, 
      tenantId: tenantId,
      action: 'MACHINE_CREATE_SUCCESS',
      connectionId: connection.id,
      data: { id: connection.id, name, type, ip, port, status: 'connected' },
      saveToDb: true
    });
    
    // Map to expected format
    const machine: Machine = {
      id: connection.id,
      name: connection.name,
      description: connection.description || undefined,
      type: connection.type as 'ssh' | 'docker' | 'portainer',
      ip: connection.ip,
      port: connection.port || undefined,
      user: connection.username || undefined,
      status: connection.status as 'connected' | 'failed' | 'pending',
      lastConnected: connection.lastConnected || undefined,
      errorMessage: connection.errorMessage || undefined,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt
    };
    
    return NextResponse.json({
      success: true,
      data: machine,
    }, { status: 201 });
  } catch (error) {
    logger.error(`Error creating machine connection: ${error instanceof Error ? error.message : String(error)}`, { 
      userId: sessionUserId, 
      tenantId: sessionTenantId,
      action: 'MACHINE_CREATE_ERROR',
      data: { 
        error: error instanceof Error ? error.message : String(error),
        ...(requestBody ? {
          name: requestBody.name,
          type: requestBody.type,
          ip: requestBody.ip,
          port: requestBody.port
        } : {})
      },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: false,
      message: 'Failed to create connection',
    }, { status: 500 });
  }
} 