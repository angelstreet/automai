import { prisma } from '../prisma';
import { Client } from 'ssh2';
import { logger } from '../logger';

/**
 * Connection test result interface
 */
interface ConnectionTestResult {
  success: boolean;
  message?: string;
  fingerprint?: string;
  fingerprintVerified?: boolean;
}

/**
 * @fileoverview Host Service Layer Implementation
 * 
 * ⚠️ DO NOT MODIFY THIS FILE ⚠️
 * This file contains the core host service implementations.
 * Any changes should be carefully reviewed and approved.
 * 
 * Last validated: 2024-03-21
 * Implements:
 * - Proper error handling
 * - Prisma client usage
 * - Logging
 * - Type safety
 */

/**
 * Get all hosts ordered by creation date
 */
export async function getHosts() {
  try {
    console.log('Calling prisma.host.findMany...');
    const hosts = await prisma.host.findMany({
      orderBy: { createdAt: 'desc' },
    });
    console.log('Prisma returned hosts successfully');
    return hosts;
  } catch (error) {
    console.error('Error in getHosts service:', error);
    throw error;
  }
}

/**
 * Get a single host by ID
 */
export async function getHostById(id: string) {
  try {
    return await prisma.host.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error(`Error in getHostById service for id ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new host
 */
export async function createHost(data: {
  name: string;
  description?: string;
  type: string;
  ip: string;
  port?: number;
  user?: string;
  password?: string;
  status?: string; // Allow status to be passed in
}) {
  try {
    console.log('Calling prisma.host.create with data:', { ...data, password: '***' });
    
    // Use the provided status or default to 'pending'
    const status = data.status || 'pending';
    
    const host = await prisma.host.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        ip: data.ip,
        port: data.port || (data.type === 'ssh' ? 22 : null),
        user: data.type === 'ssh' ? data.user : null,
        password: data.type === 'ssh' ? data.password : null,
        status: status,
      },
    });
    console.log('Prisma created host successfully');
    // Log host without password
    const safeHost = { ...host, password: '***' };
    console.log('Host created successfully:', safeHost);
    return host;
  } catch (error) {
    console.error('Error in createHost service:', error);
    throw error;
  }
}

/**
 * Delete a host by ID
 */
export async function deleteHost(id: string) {
  try {
    return await prisma.host.delete({
      where: { id },
    });
  } catch (error) {
    console.error(`Error in deleteHost service for id ${id}:`, error);
    throw error;
  }
}

/**
 * Test connection to a host
 */
export async function testHostConnection(data: {
  type: string;
  ip: string;
  port?: number;
  username?: string;
  password?: string;
  hostId?: string;
}) {
  try {
    logger.info('Testing host connection', { ...data, password: '***' });

    let result: ConnectionTestResult;
    
    if (data.type === 'ssh') {
      result = await new Promise<ConnectionTestResult>((resolve) => {
        const conn = new Client();
        let resolved = false;

        // Set connection timeout
        const timeout = setTimeout(() => {
          if (!resolved) {
            conn.end();
            resolved = true;
            resolve({ success: false, message: 'Connection timed out' });
          }
        }, 5000);

        conn.on('ready', () => {
          clearTimeout(timeout);
          if (!resolved) {
            conn.end();
            resolved = true;
            resolve({ success: true });
          }
        });

        conn.on('error', (err) => {
          clearTimeout(timeout);
          if (!resolved) {
            resolved = true;
            if (err.message.includes('All configured authentication methods failed')) {
              resolve({ success: false, message: 'Authentication failed' });
            } else {
              resolve({ success: false, message: err.message });
            }
          }
        });

        // Try to connect
        conn.connect({
          host: data.ip,
          port: data.port || 22,
          username: data.username,
          password: data.password,
          readyTimeout: 5000,
        });
      });
    } else if (data.type === 'docker') {
      // TODO: Implement Docker connection test
      result = { success: false, message: 'Docker connection test not implemented yet' };
    } else if (data.type === 'portainer') {
      // TODO: Implement Portainer connection test
      result = { success: false, message: 'Portainer connection test not implemented yet' };
    } else {
      result = { success: false, message: 'Unsupported connection type' };
    }
    
    // Update host status in database if hostId is provided
    if (data.hostId) {
      try {
        await prisma.host.update({
          where: { id: data.hostId },
          data: {
            status: result.success ? 'connected' : 'failed',
            // Only update fields that exist in Prisma schema
            ...(result.success ? { errorMessage: null } : {}),
            ...(!result.success && result.message ? { errorMessage: result.message } : {})
          },
        });
        logger.info(`Updated host status for ${data.hostId} to ${result.success ? 'connected' : 'failed'}`);
      } catch (dbError) {
        logger.error('Failed to update host status in database:', { error: dbError instanceof Error ? dbError.message : String(dbError) });
        // Don't throw here, we still want to return the connection test result
      }
    }
    
    return result;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error testing connection:', { error: error.message });
    }
    throw error;
  }
}
