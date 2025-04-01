/* eslint-disable */
import db from '@/lib/supabase/db';
import { logUtils } from '../utils/logUtils';

class TerminalService {
  private static instance: TerminalService;

  public static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      console.debug('Creating new TerminalService instance');
      TerminalService.instance = new TerminalService();
    }
    return TerminalService.instance;
  }

  async createTerminalConnection(data: {
    hostId: string;
    type: string;
    username?: string;
    password?: string;
  }) {
    console.info('Creating terminal connection', { hostId: data.hostId, type: data.type });
    try {
      console.debug('Fetching host from database', { hostId: data.hostId });
      const host = await db.host.findUnique({ where: { id: data.hostId } });
      if (!host) {
        console.error('Host not found', { hostId: data.hostId });
        throw new Error(`Host not found: ${data.hostId}`);
      }
      console.debug('Host found', { hostId: data.hostId, ip: host.ip });

      console.debug('Inserting new connection into database', { type: data.type });
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
        console.error('Failed to create connection record', { hostId: data.hostId });
        throw new Error('Failed to create connection record');
      }

      console.info('Terminal connection created', { connectionId: connection.id });
      return connection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating terminal connection', {
        error: errorMessage,
        hostId: data.hostId,
      });
      throw new Error(`Failed to create terminal connection: ${errorMessage}`);
    }
  }

  async getTerminalConnection(id: string) {
    console.info('Getting terminal connection', { connectionId: id });
    try {
      console.debug('Querying connection from database', { connectionId: id });
      const connections = await db.query('connections', {
        where: { id },
        include: { host: true },
      });

      const connection = connections[0];
      if (!connection) {
        console.error('Connection not found', { connectionId: id });
        return null;
      }

      console.debug('Connection retrieved', { connectionId: id, type: connection.type });
      return connection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error getting terminal connection', { error: errorMessage, connectionId: id });
      return null;
    }
  }

  async updateTerminalConnectionStatus(id: string, status: string) {
    console.info('Updating terminal connection status', { connectionId: id, status });
    try {
      console.debug('Updating connection status in database', { connectionId: id, status });
      const connections = await db.query('connections', {
        where: { id },
        update: { status },
        returning: true,
      });

      const connection = connections[0];
      if (!connection) {
        console.error('Connection not found for update', { connectionId: id });
        throw new Error(`Connection not found: ${id}`);
      }

      console.debug('Connection status updated', { connectionId: id, status });
      return connection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error updating terminal connection status', {
        error: errorMessage,
        connectionId: id,
      });
      throw new Error(`Failed to update terminal connection status: ${errorMessage}`);
    }
  }

  async closeTerminalConnection(id: string) {
    console.info('Closing terminal connection', { connectionId: id });
    try {
      console.debug('Closing connection in database', { connectionId: id });
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
        console.error('Connection not found for closure', { connectionId: id });
        throw new Error(`Connection not found: ${id}`);
      }

      console.debug('Connection closed', { connectionId: id });
      return connection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error closing terminal connection', { error: errorMessage, connectionId: id });
      throw new Error(`Failed to close terminal connection: ${errorMessage}`);
    }
  }

  async getTerminalConnections() {
    console.info('Getting all terminal connections');
    try {
      console.debug('Querying all connections from database');
      const connections = await db.query('connections', {
        include: { host: true },
        orderBy: { created_at: 'desc' },
      });

      console.debug('Retrieved all connections', { count: connections?.length || 0 });
      return connections || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error getting terminal connections', { error: errorMessage });
      return [];
    }
  }
}

const terminalService = TerminalService.getInstance();
export default terminalService;

export async function getCompatibleConnection(connectionId: string) {
  console.info('Getting compatible connection', { connectionId });
  try {
    console.debug('Querying compatible connection from database', { connectionId });
    const connections = await db.query('connections', {
      where: { id: connectionId },
      include: { host: true },
    });

    const connection = connections[0];
    if (!connection) {
      console.error('Connection not found', { connectionId });
      return null;
    }

    console.debug('Connection found', {
      connectionId: connection.id,
      connectionType: connection.type,
      connectionHasHost: !!connection.host,
    });

    return { ...connection };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error getting compatible connection', { error: errorMessage, connectionId });
    return null;
  }
}