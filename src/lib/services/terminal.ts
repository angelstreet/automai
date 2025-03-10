/* eslint-disable */
import db from '@/lib/supabase/db';
import { logger } from '../logger';

// Define a TerminalService class to implement singleton pattern
class TerminalService {
  private static instance: TerminalService;

  // Get singleton instance
  public static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      TerminalService.instance = new TerminalService();
    }
    return TerminalService.instance;
  }

  /**
   * Create a new terminal connection
   */
  async createTerminalConnection(data: {
    hostId: string;
    type: string;
    username?: string;
    password?: string;
  }) {
    logger.info('Creating terminal connection', { hostId: data.hostId, type: data.type });

    try {
      // Get host information
      const host = await db.host.findUnique({
        where: { id: data.hostId },
      });

      if (!host) {
        logger.error('Host not found', { hostId: data.hostId });
        throw new Error(`Host not found: ${data.hostId}`);
      }

      // Create connection record using db.query
      const connections = await db.query('connections', {
        insert: {
          type: data.type,
          status: 'pending',
          ip: host.ip,
          port: host.port,
          username: data.username || host.user,
          password: data.password || host.password,
          hostId: host.id,
        },
        returning: true,
      });
      
      const connection = connections[0];
      
      if (!connection) {
        throw new Error('Failed to create connection record');
      }

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
  async getTerminalConnection(id: string) {
    logger.info('Getting terminal connection', { connectionId: id });

    try {
      // Get connection using db.query
      const connections = await db.query('connections', {
        where: { id },
        include: { host: true },
      });
      
      const connection = connections[0];
      
      if (!connection) {
        logger.error('Connection not found', { connectionId: id });
        return null;
      }

      return connection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting terminal connection', { error: errorMessage });
      return null;
    }
  }

  /**
   * Update terminal connection status
   */
  async updateTerminalConnectionStatus(id: string, status: string) {
    logger.info('Updating terminal connection status', { connectionId: id, status });

    try {
      // Update connection using db.query
      const connections = await db.query('connections', {
        where: { id },
        update: { status },
        returning: true,
      });
      
      const connection = connections[0];
      
      if (!connection) {
        throw new Error(`Connection not found: ${id}`);
      }

      return connection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating terminal connection status', { error: errorMessage });
      throw new Error(`Failed to update terminal connection status: ${errorMessage}`);
    }
  }

  /**
   * Close terminal connection
   */
  async closeTerminalConnection(id: string) {
    logger.info('Closing terminal connection', { connectionId: id });

    try {
      // Close connection using db.query
      const connections = await db.query('connections', {
        where: { id },
        update: {
          status: 'closed',
          closedAt: new Date().toISOString(),
        },
        returning: true,
      });
      
      const connection = connections[0];
      
      if (!connection) {
        throw new Error(`Connection not found: ${id}`);
      }

      return connection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error closing terminal connection', { error: errorMessage });
      throw new Error(`Failed to close terminal connection: ${errorMessage}`);
    }
  }

  /**
   * Get all terminal connections
   */
  async getTerminalConnections() {
    logger.info('Getting all terminal connections');

    try {
      // Get connections using db.query
      const connections = await db.query('connections', {
        include: { host: true },
        orderBy: { created_at: 'desc' },
      });

      return connections || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting terminal connections', { error: errorMessage });
      return [];
    }
  }
}

// Export singleton instance
const terminalService = TerminalService.getInstance();
export default terminalService;

/**
 * Alternative fetch terminal connection details with added compatibility fields
 */
export async function getCompatibleConnection(connectionId: string) {
  logger.info('Getting compatible connection', { connectionId });

  // Get connection using db.query
  const connections = await db.query('connections', {
    where: { id: connectionId },
    include: { host: true },
  });
  
  const connection = connections[0];
  
  if (!connection) {
    logger.error('Connection not found', { connectionId });
    return null;
  }

  logger.debug('Connection found', {
    connectionId: connection.id,
    connectionType: connection.type,
    connectionHasHost: !!connection.host,
  });

  // Add missing properties for compatibility
  return {
    ...connection,
    // Add any additional properties needed for compatibility
  };
}
