import { prisma } from '../prisma';
import { logger } from '../logger';

/**
 * Create a new terminal connection
 */
export async function createTerminalConnection(data: {
  hostId: string;
  type: string;
  username?: string;
  password?: string;
}) {
  logger.info('Creating terminal connection', { hostId: data.hostId, type: data.type });
  
  try {
    // Get host information
    const host = await prisma.host.findUnique({
      where: { id: data.hostId }
    });
    
    if (!host) {
      logger.error('Host not found', { hostId: data.hostId });
      throw new Error(`Host not found: ${data.hostId}`);
    }
    
    // Create connection record
    const connection = await prisma.connection.create({
      data: {
        type: data.type,
        status: 'pending',
        ip: host.ip,
        port: host.port,
        username: data.username || host.user,
        password: data.password || host.password,
        hostId: host.id
      }
    });
    
    logger.info('Terminal connection created', { connectionId: connection.id });
    
    return connection;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error creating terminal connection', { error: errorMessage });
    throw new Error(`Failed to create terminal connection: ${errorMessage}`);
  }
}

/**
 * Get terminal connection by ID
 */
export async function getTerminalConnection(id: string) {
  logger.info('Getting terminal connection', { connectionId: id });
  
  try {
    const connection = await prisma.connection.findUnique({
      where: { id }
    });
    
    if (!connection) {
      logger.error('Terminal connection not found', { connectionId: id });
      throw new Error(`Terminal connection not found: ${id}`);
    }
    
    return connection;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error getting terminal connection', { error: errorMessage, connectionId: id });
    throw new Error(`Failed to get terminal connection: ${errorMessage}`);
  }
}

/**
 * Update terminal connection status
 */
export async function updateTerminalConnectionStatus(id: string, status: string) {
  logger.info('Updating terminal connection status', { connectionId: id, status });
  
  try {
    const connection = await prisma.connection.update({
      where: { id },
      data: { status }
    });
    
    return connection;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error updating terminal connection status', { error: errorMessage, connectionId: id });
    throw new Error(`Failed to update terminal connection status: ${errorMessage}`);
  }
}

/**
 * Close terminal connection
 */
export async function closeTerminalConnection(id: string) {
  logger.info('Closing terminal connection', { connectionId: id });
  
  try {
    const connection = await prisma.connection.update({
      where: { id },
      data: { status: 'closed' }
    });
    
    return connection;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error closing terminal connection', { error: errorMessage, connectionId: id });
    throw new Error(`Failed to close terminal connection: ${errorMessage}`);
  }
}

/**
 * Get all terminal connections
 */
export async function getTerminalConnections() {
  logger.info('Getting all terminal connections');
  
  try {
    const connections = await prisma.connection.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    return connections;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error getting terminal connections', { error: errorMessage });
    throw new Error(`Failed to get terminal connections: ${errorMessage}`);
  }
} 