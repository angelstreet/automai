/* eslint-disable */
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
      // Return a simple connection object without database interaction
      const connection = {
        id: `term_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type: data.type,
        status: 'pending',
        username: data.username,
        password: data.password,
        hostId: data.hostId,
      };

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

    // This is now a no-op since we're not using the database
    // Just log the request and return null
    logger.info('Terminal connection request received', { connectionId: id });
    return null;
  }

  /**
   * Update terminal connection status
   */
  async updateTerminalConnectionStatus(id: string, status: string) {
    logger.info('Updating terminal connection status', { connectionId: id, status });

    // This is now a no-op since we're not using the database
    // Just log the status update
    logger.info('Terminal connection status updated', { connectionId: id, status });
    return null;
  }

  /**
   * Close terminal connection
   */
  async closeTerminalConnection(id: string) {
    logger.info('Closing terminal connection', { connectionId: id });

    // This is now a no-op since we're not using the database
    // Just log the closure
    logger.info('Terminal connection closed', { connectionId: id });
    return null;
  }

  /**
   * Get all terminal connections
   */
  async getTerminalConnections() {
    logger.info('Getting all terminal connections');

    // This is now a no-op since we're not using the database
    // Just log the request and return an empty array
    return [];
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
    
    // This is now a no-op since we're not using the database
    // Just log the request and return null
    logger.info('Compatible connection request received', { connectionId });
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error fetching terminal connection', { 
      error: errorMessage,
      connectionId
    });
    return null;
  }
}
