import { prisma } from '../prisma';
import { Client } from 'ssh2';
import { logger } from '../logger';

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
}) {
  try {
    console.log('Calling prisma.host.create with data:', { ...data, password: '***' });
    const host = await prisma.host.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        ip: data.ip,
        port: data.port || (data.type === 'ssh' ? 22 : null),
        user: data.type === 'ssh' ? data.user : null,
        password: data.type === 'ssh' ? data.password : null,
        status: 'pending',
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

    if (data.type === 'ssh') {
      return new Promise((resolve) => {
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
      return { success: false, message: 'Docker connection test not implemented yet' };
    } else if (data.type === 'portainer') {
      // TODO: Implement Portainer connection test
      return { success: false, message: 'Portainer connection test not implemented yet' };
    }

    return { success: false, message: 'Unsupported connection type' };
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error testing connection:', { error: error.message });
    }
    throw error;
  }
}
