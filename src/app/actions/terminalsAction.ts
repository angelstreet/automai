'use server';

import { getHostById } from '@/app/actions/hostsAction';
import { getUser } from '@/app/actions/userAction';

/**
 * Initialize a terminal session
 */
export async function initTerminal(hostId: string) {
  try {
    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Get host details
    const hostResult = await getHostById(hostId);
    if (!hostResult.success || !hostResult.data) {
      return {
        success: false,
        error: hostResult.error || 'Host not found',
      };
    }

    const host = hostResult.data;

    // Import the terminal service functions
    const { initTerminalSession } = await import('@/lib/services/terminalService');

    // Create terminal session
    const session = await initTerminalSession({
      hostId: host.id,
      userId: user.id,
      sessionType: 'ssh',
      connectionParams: {
        host: host.ip,
        port: host.port || 22,
        username: host.user || '',
        password: host.password || '',
      },
    });

    return {
      success: true,
      data: {
        sessionId: session.id,
        host: {
          id: host.id,
          name: host.name,
          ip: host.ip,
        },
      },
    };
  } catch (error: any) {
    console.error('Error initializing terminal:', error);
    return {
      success: false,
      error: error.message || 'Failed to initialize terminal',
    };
  }
}

/**
 * Close a terminal session
 */
export async function closeTerminal(sessionId: string) {
  try {
    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Import the terminal service functions
    const { closeTerminalSession } = await import('@/lib/services/terminalService');

    // Close terminal session
    await closeTerminalSession(sessionId);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error closing terminal:', error);
    return {
      success: false,
      error: error.message || 'Failed to close terminal',
    };
  }
}

/**
 * Send data to a terminal session
 */
export async function sendTerminalData(sessionId: string, data: string) {
  try {
    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Import the terminal service functions
    const { sendDataToTerminal } = await import('@/lib/services/terminalService');

    // Send data to terminal
    await sendDataToTerminal(sessionId, data);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error sending terminal data:', error);
    return {
      success: false,
      error: error.message || 'Failed to send terminal data',
    };
  }
}
