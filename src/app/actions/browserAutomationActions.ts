'use server';

import { getUser } from '@/app/actions/userAction';

// Local type definition to avoid import issues
interface ActionResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

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

    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Terminal session created:',
      session.id,
    );

    // Step 1: Send pwd to trigger login output and ensure shell is ready
    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Step 1: Triggering shell with pwd',
    );
    const pwdResult = await terminalService.sendDataToSession(session.id, 'pwd');

    if (!pwdResult.success) {
      throw new Error('Failed to initialize shell with pwd command');
    }

    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Shell initialized, output:',
      pwdResult.data?.stdout || '',
    );

    // Wait for shell to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: Activate virtual environment
    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Step 2: Activating virtual environment',
    );
    const venvResult = await terminalService.sendDataToSession(
      session.id,
      'source /tmp/python/venv/bin/activate && echo "VENV_ACTIVATED"',
    );

    if (!venvResult.success) {
      throw new Error('Failed to activate virtual environment');
    }

    // Wait for venv activation to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const venvOutput = venvResult.data?.stdout || '';
    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Venv activation output:',
      venvOutput,
    );

    if (!venvOutput.includes('VENV_ACTIVATED')) {
      throw new Error('Virtual environment activation failed - VENV_ACTIVATED not found in output');
    }

    // Step 3: Change directory and verify script exists
    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Step 3: Checking script location',
    );
    const scriptCheckResult = await terminalService.sendDataToSession(
      session.id,
      'cd ~/automai/runner/browser-use-runner/scripts && ls -la tasks.py && echo "SCRIPT_EXISTS"',
    );

    if (!scriptCheckResult.success) {
      throw new Error('Failed to check script location');
    }

    // Wait for script check to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const scriptOutput = scriptCheckResult.data?.stdout || '';
    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Script check output:',
      scriptOutput,
    );

    if (!scriptOutput.includes('SCRIPT_EXISTS')) {
      throw new Error('tasks.py script not found in expected location');
    }

    // Step 4: Start the Flask server
    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Step 4: Starting Flask server',
    );
    const serverStartResult = await terminalService.sendDataToSession(
      session.id,
      'python tasks.py --server > server.log 2>&1 & SERVER_PID=$! && echo "SERVER_STARTED_PID:$SERVER_PID"',
    );

    if (!serverStartResult.success) {
      throw new Error('Failed to start Flask server');
    }

    // Wait for server start command to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const serverOutput = serverStartResult.data?.stdout || '';
    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Server start output:',
      serverOutput,
    );

    // Extract PID from output
    const pidMatch = serverOutput.match(/SERVER_STARTED_PID:(\d+)/);
    const processId = pidMatch ? pidMatch[1] : null;

    if (!processId) {
      console.log(
        '[@action:browserAutomation:startAutomationServerOnHost] Warning: Could not extract PID from output',
      );
    }

    // Step 5: Wait a moment and verify server is running
    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Step 5: Waiting and verifying server',
    );
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds

    const verifyResult = await terminalService.sendDataToSession(
      session.id,
      'ps aux | grep "tasks.py --server" | grep -v grep && echo "SERVER_RUNNING" || echo "SERVER_NOT_FOUND"',
    );

    if (!verifyResult.success) {
      throw new Error('Failed to verify server status');
    }

    // Wait for verification to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const verifyOutput = verifyResult.data?.stdout || '';
    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Server verification output:',
      verifyOutput,
    );

    if (!verifyOutput.includes('SERVER_RUNNING')) {
      // Check server logs for errors
      const logResult = await terminalService.sendDataToSession(session.id, 'tail -20 server.log');
      const logOutput = logResult.success ? logResult.data?.stdout || '' : 'Could not read logs';

      throw new Error(`Flask server is not running. Server logs: ${logOutput}`);
    }

    // Step 6: Check if port 5000 is listening
    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Step 6: Checking port 5000',
    );
    const portResult = await terminalService.sendDataToSession(
      session.id,
      'netstat -ln | grep :5000 && echo "PORT_LISTENING" || echo "PORT_NOT_LISTENING"',
    );

    if (portResult.success) {
      // Wait for port check to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const portOutput = portResult.data?.stdout || '';
      console.log(
        '[@action:browserAutomation:startAutomationServerOnHost] Port check output:',
        portOutput,
      );

      if (!portOutput.includes('PORT_LISTENING')) {
        console.log(
          '[@action:browserAutomation:startAutomationServerOnHost] Warning: Port 5000 not detected as listening',
        );
      }
    }

    // Step 7: Test Flask server locally with curl
    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Step 7: Testing Flask server with curl',
    );
    const curlResult = await terminalService.sendDataToSession(
      session.id,
      'curl -s http://localhost:5000/status && echo "FLASK_RESPONDING" || echo "FLASK_NOT_RESPONDING"',
    );

    if (curlResult.success) {
      // Wait for curl test to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const curlOutput = curlResult.data?.stdout || '';
      console.log(
        '[@action:browserAutomation:startAutomationServerOnHost] Flask test output:',
        curlOutput,
      );

      if (!curlOutput.includes('FLASK_RESPONDING')) {
        console.log(
          '[@action:browserAutomation:startAutomationServerOnHost] Warning: Flask server not responding to HTTP requests',
        );
      }
    }

    return {
      success: true,
      data: {
        message: processId 
          ? `Flask server started successfully with PID: ${processId}` 
          : 'Flask server started successfully (PID not captured)',
        processId: processId,
      },
    };
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

    // Force stop the process - simplified to just pkill
    const stopCommand = `pkill -f "python.*tasks.py.*--server" || echo "No automation server processes found"`;
    console.log('[@action:browserAutomation:stopAutomationServerOnHost] Terminating automation server processes');
    
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

export async function getBrowserStatus(hostId: string): Promise<ActionResult<{
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

export async function initializeBrowserAutomation(hostId: string): Promise<ActionResult<{
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