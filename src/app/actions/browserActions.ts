'use server';

import { initTerminal, closeTerminal } from '@/app/actions/terminalsAction';
import { getUser } from '@/app/actions/userAction';
import { reserveHost, releaseHost, forceReleaseHost } from '@/lib/db/hostDb';

/**
 * Reserve a host for browser automation
 */
export async function reserveBrowserHost(hostId: string) {
  try {
    console.log(`[@action:browserActions:reserveBrowserHost] Reserving host: ${hostId}`);

    // Get current user
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Reserve the host
    const result = await reserveHost(hostId, user.id);

    if (result.success) {
      console.log(
        `[@action:browserActions:reserveBrowserHost] Host reserved successfully: ${hostId}`,
      );
      return { success: true, data: result.data };
    } else {
      console.log(
        `[@action:browserActions:reserveBrowserHost] Host reservation failed: ${result.error}`,
      );
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error(`[@action:browserActions:reserveBrowserHost] Error reserving host:`, error);
    return { success: false, error: error.message || 'Failed to reserve host' };
  }
}

/**
 * Force take control of a host
 */
export async function forceTakeControlBrowserHost(hostId: string) {
  try {
    console.log(
      `[@action:browserActions:forceTakeControlBrowserHost] Force taking control of host: ${hostId}`,
    );

    // Get current user
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Force release the host to current user
    const result = await forceReleaseHost(hostId, user.id);

    if (result.success) {
      console.log(
        `[@action:browserActions:forceTakeControlBrowserHost] Force control successful: ${hostId}`,
      );
      return { success: true, data: result.data };
    } else {
      console.log(
        `[@action:browserActions:forceTakeControlBrowserHost] Force control failed: ${result.error}`,
      );
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error(
      `[@action:browserActions:forceTakeControlBrowserHost] Error force taking control:`,
      error,
    );
    return { success: false, error: error.message || 'Failed to force take control' };
  }
}

/**
 * Release a browser host reservation
 */
export async function releaseBrowserHost(hostId: string) {
  try {
    console.log(`[@action:browserActions:releaseBrowserHost] Releasing host: ${hostId}`);

    const result = await releaseHost(hostId);

    if (result.success) {
      console.log(
        `[@action:browserActions:releaseBrowserHost] Host released successfully: ${hostId}`,
      );
      return { success: true, data: result.data };
    } else {
      console.log(
        `[@action:browserActions:releaseBrowserHost] Host release failed: ${result.error}`,
      );
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error(`[@action:browserActions:releaseBrowserHost] Error releasing host:`, error);
    return { success: false, error: error.message || 'Failed to release host' };
  }
}

/**
 * Start browser session (reserve host + init terminal)
 */
export async function startBrowserSession(hostId: string) {
  try {
    console.log(
      `[@action:browserActions:startBrowserSession] Starting browser session for host: ${hostId}`,
    );

    // Get current user
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // First reserve the host
    const reserveResult = await reserveHost(hostId, user.id);
    if (!reserveResult.success) {
      return { success: false, error: reserveResult.error };
    }

    // Then initialize terminal session
    const terminalResult = await initTerminal(hostId);
    if (!terminalResult.success) {
      // If terminal fails, release the host
      await releaseHost(hostId);
      return { success: false, error: terminalResult.error };
    }

    console.log(
      `[@action:browserActions:startBrowserSession] Browser session started successfully: ${hostId}`,
    );
    return {
      success: true,
      data: {
        sessionId: terminalResult.data?.sessionId,
        host: reserveResult.data,
      },
    };
  } catch (error: any) {
    console.error(
      `[@action:browserActions:startBrowserSession] Error starting browser session:`,
      error,
    );
    return { success: false, error: error.message || 'Failed to start browser session' };
  }
}

/**
 * End browser session (close terminal + release host)
 */
export async function endBrowserSession(sessionId: string, hostId: string) {
  try {
    console.log(
      `[@action:browserActions:endBrowserSession] Ending browser session: ${sessionId}, host: ${hostId}`,
    );

    // Close terminal session
    await closeTerminal(sessionId);

    // Release host
    await releaseBrowserHost(hostId);

    console.log(`[@action:browserActions:endBrowserSession] Browser session ended successfully`);
    return { success: true };
  } catch (error: any) {
    console.error(
      `[@action:browserActions:endBrowserSession] Error ending browser session:`,
      error,
    );
    return { success: false, error: error.message || 'Failed to end browser session' };
  }
}
