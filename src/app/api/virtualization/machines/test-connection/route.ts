import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { Client } from 'ssh2';

// POST /api/virtualization/machines/test-connection
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      logger.warn('Unauthorized access attempt to test connection endpoint', { 
        userId: session?.user?.id, 
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'TEST_CONNECTION_UNAUTHORIZED',
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
    const { type, ip, port, username, password } = body;

    logger.info(`Initiated ${type} connection test`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'TEST_CONNECTION_INITIATED',
      data: { type, ip, port },
      saveToDb: true
    });

    if (!ip) {
      logger.warn('Missing IP address for connection test', { 
        userId: session?.user?.id, 
        tenantId: session?.user?.tenantId,
        action: 'TEST_CONNECTION_MISSING_IP',
        data: { type, ip },
        saveToDb: true
      });
      return NextResponse.json({
        success: false,
        message: 'IP address is required',
      }, { status: 400 });
    }

    // Implement connection testing
    if (type === 'ssh') {
      if (!username || !password) {
        logger.warn('Missing credentials for SSH connection test', { 
          userId: session?.user?.id, 
          tenantId: session?.user?.tenantId,
          action: 'TEST_CONNECTION_MISSING_CREDENTIALS',
          data: { type, ip, port },
          saveToDb: true
        });
        return NextResponse.json({
          success: false,
          message: 'Username and password are required for SSH connections',
        }, { status: 400 });
      }

      return new Promise((resolve) => {
        const conn = new Client();
        let fingerprint: string | null = null;

        conn.on('handshake', (details) => {
          fingerprint = details.hash;
          logger.debug('SSH: Handshake complete', { 
            userId: session?.user?.id,
            action: 'SSH_HANDSHAKE_COMPLETE',
            data: { ip, port, fingerprint }
          });
        });

        conn.on('ready', () => {
          logger.info(`Successfully connected to ${ip} via SSH`, { 
            userId: session?.user?.id, 
            tenantId: session?.user?.tenantId,
            action: 'TEST_CONNECTION_SUCCESS',
            data: { type, ip, port, fingerprint },
            saveToDb: true
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
            userId: session?.user?.id, 
            tenantId: session?.user?.tenantId,
            action: 'TEST_CONNECTION_ERROR',
            data: { type, ip, port, error: err.message },
            saveToDb: true
          });
          
          resolve(NextResponse.json({
            success: false,
            message: err.message
          }, { status: 400 }));
        });

        logger.info(`Attempting SSH connection to ${ip}:${port || 22}`, { 
          userId: session?.user?.id, 
          tenantId: session?.user?.tenantId,
          action: 'SSH_CONNECTION_ATTEMPT',
          data: { ip, port, username },
          saveToDb: true
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
    } else if (type === 'docker') {
      // Docker connection validation
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
            userId: session?.user?.id, 
            tenantId: session?.user?.tenantId,
            action: 'TEST_CONNECTION_DOCKER_FAILED',
            data: { type, ip, port, status: response.status },
            saveToDb: true
          });
          
          return NextResponse.json({
            success: false,
            message: `Docker API not available: ${response.statusText}`,
          }, { status: 400 });
        }
        
        const data = await response.json();
        
        logger.info(`Successfully connected to Docker API at ${ip}:${dockerPort}`, { 
          userId: session?.user?.id, 
          tenantId: session?.user?.tenantId,
          action: 'TEST_CONNECTION_SUCCESS',
          data: { type, ip, port, version: data.Version },
          saveToDb: true
        });
        
        return NextResponse.json({
          success: true,
          message: 'Connection successful',
          version: data.Version
        });
      } catch (error) {
        logger.error(`Docker API connection error: ${error.message}`, { 
          userId: session?.user?.id, 
          tenantId: session?.user?.tenantId,
          action: 'TEST_CONNECTION_ERROR',
          data: { type, ip, port, error: error.message },
          saveToDb: true
        });
        
        return NextResponse.json({
          success: false,
          message: `Docker API not available: ${error.message}`,
        }, { status: 400 });
      }
    } else if (type === 'portainer') {
      // Portainer connection validation
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
              userId: session?.user?.id, 
              tenantId: session?.user?.tenantId,
              action: 'TEST_CONNECTION_PORTAINER_AUTH_FAILED',
              data: { type, ip, port, status: authResponse.status },
              saveToDb: true
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
            userId: session?.user?.id, 
            tenantId: session?.user?.tenantId,
            action: 'TEST_CONNECTION_PORTAINER_FAILED',
            data: { type, ip, port, status: response.status },
            saveToDb: true
          });
          
          return NextResponse.json({
            success: false,
            message: `Portainer API not available: ${response.statusText}`,
          }, { status: 400 });
        }
        
        const data = await response.json();
        
        logger.info(`Successfully connected to Portainer API at ${ip}:${portainerPort}`, { 
          userId: session?.user?.id, 
          tenantId: session?.user?.tenantId,
          action: 'TEST_CONNECTION_SUCCESS',
          data: { type, ip, port, version: data.Version },
          saveToDb: true
        });
        
        return NextResponse.json({
          success: true,
          message: 'Connection successful',
          version: data.Version
        });
      } catch (error) {
        logger.error(`Portainer API connection error: ${error.message}`, { 
          userId: session?.user?.id, 
          tenantId: session?.user?.tenantId,
          action: 'TEST_CONNECTION_ERROR',
          data: { type, ip, port, error: error.message },
          saveToDb: true
        });
        
        return NextResponse.json({
          success: false,
          message: `Portainer API not available: ${error.message}`,
        }, { status: 400 });
      }
    } else {
      logger.error(`Unsupported connection type: ${type}`, { 
        userId: session?.user?.id, 
        tenantId: session?.user?.tenantId,
        action: 'TEST_CONNECTION_UNSUPPORTED_TYPE',
        data: { type },
        saveToDb: true
      });
      return NextResponse.json({
        success: false,
        message: 'Unsupported connection type',
      }, { status: 400 });
    }
  } catch (error) {
    logger.error(`Connection test failed: ${error instanceof Error ? error.message : String(error)}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'TEST_CONNECTION_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: false,
      message: 'Failed to test connection',
    }, { status: 500 });
  }
} 