/* eslint-disable */
import hostDb from '@/lib/db/hostDb';
import sshService from './sshService';
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
   * Create a terminal session using existing host data and real SSH connection
   */
  async createTerminalSession(data: { hostId: string; userId: string; type: string }) {
    console.info('[@service:terminal:createTerminalSession] Creating terminal session', {
      hostId: data.hostId,
      userId: data.userId,
      type: data.type,
    });

    try {
      // Use getHostWithDecryptedCredentials instead of hostDb to get decrypted credentials
      console.debug(
        '[@service:terminal:createTerminalSession] Fetching host with decrypted credentials',
      );

      // Import and use the same function that works for ADB
      const { getHostWithDecryptedCredentials } = await import('@/app/actions/hostsAction');
      const hostResult = await getHostWithDecryptedCredentials(data.hostId);

      if (!hostResult.success || !hostResult.data) {
        console.error('[@service:terminal:createTerminalSession] Host not found', {
          hostId: data.hostId,
          error: hostResult.error,
        });
        throw new Error(`Host not found: ${hostResult.error || data.hostId}`);
      }

      const host = hostResult.data;
      console.debug(
        '[@service:terminal:createTerminalSession] Host found with decrypted credentials',
        {
          hostId: data.hostId,
          name: host.name,
          ip: host.ip,
          port: host.port,
          username: host.user,
          hasPassword: !!host.password,
          authType: host.auth_type,
        },
      );

      // Validate required SSH credentials
      if (!host.user) {
        throw new Error('Host is missing username for SSH connection');
      }

      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create SSH connection using the same pattern as ADB actions
      console.info('[@service:terminal:createTerminalSession] Creating SSH connection');
      const sshOptions = {
        host: host.ip,
        port: host.port || 22,
        username: host.user,
        ...(host.auth_type === 'password' && host.password ? { password: host.password } : {}),
        ...(host.auth_type === 'privateKey' && (host as any).privateKey
          ? { privateKey: (host as any).privateKey }
          : {}),
        timeout: 10000,
      };

      console.debug('[@service:terminal:createTerminalSession] SSH options prepared', {
        host: sshOptions.host,
        port: sshOptions.port,
        username: sshOptions.username,
        authType: host.auth_type,
        hasPassword: !!sshOptions.password,
        hasPrivateKey: !!(sshOptions as any).privateKey,
      });

      const sshResult = await sshService.createConnection(sessionId, sshOptions);

      if (!sshResult.success) {
        console.error('[@service:terminal:createTerminalSession] SSH connection failed', {
          error: sshResult.error,
          sessionId,
        });
        throw new Error(`SSH connection failed: ${sshResult.error}`);
      }

      // Store session in memory with SSH connection info
      const session = {
        id: sessionId,
        hostId: data.hostId,
        userId: data.userId,
        type: data.type,
        status: 'active',
        host: host,
        sshConnected: true,
        shellId: null, // Will be set when shell is created
        createdAt: new Date().toISOString(),
      };

      this.activeSessions.set(sessionId, session);

      // Create interactive shell session
      console.info('[@service:terminal:createTerminalSession] Creating interactive shell');
      const shellResult = await sshService.createShellSession(sessionId);

      if (!shellResult.success) {
        console.error('[@service:terminal:createTerminalSession] Shell creation failed', {
          error: shellResult.error,
          sessionId,
        });
        // Clean up the connection
        await sshService.closeConnection(sessionId);
        this.activeSessions.delete(sessionId);
        throw new Error(`Shell creation failed: ${shellResult.error}`);
      }

      // Update session with shell ID
      session.shellId = shellResult.data?.shellId;
      this.activeSessions.set(sessionId, session);

      console.info('[@service:terminal:createTerminalSession] Terminal session created with SSH', {
        sessionId,
        hostId: data.hostId,
        shellId: session.shellId,
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
   * Close a terminal session and SSH connection
   */
  async closeSession(sessionId: string) {
    console.info('[@service:terminal:closeSession] Closing terminal session', { sessionId });

    const session = this.activeSessions.get(sessionId);
    if (session) {
      // Close shell session first
      if (session.shellId) {
        console.info('[@service:terminal:closeSession] Closing shell session');
        await sshService.closeShellSession(session.shellId);
      }

      // Close SSH connection
      console.info('[@service:terminal:closeSession] Closing SSH connection');
      await sshService.closeConnection(sessionId);

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
   * Send data to terminal session using interactive shell
   */
  async sendDataToSession(sessionId: string, data: string) {
    console.info('[@service:terminal:sendDataToSession] Sending data to shell session', {
      sessionId,
      dataLength: data.length,
    });

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (!session.shellId) {
      throw new Error(`No shell session found for: ${sessionId}`);
    }

    try {
      console.debug('[@service:terminal:sendDataToSession] Sending to interactive shell', {
        sessionId,
        shellId: session.shellId,
        data: data.replace(/\r?\n/g, '\\n'),
      });

      // Send data to interactive shell
      const sendResult = await sshService.sendToShell(session.shellId, data + '\n');

      if (!sendResult.success) {
        console.error('[@service:terminal:sendDataToSession] Failed to send to shell', {
          sessionId,
          error: sendResult.error,
        });

        return {
          success: false,
          error: sendResult.error,
        };
      }

      // Read response from shell
      const readResult = await sshService.readFromShell(session.shellId, 2000);

      if (readResult.success) {
        console.debug('[@service:terminal:sendDataToSession] Received shell output', {
          sessionId,
          outputLength: readResult.data?.output?.length || 0,
        });

        return {
          success: true,
          data: {
            stdout: readResult.data?.output || '',
            stderr: '',
            code: 0,
          },
        };
      } else {
        console.error('[@service:terminal:sendDataToSession] Failed to read from shell', {
          sessionId,
          error: readResult.error,
        });

        return {
          success: false,
          error: readResult.error,
          data: {
            stdout: '',
            stderr: readResult.error || 'Failed to read shell output',
            code: 1,
          },
        };
      }
    } catch (error) {
      console.error('[@service:terminal:sendDataToSession] Error with shell interaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
      });
      throw error;
    }
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
