'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { getUser } from '@/app/actions/userAction';

// Local type definition to avoid import issues
interface ActionResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

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

export async function startAutomationServerOnHost(
  hostId: string,
): Promise<
  ActionResult<{
    message: string;
    processId?: string;
    sessionId: string;
  }>
> {
  try {
    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Starting automation server on host:',
      hostId,
    );
    
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
      'python tasks.py > server.log 2>&1 & SERVER_PID=$! && echo "SERVER_STARTED_PID:$SERVER_PID"',
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
      'ps aux | grep "tasks.py" | grep -v grep && echo "SERVER_RUNNING" || echo "SERVER_NOT_FOUND"',
    );

    if (!verifyResult.success) {
      throw new Error('Failed to verify server status');
    }

    // Check immediately for obvious failure
    const immediateOutput = verifyResult.data?.stdout || '';
    if (immediateOutput.includes('SERVER_NOT_FOUND')) {
      console.error(
        '[@action:browserAutomation:startAutomationServerOnHost] Server failed to start - immediate check',
        { immediateOutput },
      );
      
      // Check server logs for errors
      const logResult = await terminalService.sendDataToSession(session.id, 'tail -20 server.log');
      const logOutput = logResult.success ? logResult.data?.stdout || '' : 'Could not read logs';
      
      throw new Error(`Flask server failed to start. Server logs: ${logOutput}`);
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

      // Log the exact verification output for debugging
      console.error(
        '[@action:browserAutomation:startAutomationServerOnHost] Server verification failed',
        {
          verifyOutput,
          containsServerRunning: verifyOutput.includes('SERVER_RUNNING'),
          containsServerNotFound: verifyOutput.includes('SERVER_NOT_FOUND'),
        },
      );

      throw new Error(`Flask server is not running. Server logs: ${logOutput}`);
    }

    // Step 6: Check if port 5001 is listening
    console.log(
      '[@action:browserAutomation:startAutomationServerOnHost] Step 6: Checking port 5001',
    );
    const portResult = await terminalService.sendDataToSession(
      session.id,
      'netstat -ln | grep :5001 && echo "PORT_LISTENING" || echo "PORT_NOT_LISTENING"',
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
          '[@action:browserAutomation:startAutomationServerOnHost] Warning: Port 5001 not detected as listening',
        );
      }
    }

    return {
      success: true,
      data: {
        message: processId 
          ? `Flask server started successfully with PID: ${processId}` 
          : 'Flask server started successfully (PID not captured)',
        processId: processId || undefined,
        sessionId: session.id,
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

export async function stopAutomationServerOnHost(
  sessionId: string,
  _processId?: string,
): Promise<ActionResult<{
  message: string;
}>> {
  try {
    console.log(
      '[@action:browserAutomation:stopAutomationServerOnHost] Stopping automation server using session:',
      sessionId,
    );

    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Use existing session instead of creating new one
    const terminalService = (await import('@/lib/services/terminalService')).default;

    // Force stop the process - simplified to just pkill
    const stopCommand = `pkill -f "python.*tasks.py" || echo "No automation server processes found"`;
    console.log(
      '[@action:browserAutomation:stopAutomationServerOnHost] Terminating automation server processes',
    );

    const result = await terminalService.sendDataToSession(sessionId, stopCommand);

    if (result.success) {
      console.log(
        '[@action:browserAutomation:stopAutomationServerOnHost] Stop command executed successfully',
      );
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

export async function getBrowserStatus(sessionId: string): Promise<ActionResult<{
  initialized: boolean;
  executing: boolean;
  current_task: string | null;
  start_time: string | null;
  logs: string;
}>> {
  try {
    console.log('[@action:browserAutomation:getBrowserStatus] Getting browser status via existing session:', sessionId);

    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: true,
        data: {
          initialized: false,
          executing: false,
          current_task: null,
          start_time: null,
          logs: 'User not authenticated',
        },
      };
    }

    // Use existing session instead of creating new one
    const terminalService = (await import('@/lib/services/terminalService')).default;

    // Execute curl command to get status from the host
    const curlCommand = `curl -X GET http://localhost:5001/status -H "Content-Type: application/json" -w "\\nHTTP_STATUS:%{http_code}\\n" -s`;
    
    console.log('[@action:browserAutomation:getBrowserStatus] Executing curl command via existing session');
    const result = await terminalService.sendDataToSession(sessionId, curlCommand);

    if (!result.success) {
      throw new Error('Failed to execute curl command via SSH');
    }

    // Wait for curl command to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const curlOutput = result.data?.stdout || '';
    console.log('[@action:browserAutomation:getBrowserStatus] Curl output:', curlOutput);

    // Parse the response
    const httpStatusMatch = curlOutput.match(/HTTP_STATUS:(\d+)/);
    const httpStatus = httpStatusMatch ? parseInt(httpStatusMatch[1]) : 0;

    if (httpStatus !== 200) {
      // Return default values if server is not accessible
      return {
        success: true,
        data: {
          initialized: false,
          executing: false,
          current_task: null,
          start_time: null,
          logs: `Connection error: HTTP ${httpStatus}`,
        },
      };
    }

    // Extract JSON response (everything before HTTP_STATUS line)
    const jsonResponse = curlOutput.split('HTTP_STATUS:')[0].trim();
    
    try {
      const data = JSON.parse(jsonResponse);

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
    } catch (parseError: any) {
      console.error('[@action:browserAutomation:getBrowserStatus] Failed to parse JSON response:', parseError);
      // Return default values if JSON parsing fails
      return {
        success: true,
        data: {
          initialized: false,
          executing: false,
          current_task: null,
          start_time: null,
          logs: `Parse error: ${parseError.message}`,
        },
      };
    }
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

export async function initializeBrowserAutomation(sessionId: string): Promise<ActionResult<{
  message: string;
  logs: string;
}>> {
  try {
    console.log('[@action:browserAutomation:initializeBrowserAutomation] Initializing browser via existing session:', sessionId);

    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Use existing session instead of creating new one
    const terminalService = (await import('@/lib/services/terminalService')).default;

    // Execute curl command to initialize browser on the host
    const curlCommand = `curl -X POST http://localhost:5001/initialize -H "Content-Type: application/json" -w "\\nHTTP_STATUS:%{http_code}\\n" -s`;
    
    console.log('[@action:browserAutomation:initializeBrowserAutomation] Executing curl command via existing session');
    const result = await terminalService.sendDataToSession(sessionId, curlCommand);

    if (!result.success) {
      throw new Error('Failed to execute curl command via SSH');
    }

    // Wait for curl command to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const curlOutput = result.data?.stdout || '';
    console.log('[@action:browserAutomation:initializeBrowserAutomation] Curl output:', curlOutput);

    // Parse the response
    const httpStatusMatch = curlOutput.match(/HTTP_STATUS:(\d+)/);
    const httpStatus = httpStatusMatch ? parseInt(httpStatusMatch[1]) : 0;

    if (httpStatus !== 200) {
      return {
        success: false,
        error: `Flask server returned HTTP ${httpStatus}. Server may not be running on host.`,
      };
    }

    // Extract JSON response (everything before HTTP_STATUS line)
    const jsonResponse = curlOutput.split('HTTP_STATUS:')[0].trim();
    
    try {
      const data = JSON.parse(jsonResponse);
      
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
    } catch (parseError: any) {
      console.error('[@action:browserAutomation:initializeBrowserAutomation] Failed to parse JSON response:', parseError);
      return {
        success: false,
        error: 'Invalid response from automation server',
      };
    }
  } catch (error: any) {
    console.error('[@action:browserAutomation:initializeBrowserAutomation] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to initialize browser automation',
    };
  }
}

export async function executeBrowserTask(task: string, sessionId: string): Promise<ActionResult<{
  result: string;
  status: string;
  logs: string;
}>> {
  try {
    console.log('[@action:browserAutomation:executeBrowserTask] Executing task via existing session:', sessionId, 'Task:', task);
    
    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Use existing session instead of creating new one
    const terminalService = (await import('@/lib/services/terminalService')).default;

    // Escape the task for JSON
    const escapedTask = task.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    // Execute curl command to execute task on the host
    const curlCommand = `curl -X POST http://localhost:5001/execute -H "Content-Type: application/json" -d '{"task":"${escapedTask}"}' -w "\\nHTTP_STATUS:%{http_code}\\n" -s`;
    
    console.log('[@action:browserAutomation:executeBrowserTask] Executing curl command via existing session');
    const result = await terminalService.sendDataToSession(sessionId, curlCommand);

    if (!result.success) {
      throw new Error('Failed to execute curl command via SSH');
    }

    // Wait for curl command to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const curlOutput = result.data?.stdout || '';
    console.log('[@action:browserAutomation:executeBrowserTask] Curl output:', curlOutput);

    // Parse the response
    const httpStatusMatch = curlOutput.match(/HTTP_STATUS:(\d+)/);
    const httpStatus = httpStatusMatch ? parseInt(httpStatusMatch[1]) : 0;

    if (httpStatus !== 200) {
      return {
        success: false,
        error: `Flask server returned HTTP ${httpStatus}. Server may not be running on host.`,
      };
    }

    // Extract JSON response (everything before HTTP_STATUS line)
    const jsonResponse = curlOutput.split('HTTP_STATUS:')[0].trim();
    
    try {
      const data = JSON.parse(jsonResponse);
      
      return {
        success: data.success,
        data: {
          result: data.result || '',
          status: data.status || 'UNKNOWN',
          logs: data.logs || '',
        },
        error: data.success ? undefined : (data.result || 'Task execution failed'),
      };
    } catch (parseError: any) {
      console.error('[@action:browserAutomation:executeBrowserTask] Failed to parse JSON response:', parseError);
      return {
        success: false,
        error: 'Invalid response from automation server',
      };
    }
  } catch (error: any) {
    console.error('[@action:browserAutomation:executeBrowserTask] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to execute browser task',
    };
  }
}

export async function cleanupBrowserAutomation(sessionId: string): Promise<ActionResult<{
  message: string;
  logs: string;
}>> {
  try {
    console.log('[@action:browserAutomation:cleanupBrowserAutomation] Cleaning up browser via existing session:', sessionId);
    
    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Use existing session instead of creating new one
    const terminalService = (await import('@/lib/services/terminalService')).default;

    // Execute curl command to cleanup browser on the host
    const curlCommand = `curl -X POST http://localhost:5001/cleanup -H "Content-Type: application/json" -w "\\nHTTP_STATUS:%{http_code}\\n" -s`;
    
    console.log('[@action:browserAutomation:cleanupBrowserAutomation] Executing curl command via existing session');
    const result = await terminalService.sendDataToSession(sessionId, curlCommand);

    if (!result.success) {
      throw new Error('Failed to execute curl command via SSH');
    }

    // Wait for curl command to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const curlOutput = result.data?.stdout || '';
    console.log('[@action:browserAutomation:cleanupBrowserAutomation] Curl output:', curlOutput);

    // Parse the response
    const httpStatusMatch = curlOutput.match(/HTTP_STATUS:(\d+)/);
    const httpStatus = httpStatusMatch ? parseInt(httpStatusMatch[1]) : 0;

    if (httpStatus !== 200) {
      return {
        success: false,
        error: `Flask server returned HTTP ${httpStatus}. Server may not be running on host.`,
      };
    }

    // Extract JSON response (everything before HTTP_STATUS line)
    const jsonResponse = curlOutput.split('HTTP_STATUS:')[0].trim();
    
    try {
      const data = JSON.parse(jsonResponse);
      
      return {
        success: data.success,
        data: {
          message: data.message || 'Browser cleanup completed',
          logs: data.logs || '',
        },
        error: data.success ? undefined : (data.message || 'Cleanup failed'),
      };
    } catch (parseError: any) {
      console.error('[@action:browserAutomation:cleanupBrowserAutomation] Failed to parse JSON response:', parseError);
      return {
        success: false,
        error: 'Invalid response from automation server',
      };
    }
  } catch (error: any) {
    console.error('[@action:browserAutomation:cleanupBrowserAutomation] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to cleanup browser automation',
    };
  }
} 