import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { Client } from 'ssh2';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { serverCache } from '@/lib/cache';

// POST /api/virtualization/machines/test-connection
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      logger.warn('Unauthorized access attempt to test connection', { 
        userId: session?.user?.id, 
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'TEST_CONNECTION_UNAUTHORIZED'
      });
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      }, { status: 401 });
    }
    
    const userId = session.user.id;
    const tenantId = session.user.tenantId;
    
    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const validationResult = testConnectionSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn('Invalid connection test request', { 
        userId,
        tenantId: tenantId || undefined,
        action: 'TEST_CONNECTION_INVALID',
        data: { errors: validationResult.error.format() }
      });
      return NextResponse.json({
        success: false,
        message: 'Invalid request',
        errors: validationResult.error.format()
      }, { status: 400 });
    }
    
    const { type, ip, port, username, password, apiKey, machineId } = validationResult.data;
    
    // If password not provided, try to get from database
    let connectionPassword = password;
    if (!connectionPassword) {
      // Find existing connection with same details to get password
      const existingConnection = await prisma.connection.findFirst({
        where: {
          type,
          ip,
          port: port || undefined,
          username: username || undefined,
          OR: [
            { userId },
            { tenantId: tenantId || undefined }
          ]
        },
        select: {
          password: true
        }
      });
      
      if (existingConnection?.password) {
        connectionPassword = existingConnection.password;
      }
    }
    
    // Test connection based on type
    try {
      // Add user context to request body for logging
      const requestWithContext = {
        ...validationResult.data,
        userId,
        tenantId,
        password: connectionPassword
      };
      
      let testResult: any;
      
      if (type === 'ssh') {
        testResult = await testSshConnection(requestWithContext);
      } else if (type === 'docker') {
        testResult = await testDockerConnection(requestWithContext);
      } else if (type === 'portainer') {
        testResult = await testPortainerConnection(requestWithContext);
      } else {
        throw new Error(`Unsupported connection type: ${type}`);
      }
      
      // If machineId is provided, update the machine status
      if (machineId) {
        try {
          // Clear cache for machines
          serverCache.delete(`machines_${userId}_${tenantId || 'personal'}`);
          
          // Update machine status
          await prisma.connection.update({
            where: {
              id: machineId,
              OR: [
                { userId },
                { tenantId: tenantId || undefined }
              ]
            },
            data: {
              status: testResult.success ? 'connected' : 'failed',
              lastConnected: testResult.success ? new Date() : undefined,
              errorMessage: testResult.success ? null : testResult.message
            }
          });
        } catch (updateError) {
          logger.error(`Error updating machine status: ${updateError instanceof Error ? updateError.message : String(updateError)}`, {
            userId,
            tenantId: tenantId || undefined,
            action: 'TEST_CONNECTION_UPDATE_ERROR',
            data: { machineId, error: updateError instanceof Error ? updateError.message : String(updateError) }
          });
          // Continue with the response even if update fails
        }
      }
      
      return testResult;
    } catch (testError: any) {
      // Handle SSH fingerprint verification
      if (testError.needsFingerprint) {
        logger.info(`SSH host key verification required for ${ip}`, { 
          userId,
          tenantId: tenantId || undefined,
          action: 'SSH_FINGERPRINT_REQUIRED',
          data: { ip, port, fingerprint: testError.fingerprint }
        });
        
        return NextResponse.json({
          success: false,
          message: 'Host key verification required',
          fingerprint: testError.fingerprint
        }, { status: 428 }); // Precondition Required
      }
      
      logger.error(`Error testing connection: ${testError.message || JSON.stringify(testError)}`, { 
        userId,
        tenantId: tenantId || undefined,
        action: 'TEST_CONNECTION_ERROR',
        data: { 
          type, 
          ip, 
          port,
          error: testError.message || JSON.stringify(testError)
        }
      });
      
      // If machineId is provided, update the machine status to failed
      if (machineId) {
        try {
          // Clear cache for machines
          serverCache.delete(`machines_${userId}_${tenantId || 'personal'}`);
          
          // Update machine status
          await prisma.connection.update({
            where: {
              id: machineId,
              OR: [
                { userId },
                { tenantId: tenantId || undefined }
              ]
            },
            data: {
              status: 'failed',
              errorMessage: testError.message || 'Failed to test connection'
            }
          });
        } catch (updateError) {
          // Log but continue
          logger.error(`Error updating machine status: ${updateError instanceof Error ? updateError.message : String(updateError)}`, {
            userId,
            tenantId: tenantId || undefined,
            action: 'TEST_CONNECTION_UPDATE_ERROR',
            data: { machineId, error: updateError instanceof Error ? updateError.message : String(updateError) }
          });
        }
      }
      
      return NextResponse.json({
        success: false,
        message: testError.message || 'Failed to test connection'
      }, { status: 500 });
    }
  } catch (error) {
    logger.error(`Error in test connection endpoint: ${error instanceof Error ? error.message : String(error)}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'TEST_CONNECTION_ENDPOINT_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) }
    });
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
}

// Update the validation schema to include machineId
const testConnectionSchema = z.object({
  type: z.enum(['ssh', 'docker', 'portainer']),
  ip: z.string().min(1, 'IP address is required'),
  port: z.number().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  apiKey: z.string().optional(),
  machineId: z.string().optional() // Add machineId to schema
});

// Implementation of the connection testing functions
async function testSshConnection(request: any) {
  const { ip, port, username, password, userId, tenantId } = request;
  
  if (!username || !password) {
    logger.warn('Missing credentials for SSH connection test', { 
      userId, 
      tenantId: tenantId || undefined,
      action: 'TEST_CONNECTION_MISSING_CREDENTIALS',
      data: { ip, port }
    });
    return NextResponse.json({
      success: false,
      message: 'Username and password are required for SSH connections',
    }, { status: 400 });
  }

  return new Promise((resolve) => {
    const conn = new Client();
    let fingerprint: string | null = null;

    conn.on('handshake', (details: any) => {
      fingerprint = details.hash;
      logger.debug('SSH: Handshake complete', { 
        userId,
        action: 'SSH_HANDSHAKE_COMPLETE',
        data: { ip, port, fingerprint }
      });
    });

    conn.on('ready', () => {
      logger.info(`Successfully connected to ${ip} via SSH`, { 
        userId, 
        tenantId: tenantId || undefined,
        action: 'TEST_CONNECTION_SUCCESS',
        data: { type: 'ssh', ip, port, fingerprint }
      });
      
      conn.end();
      resolve(NextResponse.json({
        success: true,
        message: 'Connection successful',
        fingerprint
      }));
    });

    conn.on('error', (err) => {
      logger.error(`SSH connection error: ${err.message}`, { 
        userId, 
        tenantId: tenantId || undefined,
        action: 'TEST_CONNECTION_ERROR',
        data: { type: 'ssh', ip, port, error: err.message }
      });
      
      resolve(NextResponse.json({
        success: false,
        message: err.message
      }, { status: 400 }));
    });

    logger.info(`Attempting SSH connection to ${ip}:${port || 22}`, { 
      userId, 
      tenantId: tenantId || undefined,
      action: 'SSH_CONNECTION_ATTEMPT',
      data: { ip, port, username }
    });

    conn.connect({
      host: ip,
      port: port ? Number(port) : 22,
      username,
      password,
      readyTimeout: 5000,
      algorithms: {
        kex: [
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
          'diffie-hellman-group-exchange-sha256',
          'diffie-hellman-group14-sha1'
        ],
        cipher: [
          'aes128-ctr',
          'aes192-ctr',
          'aes256-ctr',
          'aes128-gcm',
          'aes256-gcm'
        ],
        serverHostKey: [
          'ssh-rsa',
          'ecdsa-sha2-nistp256',
          'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521'
        ],
        hmac: [
          'hmac-sha2-256',
          'hmac-sha2-512',
          'hmac-sha1'
        ]
      }
    });
  });
}

async function testDockerConnection(request: any) {
  const { ip, port, userId, tenantId } = request;
  const dockerPort = port || 2375;
  
  try {
    // Use fetch to test the Docker API connection
    const response = await fetch(`http://${ip}:${dockerPort}/version`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Set a timeout for the request
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      logger.warn(`Docker API connection failed: ${response.statusText}`, { 
        userId, 
        tenantId: tenantId || undefined,
        action: 'TEST_CONNECTION_DOCKER_FAILED',
        data: { type: 'docker', ip, port, status: response.status }
      });
      
      return NextResponse.json({
        success: false,
        message: `Docker API not available: ${response.statusText}`,
      }, { status: 400 });
    }
    
    const data = await response.json();
    
    logger.info(`Successfully connected to Docker API at ${ip}:${dockerPort}`, { 
      userId, 
      tenantId: tenantId || undefined,
      action: 'TEST_CONNECTION_SUCCESS',
      data: { type: 'docker', ip, port, version: data.Version }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Connection successful',
      version: data.Version
    });
  } catch (error: any) {
    logger.error(`Docker API connection error: ${error.message}`, { 
      userId, 
      tenantId: tenantId || undefined,
      action: 'TEST_CONNECTION_ERROR',
      data: { type: 'docker', ip, port, error: error.message }
    });
    
    return NextResponse.json({
      success: false,
      message: `Docker API not available: ${error.message}`,
    }, { status: 400 });
  }
}

async function testPortainerConnection(request: any) {
  const { ip, port, username, password, userId, tenantId } = request;
  const portainerPort = port || 9000;
  
  try {
    // First, try to authenticate with Portainer if credentials are provided
    let authToken = null;
    
    if (username && password) {
      const authResponse = await fetch(`http://${ip}:${portainerPort}/api/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password
        }),
        // Set a timeout for the request
        signal: AbortSignal.timeout(5000),
      });
      
      if (!authResponse.ok) {
        logger.warn(`Portainer authentication failed: ${authResponse.statusText}`, { 
          userId, 
          tenantId: tenantId || undefined,
          action: 'TEST_CONNECTION_PORTAINER_AUTH_FAILED',
          data: { type: 'portainer', ip, port, status: authResponse.status }
        });
        
        return NextResponse.json({
          success: false,
          message: `Invalid Portainer credentials: ${authResponse.statusText}`,
        }, { status: 400 });
      }
      
      const authData = await authResponse.json();
      authToken = authData.jwt;
    }
    
    // Now check if we can access the Portainer API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`http://${ip}:${portainerPort}/api/status`, {
      method: 'GET',
      headers,
      // Set a timeout for the request
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      logger.warn(`Portainer API connection failed: ${response.statusText}`, { 
        userId, 
        tenantId: tenantId || undefined,
        action: 'TEST_CONNECTION_PORTAINER_FAILED',
        data: { type: 'portainer', ip, port, status: response.status }
      });
      
      return NextResponse.json({
        success: false,
        message: `Portainer API not available: ${response.statusText}`,
      }, { status: 400 });
    }
    
    const data = await response.json();
    
    logger.info(`Successfully connected to Portainer API at ${ip}:${portainerPort}`, { 
      userId, 
      tenantId: tenantId || undefined,
      action: 'TEST_CONNECTION_SUCCESS',
      data: { type: 'portainer', ip, port, version: data.Version }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Connection successful',
      version: data.Version
    });
  } catch (error: any) {
    logger.error(`Portainer API connection error: ${error.message}`, { 
      userId, 
      tenantId: tenantId || undefined,
      action: 'TEST_CONNECTION_ERROR',
      data: { type: 'portainer', ip, port, error: error.message }
    });
    
    return NextResponse.json({
      success: false,
      message: `Portainer API not available: ${error.message}`,
    }, { status: 400 });
  }
} 