import { prisma } from '../prisma';

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
