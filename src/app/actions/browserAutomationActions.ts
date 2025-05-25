'use server';

import { getUser } from '@/app/actions/userAction';
import { ActionResult } from '@/types/context/browserContextType';

const BROWSER_SERVER_URL = 'http://localhost:5000';

interface BrowserServerResponse {
  success: boolean;
  message?: string;
  result?: string;
  status?: string;
  logs?: string;
  initialized?: boolean;
  executing?: boolean;
  current_task?: string;
  start_time?: string;
}

export async function startAutomationServerOnHost(hostId: string): Promise<ActionResult<{
  message: string;
  processId?: string;
}>> {
  try {
    console.log('[@action:browserAutomation:startAutomationServerOnHost] Starting automation server on host:', hostId);
    
    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Import terminal service functions
    const { initTerminalSession } = await import('@/lib/services/terminalService');
    const terminalService = (await import('@/lib/services/terminalService')).default;

    // Create a terminal session for command execution
    const session = await initTerminalSession({
      hostId: hostId,
      userId: user.id,
      sessionType: 'ssh',
      connectionParams: {
        host: '', // Will be filled by the service from host data
        port: 22,
        username: '',
        password: '',
      },
    });

    console.log('[@action:browserAutomation:startAutomationServerOnHost] Terminal session created:', session.id);

    // Execute the automation server startup command
    // First check what's available and then start the server
    const startCommand = `
      echo "=== Checking environment ===" &&
      pwd &&
      ls -la &&
      which python3 &&
      echo "=== Starting automation server ===" &&
      cd ~ &&
      python3 -c "
import sys
import subprocess
import os

# Try to start the automation server
try:
    # Check if we have the automation script
    script_paths = [
        '/home/user/automai/runner/browser-use-runner/scripts/tasks.py',
        '~/automai/runner/browser-use-runner/scripts/tasks.py',
        './automai/runner/browser-use-runner/scripts/tasks.py'
    ]
    
    script_path = None
    for path in script_paths:
        expanded_path = os.path.expanduser(path)
        if os.path.exists(expanded_path):
            script_path = expanded_path
            break
    
    if script_path:
        print(f'Found script at: {script_path}')
        # Start the server in background
        proc = subprocess.Popen([
            sys.executable, script_path, '--server'
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f'Started automation server with PID: {proc.pid}')
    else:
        print('ERROR: Could not find tasks.py script')
        print('Searched paths:', script_paths)
except Exception as e:
    print(f'ERROR: {e}')
"
    `.trim();
    
    console.log('[@action:browserAutomation:startAutomationServerOnHost] Executing command:', startCommand);
    
    const result = await terminalService.sendDataToSession(session.id, startCommand);

    if (result.success && result.data) {
      // Extract process ID from the output - look for "Started automation server with PID: XXXX"
      const output = result.data.stdout || '';
      const pidMatch = output.match(/Started automation server with PID: (\d+)/);
      const processId = pidMatch ? pidMatch[1] : null;
      
      console.log('[@action:browserAutomation:startAutomationServerOnHost] Command output:', output);
      console.log('[@action:browserAutomation:startAutomationServerOnHost] Extracted process ID:', processId);
      
      if (processId) {
        return {
          success: true,
          data: {
            message: 'Automation server started successfully on host',
            processId: processId,
          },
        };
      } else {
        // If no PID found, still return success but log the issue
        console.warn('[@action:browserAutomation:startAutomationServerOnHost] No process ID found in output');
        return {
          success: true,
          data: {
            message: 'Automation server command executed (no PID captured)',
            processId: null,
          },
        };
      }
    } else {
      throw new Error(result.error || 'Failed to execute startup command');
    }
  } catch (error: any) {
    console.error('[@action:browserAutomation:startAutomationServerOnHost] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to start automation server on host',
    };
  }
}

export async function stopAutomationServerOnHost(hostId: string, processId?: string): Promise<ActionResult<{
  message: string;
}>> {
  try {
    console.log('[@action:browserAutomation:stopAutomationServerOnHost] Stopping automation server on host:', hostId);
    
    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // First try to gracefully stop via API
    try {
      const response = await fetch(`${BROWSER_SERVER_URL}/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('[@action:browserAutomation:stopAutomationServerOnHost] Server stopped gracefully via API');
      }
    } catch (apiError) {
      console.log('[@action:browserAutomation:stopAutomationServerOnHost] API cleanup failed, will force stop process');
    }

    // Import terminal service functions
    const { initTerminalSession } = await import('@/lib/services/terminalService');
    const terminalService = (await import('@/lib/services/terminalService')).default;

    // Create a terminal session for command execution
    const session = await initTerminalSession({
      hostId: hostId,
      userId: user.id,
      sessionType: 'ssh',
      connectionParams: {
        host: '', // Will be filled by the service from host data
        port: 22,
        username: '',
        password: '',
      },
    });

    // Force stop the process
    let stopCommand: string;
    if (processId && /^\d+$/.test(processId)) {
      // Kill specific process ID (only if it's a valid number)
      stopCommand = `kill -TERM ${processId} 2>/dev/null || kill -9 ${processId} 2>/dev/null || echo "Process ${processId} not found"`;
      console.log('[@action:browserAutomation:stopAutomationServerOnHost] Terminating specific process:', processId);
    } else {
      // Kill any python tasks.py --server process
      stopCommand = `pkill -f "python.*tasks.py.*--server" 2>/dev/null || echo "No automation server processes found"`;
      console.log('[@action:browserAutomation:stopAutomationServerOnHost] Terminating all automation server processes');
    }
    
    const result = await terminalService.sendDataToSession(session.id, stopCommand);

    if (result.success) {
      console.log('[@action:browserAutomation:stopAutomationServerOnHost] Stop command executed successfully');
      return {
        success: true,
        data: {
          message: 'Automation server stopped on host',
        },
      };
    } else {
      throw new Error(result.error || 'Failed to execute stop command');
    }
  } catch (error: any) {
    console.error('[@action:browserAutomation:stopAutomationServerOnHost] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to stop automation server on host',
    };
  }
}

export async function getBrowserStatus(): Promise<ActionResult<{
  initialized: boolean;
  executing: boolean;
  current_task: string | null;
  start_time: string | null;
  logs: string;
}>> {
  try {
    console.log('[@action:browserAutomation:getBrowserStatus] Getting browser status');
    
    const response = await fetch(`${BROWSER_SERVER_URL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Flask server not accessible (403). Server may not be running on host.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: BrowserServerResponse = await response.json();
    
    return {
      success: true,
      data: {
        initialized: data.initialized || false,
        executing: data.executing || false,
        current_task: data.current_task || null,
        start_time: data.start_time || null,
        logs: data.logs || '',
      },
    };
  } catch (error: any) {
    console.error('[@action:browserAutomation:getBrowserStatus] Error:', error);
    
    // Return default values instead of failing completely
    return {
      success: true,
      data: {
        initialized: false,
        executing: false,
        current_task: null,
        start_time: null,
        logs: `Connection error: ${error.message}`,
      },
    };
  }
}

export async function initializeBrowserAutomation(): Promise<ActionResult<{
  message: string;
  logs: string;
}>> {
  try {
    console.log('[@action:browserAutomation:initializeBrowserAutomation] Initializing browser');
    
    const response = await fetch(`${BROWSER_SERVER_URL}/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        return {
          success: false,
          error: 'Flask server not running on host. Please check if the automation server started correctly.',
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: BrowserServerResponse = await response.json();
    
    if (!data.success) {
      return {
        success: false,
        error: data.message || 'Failed to initialize browser',
      };
    }

    return {
      success: true,
      data: {
        message: data.message || 'Browser initialized successfully',
        logs: data.logs || '',
      },
    };
  } catch (error: any) {
    console.error('[@action:browserAutomation:initializeBrowserAutomation] Error:', error);
    
    if (error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Cannot connect to automation server. Please ensure the server is running on the host.',
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to initialize browser automation',
    };
  }
}

export async function executeBrowserTask(task: string): Promise<ActionResult<{
  result: string;
  status: string;
  logs: string;
}>> {
  try {
    console.log('[@action:browserAutomation:executeBrowserTask] Executing task:', task);
    
    const response = await fetch(`${BROWSER_SERVER_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: BrowserServerResponse = await response.json();
    
    return {
      success: data.success,
      data: {
        result: data.result || '',
        status: data.status || 'UNKNOWN',
        logs: data.logs || '',
      },
      error: data.success ? undefined : (data.result || 'Task execution failed'),
    };
  } catch (error: any) {
    console.error('[@action:browserAutomation:executeBrowserTask] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to execute browser task',
    };
  }
}

export async function cleanupBrowserAutomation(): Promise<ActionResult<{
  message: string;
  logs: string;
}>> {
  try {
    console.log('[@action:browserAutomation:cleanupBrowserAutomation] Cleaning up browser');
    
    const response = await fetch(`${BROWSER_SERVER_URL}/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: BrowserServerResponse = await response.json();
    
    return {
      success: data.success,
      data: {
        message: data.message || 'Browser cleanup completed',
        logs: data.logs || '',
      },
      error: data.success ? undefined : (data.message || 'Cleanup failed'),
    };
  } catch (error: any) {
    console.error('[@action:browserAutomation:cleanupBrowserAutomation] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to cleanup browser automation',
    };
  }
}

export async function getBrowserLogs(): Promise<ActionResult<{
  logs: string;
}>> {
  try {
    console.log('[@action:browserAutomation:getBrowserLogs] Getting browser logs');
    
    const response = await fetch(`${BROWSER_SERVER_URL}/logs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: BrowserServerResponse = await response.json();
    
    return {
      success: true,
      data: {
        logs: data.logs || '',
      },
    };
  } catch (error: any) {
    console.error('[@action:browserAutomation:getBrowserLogs] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get browser logs',
    };
  }
} 