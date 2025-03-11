/* eslint-disable */
import db from '@/lib/supabase/db';
import { logger } from '../logger';

class TerminalService {
  private static instance: TerminalService;

  public static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      logger.debug('Creating new TerminalService instance');
      TerminalService.instance = new TerminalService();
    }
    return TerminalService.instance;
  }

  async createTerminalConnection(data: { hostId: string; type: string; username?: string; password?: string }) {
    logger.info('Creating terminal connection', { hostId: data.hostId, type: data.type });
    try {
      logger.debug('Fetching host from database', { hostId: data.hostId });
      const host = await db.host.findUnique({ where: { id: data.hostId } });
      if (!host) {
        logger.error('Host not found', { hostId: data.hostId });
        throw new Error(`Host not found: ${data.hostId}`);
      }
      logger.debug('Host found', { hostId: data.hostId, ip: host.ip });

      logger.debug('Inserting new connection into database', { type: data.type });
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
        logger.error('Failed to create connection record', { hostId: data.hostId });
        throw new Error('Failed to create connection record');
      }

      logger.info('Terminal connection created', { connectionId: connection.id });
      return connection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error creating terminal connection', { error: errorMessage, hostId: data.hostId });
      throw new Error(`Failed to create terminal connection: ${errorMessage}`);
    }
  }

  async getTerminalConnection(id: string) {
    logger.info('Getting terminal connection', { connectionId: id });
    try {
      logger.debug('Querying connection from database', { connectionId: id });
      const connections = await db.query('connections', {
        where: { id },
        include: { host: true },
      });

      const connection = connections[0];
      if (!connection) {
        logger.error('Connection not found', { connectionId: id });
        return null;
      }

      logger.debug('Connection retrieved', { connectionId: id, type: connection.type });
      return connection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting terminal connection', { error: errorMessage, connectionId: id });
      return null;
    }
  }

  async updateTerminalConnectionStatus(id: string, status: string) {
    logger.info('Updating terminal connection status', { connectionId: id, status });
    try {
      logger.debug('Updating connection status in database', { connectionId: id, status });
      const connections = await db.query('connections', {
        where: { id },
        update: { status },
        returning: true,
      });

      const connection = connections[0];
      if (!connection) {
        logger.error('Connection not found for update', { connectionId: id });
        throw new Error(`Connection not found: ${id}`);
      }

      logger.debug('Connection status updated', { connectionId: id, status });
      return connection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating terminal connection status', { error: errorMessage, connectionId: id });
      throw new Error(`Failed to update terminal connection status: ${errorMessage}`);
    }
  }

  async closeTerminalConnection(id: string) {
    logger.info('Closing terminal connection', { connectionId: id });
    try {
      logger.debug('Closing connection in database', { connectionId: id });
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
        logger.error('Connection not found for closure', { connectionId: id });
        throw new Error(`Connection not found: ${id}`);
      }

      logger.debug('Connection closed', { connectionId: id });
      return connection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error closing terminal connection', { error: errorMessage, connectionId: id });
      throw new Error(`Failed to close terminal connection: ${errorMessage}`);
    }
  }

  async getTerminalConnections() {
    logger.info('Getting all terminal connections');
    try {
      logger.debug('Querying all connections from database');
      const connections = await db.query('connections', {
        include: { host: true },
        orderBy: { created_at: 'desc' },
      });

      logger.debug('Retrieved all connections', { count: connections?.length || 0 });
      return connections || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting terminal connections', { error: errorMessage });
      return [];
    }
  }
}

const terminalService = TerminalService.getInstance();
export default terminalService;

export async function getCompatibleConnection(connectionId: string) {
  logger.info('Getting compatible connection', { connectionId });
  try {
    logger.debug('Querying compatible connection from database', { connectionId });
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

    return { ...connection };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error getting compatible connection', { error: errorMessage, connectionId });
    return null;
  }
}