/* eslint-disable */
import db from '@/lib/supabase/db';
import { logger } from '../logger';

// Define a TerminalService class to implement singleton pattern
class TerminalService {
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

      // Create connection record
      const connection = await db.connection.create({
        data: {
          type: data.type,
          status: 'pending',
          ip: host.ip,
          port: host.port,
          username: data.username || host.user,
          password: data.password || host.password,
          hostId: host.id,
        },
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
  async getTerminalConnection(id: string) {
    logger.info('Getting terminal connection', { connectionId: id });

    try {
      const connection = await db.connection.findUnique({
        where: { id },
        include: {
          host: true,
        },
      });

      if (!connection) {
        logger.error('Connection not found', { connectionId: id });
        throw new Error(`Connection not found: ${id}`);
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
  async updateTerminalConnectionStatus(id: string, status: string) {
    logger.info('Updating terminal connection status', { connectionId: id, status });

    try {
      const connection = await db.connection.update({
        where: { id },
        data: {
          status,
          updatedAt: new Date(),
        },
      });

      logger.info('Terminal connection status updated', { connectionId: id, status });

      return connection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating terminal connection status', {
        error: errorMessage,
        connectionId: id,
      });
      throw new Error(`Failed to update terminal connection status: ${errorMessage}`);
    }
  }

  /**
   * Close terminal connection
   */
  async closeTerminalConnection(id: string) {
    logger.info('Closing terminal connection', { connectionId: id });

    try {
      const connection = await db.connection.update({
        where: { id },
        data: {
          status: 'closed',
          updatedAt: new Date(),
        },
      });

      logger.info('Terminal connection closed', { connectionId: id });

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
  async getTerminalConnections() {
    logger.info('Getting all terminal connections');

    try {
      const connections = await db.connection.findMany({
        include: {
          host: true,
        },
      });

      return connections;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting terminal connections', { error: errorMessage });
      throw new Error(`Failed to get terminal connections: ${errorMessage}`);
    }
  }
}

// Define global type for TerminalService singleton
declare global {
  var terminalService: TerminalService | undefined;
}

// Create singleton instance
const terminalService = global.terminalService || new TerminalService();

// Store in global for singleton pattern in development
if (process.env.NODE_ENV !== 'production') {
  global.terminalService = terminalService;
}

// Export singleton instance methods
export const {
  createTerminalConnection,
  getTerminalConnection,
  updateTerminalConnectionStatus,
  closeTerminalConnection,
  getTerminalConnections,
} = terminalService;

/**
 * Alternative fetch terminal connection details with added compatibility fields
 */
export async function getCompatibleConnection(connectionId: string) {
  try {
    logger.info('Getting compatible connection', { connectionId });

    const connection = await db.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      logger.error('Terminal connection not found', { connectionId });
      return null;
    }

    logger.info('Connection found in database', {
      connectionId,
      connectionType: connection.type,
      connectionHasHost: !!connection.host,
      connectionHasIp: !!(_connection as any).ip,
    });

    // Add missing properties for compatibility
    const compatibleConnection = {
      ...connection,
      ip: connection.host, // Map host to ip for backward compatibility
      type: connection.type || 'ssh', // Default type for connections
    };

    logger.info('Returning compatible connection', {
      connectionId,
      host: compatibleConnection.host,
      ip: compatibleConnection.ip,
      type: compatibleConnection.type,
    });

    return compatibleConnection;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error fetching terminal connection', {
      error: errorMessage,
      connectionId,
    });
    return null;
  }
}
