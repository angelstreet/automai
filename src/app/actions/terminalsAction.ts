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
export async function sendTerminalData(sessionId: string, command: string) {
  try {
    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    console.log(
      `[@action:terminalsAction:sendTerminalData] Executing command on session ${sessionId}: ${command}`,
    );

    // Import the terminal service functions
    const { sendDataToTerminal } = await import('@/lib/services/terminalService');

    // Send command to terminal session - this uses the existing SSH connection
    const result = await sendDataToTerminal(sessionId, command);

    if (result.success) {
      console.log(
        `[@action:terminalsAction:sendTerminalData] Command executed successfully on session ${sessionId}`,
      );
      return {
        success: true,
        data: result.data,
      };
    } else {
      console.error(
        `[@action:terminalsAction:sendTerminalData] Command failed on session ${sessionId}:`,
        result.error,
      );
      return {
        success: false,
        error: result.error || 'Failed to execute command',
      };
    }
  } catch (error: any) {
    console.error(`[@action:terminalsAction:sendTerminalData] Error executing command:`, error);
    return {
      success: false,
      error: error.message || 'Failed to send terminal data',
    };
  }
}

/**
 * Poll for additional output from a terminal session (for long-running commands)
 */
export async function pollTerminalOutput(sessionId: string, timeoutMs: number = 500) {
  try {
    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    console.debug(
      `[@action:terminalsAction:pollTerminalOutput] Polling output for session ${sessionId}`,
    );

    // Import the terminal service functions
    const { pollTerminalOutput } = await import('@/lib/services/terminalService');

    // Poll for additional output
    const result = await pollTerminalOutput(sessionId, timeoutMs);

    if (result.success) {
      console.debug(
        `[@action:terminalsAction:pollTerminalOutput] Poll successful for session ${sessionId}`,
        { hasOutput: result.data?.hasOutput },
      );
      return {
        success: true,
        data: result.data,
      };
    } else {
      console.error(
        `[@action:terminalsAction:pollTerminalOutput] Poll failed for session ${sessionId}:`,
        result.error,
      );
      return {
        success: false,
        error: result.error || 'Failed to poll terminal output',
      };
    }
  } catch (error: any) {
    console.error(`[@action:terminalsAction:pollTerminalOutput] Error polling output:`, error);
    return {
      success: false,
      error: error.message || 'Failed to poll terminal output',
    };
  }
}
