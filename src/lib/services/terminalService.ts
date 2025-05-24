/* eslint-disable */
import hostDb from '@/lib/db/hostDb';
import { logUtils } from '../utils/logUtils';

class TerminalService {
  private static instance: TerminalService;
  private activeSessions: Map<string, any> = new Map();

  public static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      console.debug('[@service:terminal] Creating new TerminalService instance');
      TerminalService.instance = new TerminalService();
    }
    return TerminalService.instance;
  }

  /**
   * Create a terminal session using existing host data
   */
  async createTerminalSession(data: { hostId: string; userId: string; type: string }) {
    console.info('[@service:terminal:createTerminalSession] Creating terminal session', {
      hostId: data.hostId,
      userId: data.userId,
      type: data.type,
    });

    try {
      // Use existing hostDb layer to get host data
      console.debug(
        '[@service:terminal:createTerminalSession] Fetching host from database via hostDb',
      );
      const hostResult = await hostDb.getHostById(data.hostId);

      if (!hostResult.success || !hostResult.data) {
        console.error('[@service:terminal:createTerminalSession] Host not found', {
          hostId: data.hostId,
        });
        throw new Error(`Host not found: ${data.hostId}`);
      }

      const host = hostResult.data;
      console.debug('[@service:terminal:createTerminalSession] Host found', {
        hostId: data.hostId,
        name: host.name,
        ip: host.ip,
        port: host.port,
      });

      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store session in memory (for now - could be extended to database if needed)
      const session = {
        id: sessionId,
        hostId: data.hostId,
        userId: data.userId,
        type: data.type,
        status: 'active',
        host: host,
        createdAt: new Date().toISOString(),
      };

      this.activeSessions.set(sessionId, session);

      console.info('[@service:terminal:createTerminalSession] Terminal session created', {
        sessionId,
        hostId: data.hostId,
      });

      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[@service:terminal:createTerminalSession] Error creating terminal session', {
        error: errorMessage,
        hostId: data.hostId,
      });
      throw new Error(`Failed to create terminal session: ${errorMessage}`);
    }
  }

  /**
   * Get an active terminal session
   */
  async getTerminalSession(sessionId: string) {
    console.info('[@service:terminal:getTerminalSession] Getting terminal session', { sessionId });

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.error('[@service:terminal:getTerminalSession] Session not found', { sessionId });
      return null;
    }

    console.debug('[@service:terminal:getTerminalSession] Session retrieved', {
      sessionId,
      status: session.status,
    });
    return session;
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: string) {
    console.info('[@service:terminal:updateSessionStatus] Updating session status', {
      sessionId,
      status,
    });

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.error('[@service:terminal:updateSessionStatus] Session not found', { sessionId });
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = status;
    session.updatedAt = new Date().toISOString();

    this.activeSessions.set(sessionId, session);

    console.debug('[@service:terminal:updateSessionStatus] Session status updated', {
      sessionId,
      status,
    });
    return session;
  }

  /**
   * Close a terminal session
   */
  async closeSession(sessionId: string) {
    console.info('[@service:terminal:closeSession] Closing terminal session', { sessionId });

    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'closed';
      session.closedAt = new Date().toISOString();

      // Remove from active sessions after a delay to allow cleanup
      setTimeout(() => {
        this.activeSessions.delete(sessionId);
        console.debug('[@service:terminal:closeSession] Session removed from memory', {
          sessionId,
        });
      }, 5000);

      console.debug('[@service:terminal:closeSession] Session marked as closed', { sessionId });
      return session;
    }

    console.warn('[@service:terminal:closeSession] Session not found for closure', { sessionId });
    return null;
  }

  /**
   * Send data to terminal session (placeholder for future SSH integration)
   */
  async sendDataToSession(sessionId: string, data: string) {
    console.info('[@service:terminal:sendDataToSession] Sending data to session', {
      sessionId,
      dataLength: data.length,
    });

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // TODO: Integrate with real SSH connection
    // For now, just log the data
    console.debug('[@service:terminal:sendDataToSession] Data sent to session', {
      sessionId,
      data: data.replace(/\r?\n/g, '\\n'),
    });

    return { success: true };
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }
}

const terminalService = TerminalService.getInstance();
export default terminalService;

/**
 * Initialize a terminal session with the given parameters
 */
export async function initTerminalSession(params: {
  hostId: string;
  userId: string;
  sessionType: string;
  connectionParams: {
    host: string;
    port: number;
    username: string;
    password: string;
  };
}) {
  try {
    console.info('[@service:terminal:initTerminalSession] Initializing terminal session', {
      hostId: params.hostId,
      userId: params.userId,
      type: params.sessionType,
    });

    // Create a session using the terminal service
    const session = await terminalService.createTerminalSession({
      hostId: params.hostId,
      userId: params.userId,
      type: params.sessionType,
    });

    console.info('[@service:terminal:initTerminalSession] Session initialized successfully', {
      sessionId: session.id,
    });

    // Return session info
    return {
      id: session.id,
      hostId: params.hostId,
      userId: params.userId,
      type: params.sessionType,
      status: 'active',
    };
  } catch (error) {
    console.error('[@service:terminal:initTerminalSession] Error initializing terminal session', {
      error: error instanceof Error ? error.message : 'Unknown error',
      params: {
        hostId: params.hostId,
        userId: params.userId,
        sessionType: params.sessionType,
        // Don't log connection params for security
      },
    });
    throw new Error('Failed to initialize terminal session');
  }
}

/**
 * Close a terminal session by ID
 */
export async function closeTerminalSession(sessionId: string) {
  try {
    console.info('[@service:terminal:closeTerminalSession] Closing terminal session', {
      sessionId,
    });

    const result = await terminalService.closeSession(sessionId);

    console.info('[@service:terminal:closeTerminalSession] Session closed successfully', {
      sessionId,
    });
    return result;
  } catch (error) {
    console.error('[@service:terminal:closeTerminalSession] Error closing terminal session', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId,
    });
    throw new Error('Failed to close terminal session');
  }
}

/**
 * Send data to a terminal session
 */
export async function sendDataToTerminal(sessionId: string, data: string) {
  try {
    console.info('[@service:terminal:sendDataToTerminal] Sending data to terminal', {
      sessionId,
      dataLength: data.length,
    });

    const result = await terminalService.sendDataToSession(sessionId, data);

    console.debug('[@service:terminal:sendDataToTerminal] Data sent successfully', { sessionId });
    return result;
  } catch (error) {
    console.error('[@service:terminal:sendDataToTerminal] Error sending data to terminal', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId,
    });
    throw new Error('Failed to send data to terminal');
  }
}

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
