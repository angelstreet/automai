/* eslint-disable */
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
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
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);
      
      // Get host information
      const { data: host, error: hostError } = await supabase
        .from('hosts')
        .select('*')
        .eq('id', data.hostId)
        .single();

      if (hostError || !host) {
        logger.error('Host not found', { hostId: data.hostId, error: hostError?.message });
        throw new Error(`Host not found: ${data.hostId}`);
      }

      // Create connection record
      const { data: connection, error: connectionError } = await supabase
        .from('connections')
        .insert({
          type: data.type,
          status: 'pending',
          ip: host.ip,
          port: host.port,
          username: data.username || host.user,
          password: data.password || host.password,
          hostId: host.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select()
        .single();

      if (connectionError) {
        logger.error('Error creating connection', { error: connectionError.message });
        throw new Error(`Failed to create connection: ${connectionError.message}`);
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
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);
      
      const { data: connection, error } = await supabase
        .from('connections')
        .select('*, host:hosts(*)')
        .eq('id', id)
        .single();

      if (error || !connection) {
        logger.error('Connection not found', { connectionId: id, error: error?.message });
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
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);
      
      const { data: connection, error } = await supabase
        .from('connections')
        .update({
          status,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating connection status', { error: error.message });
        throw new Error(`Failed to update connection status: ${error.message}`);
      }

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
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);
      
      const { data: connection, error } = await supabase
        .from('connections')
        .update({
          status: 'closed',
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error closing connection', { error: error.message });
        throw new Error(`Failed to close connection: ${error.message}`);
      }

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
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);
      
      const { data: connections, error } = await supabase
        .from('connections')
        .select('*, host:hosts(*)')
        .order('createdAt', { ascending: false });

      if (error) {
        logger.error('Error getting connections', { error: error.message });
        throw new Error(`Failed to get connections: ${error.message}`);
      }

      return connections || [];
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

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: connection, error } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error || !connection) {
      logger.error('Terminal connection not found', { connectionId, error: error?.message });
      return null;
    }

    logger.info('Connection found in database', {
      connectionId,
      connectionType: connection.type,
      connectionHasHost: !!connection.host,
      connectionHasIp: !!(connection as any).ip,
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
