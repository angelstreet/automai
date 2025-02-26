import { NextResponse } from 'next/server';
import { Machine } from '@/types/virtualization';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Client } from 'ssh2';

async function testConnection(connection: any, userId: string, tenantId?: string): Promise<{success: boolean, error?: string}> {
  if (connection.type === 'ssh') {
    return new Promise((resolve) => {
      const conn = new Client();
      let timeout: NodeJS.Timeout;

      conn.on('ready', () => {
        clearTimeout(timeout);
        conn.end();
        resolve({ success: true });
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
        conn.end();
        resolve({ success: false, error: err.message });
      });

      timeout = setTimeout(() => {
        conn.end();
        resolve({ success: false, error: 'Connection timed out' });
      }, 5000);

      conn.connect({
        host: connection.ip,
        port: connection.port || 22,
        username: connection.username,
        password: connection.password,
        readyTimeout: 5000,
        tryKeyboard: false,
        keepaliveInterval: 0,
        reconnect: false,
        debug: false,
        algorithms: {
          kex: ['curve25519-sha256@libssh.org']
        }
      });
    });
  }
  
  if (connection.type === 'docker') {
    try {
      const response = await fetch(`http://${connection.ip}:${connection.port || 2375}/version`);
      return { success: response.ok };
    } catch (error) {
      return { success: false, error: 'Failed to connect to Docker daemon' };
    }
  }
  
  if (connection.type === 'portainer') {
    try {
      const response = await fetch(`http://${connection.ip}:${connection.port || 9000}/api/status`);
      return { success: response.ok };
    } catch (error) {
      return { success: false, error: 'Failed to connect to Portainer' };
    }
  }
  
  return { success: false, error: 'Invalid connection type' };
}

// GET /api/virtualization/machines
export async function GET(request: Request) {
  try {
    // Single request for user info
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const { id: userId, tenantId } = session.user;
    
    // Single request for all connections
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { userId },
          { tenantId: tenantId || undefined }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    // Test connections in parallel without additional DB queries
    const connectionResults = await Promise.all(
      connections.map(async (conn) => {
        const { success, error } = await testConnection(conn, userId, tenantId);
        
        // Return the connection with updated status
        return {
          ...conn,
          status: success ? 'connected' : 'failed',
          lastConnected: success ? new Date() : conn.lastConnected,
          errorMessage: success ? null : error
        };
      })
    );

    // Single batch update for all connections
    if (connectionResults.length > 0) {
      await prisma.$transaction(
        connectionResults.map(conn => 
          prisma.connection.update({
            where: { id: conn.id },
            data: {
              status: conn.status,
              lastConnected: conn.lastConnected,
              errorMessage: conn.errorMessage
            }
          })
        )
      );
    }

    // Map to response format without additional queries
    const machines: Machine[] = connectionResults.map(conn => ({
      id: conn.id,
      name: conn.name,
      description: conn.description || undefined,
      type: conn.type as 'ssh' | 'docker' | 'portainer',
      ip: conn.ip,
      port: conn.port ? Number(conn.port) : undefined,
      user: conn.username || undefined,
      status: conn.status as 'connected' | 'failed' | 'pending',
      lastConnected: conn.lastConnected || undefined,
      errorMessage: conn.errorMessage || undefined,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt
    }));

    return NextResponse.json({ success: true, data: machines });
  } catch (error) {
    logger.error(`Error fetching connections: ${error instanceof Error ? error.message : String(error)}`);
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