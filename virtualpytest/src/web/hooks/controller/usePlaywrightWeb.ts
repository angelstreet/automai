import { useState, useEffect, useCallback, useRef } from 'react';

import { Host } from '../../types/common/Host_Types';

interface PlaywrightWebSession {
  connected: boolean;
  host: Host;
  connectionTime?: Date;
}

interface WebCommandResult {
  success: boolean;
  url?: string;
  title?: string;
  result?: any;
  error?: string;
  execution_time?: number;
}

export const usePlaywrightWeb = (host: Host) => {
  // Session state
  const [session, setSession] = useState<PlaywrightWebSession>({
    connected: false,
    host,
  });

  // Terminal state for command output
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Page state
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [pageTitle, setPageTitle] = useState<string>('');
  const [error] = useState<string | null>(null);

  // Auto-scroll terminal ref
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Execute web command using direct fetch to server route (following remote pattern)
  const executeWebCommand = useCallback(
    async (command: string, params: any = {}) => {
      try {
        console.log(
          `[@hook:usePlaywrightWeb] Executing command on ${host.host_name}:`,
          command,
          params,
        );

        const response = await fetch('/server/web/executeCommand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: host,
            command: command,
            params: params,
          }),
        });

        const result = await response.json();

        console.log(`[@hook:usePlaywrightWeb] Raw command result:`, result);

        return {
          success: result.success || false,
          url: result.url || '',
          title: result.title || '',
          result: result.result,
          error: result.error || '',
          execution_time: result.execution_time || 0,
        };
      } catch (error) {
        console.error(`[@hook:usePlaywrightWeb] Command execution error:`, error);
        return {
          success: false,
          error: `Failed to execute command: ${error}`,
          execution_time: 0,
        };
      }
    },
    [host],
  );

  // Get web controller status
  const getStatus = useCallback(async () => {
    try {
      const response = await fetch('/server/web/getStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }, [host]);

  // Initialize connection
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        console.log('[@hook:usePlaywrightWeb] Initializing connection for', host.host_name);

        // Test connection by getting status
        const result = await getStatus();

        if (result.success) {
          setSession({
            connected: true,
            host,
            connectionTime: new Date(),
          });

          console.log('[@hook:usePlaywrightWeb] Connection established successfully');
        } else {
          console.error('[@hook:usePlaywrightWeb] Connection failed:', result.error);
        }
      } catch (error) {
        console.error('[@hook:usePlaywrightWeb] Connection error:', error);
      }
    };

    initializeConnection();
  }, [host, getStatus]);

  // Execute command with JSON parsing and terminal output
  const executeCommand = useCallback(
    async (commandStr: string) => {
      if (!session.connected || isExecuting) {
        return { success: false, error: 'Not connected or already executing' };
      }

      setIsExecuting(true);

      try {
        console.log('[@hook:usePlaywrightWeb] Executing command:', commandStr);

        // Parse JSON command
        let parsedCommand;
        try {
          parsedCommand = JSON.parse(commandStr);
        } catch {
          throw new Error(
            'Invalid JSON command format. Expected: {"command": "...", "params": {...}}',
          );
        }

        const { command, ...params } = parsedCommand;

        if (!command) {
          throw new Error('Command field is required in JSON');
        }

        // Add command to history
        const newHistory = [...commandHistory, commandStr];
        setCommandHistory(newHistory);

        // Execute command
        const result = await executeWebCommand(command, params);

        // Build complete output with command and result
        const commandLine = `$ ${commandStr}\n`;
        let resultOutput = '';
        if (result.success) {
          if (result.url) {
            resultOutput += `URL: ${result.url}\n`;
          }
          if (result.title) {
            resultOutput += `Title: ${result.title}\n`;
          }
          if (result.result !== undefined) {
            resultOutput += `Result: ${JSON.stringify(result.result, null, 2)}\n`;
          }
          resultOutput += `✅ Success (${result.execution_time}ms)\n`;

          // Update page state for navigation commands
          if (command === 'navigate_to_url' || command === 'get_page_info') {
            setCurrentUrl(result.url || '');
            setPageTitle(result.title || '');
          }
        } else {
          resultOutput = `❌ Error: ${result.error || 'Command failed'}\n`;
        }

        // Update terminal output with command + result
        const newOutput = terminalOutput + commandLine + resultOutput + '\n';
        setTerminalOutput(newOutput);

        return result;
      } catch (error) {
        console.error('[@hook:usePlaywrightWeb] Command execution error:', error);

        const commandLine = `$ ${commandStr}\n`;
        const errorOutput = `❌ Error: ${error}\n`;
        setTerminalOutput(terminalOutput + commandLine + errorOutput);

        return { success: false, error: String(error) };
      } finally {
        setIsExecuting(false);
      }
    },
    [session.connected, isExecuting, terminalOutput, commandHistory, executeWebCommand],
  );

  // Open browser (convenience method)
  const openBrowser = useCallback(async (): Promise<WebCommandResult> => {
    try {
      console.log(`[@hook:usePlaywrightWeb] Opening browser on ${host.host_name}`);

      const response = await fetch('/server/web/openBrowser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: host }),
      });

      const result = await response.json();

      // Update session state when browser is opened successfully
      if (result.success) {
        console.log(`[@hook:usePlaywrightWeb] Browser opened successfully, updating session state`);
        setSession((prev) => ({
          ...prev,
          connected: true,
          connectionTime: new Date(),
        }));
      }

      return {
        success: result.success || false,
        error: result.error || '',
        execution_time: result.execution_time || 0,
      };
    } catch (error) {
      console.error(`[@hook:usePlaywrightWeb] Open browser error:`, error);
      return {
        success: false,
        error: `Failed to open browser: ${error}`,
        execution_time: 0,
      };
    }
  }, [host]);

  // Close browser (convenience method)
  const closeBrowser = useCallback(async (): Promise<WebCommandResult> => {
    try {
      console.log(`[@hook:usePlaywrightWeb] Closing browser on ${host.host_name}`);

      const response = await fetch('/server/web/closeBrowser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: host }),
      });

      const result = await response.json();

      // Reset frontend state when browser is closed successfully
      if (result.success) {
        console.log(
          `[@hook:usePlaywrightWeb] Browser closed successfully, resetting frontend state`,
        );
        setCurrentUrl('');
        setPageTitle('');

        // Update session state to reflect browser is closed
        setSession((prev) => ({
          ...prev,
          connected: false,
        }));
      }

      return {
        success: result.success || false,
        error: result.error || '',
        execution_time: result.execution_time || 0,
      };
    } catch (error) {
      console.error(`[@hook:usePlaywrightWeb] Close browser error:`, error);
      return {
        success: false,
        error: `Failed to close browser: ${error}`,
        execution_time: 0,
      };
    }
  }, [host]);

  // Navigate to URL (convenience method)
  const navigateToUrl = useCallback(
    async (url: string): Promise<WebCommandResult> => {
      try {
        console.log(`[@hook:usePlaywrightWeb] Navigating to ${url} on ${host.host_name}`);

        const response = await fetch('/server/web/navigateToUrl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: host, url: url }),
        });

        const result = await response.json();

        // Update page state for navigation
        if (result.success) {
          setCurrentUrl(result.url || url);
          setPageTitle(result.title || '');
        }

        return {
          success: result.success || false,
          url: result.url || '',
          title: result.title || '',
          error: result.error || '',
          execution_time: result.execution_time || 0,
        };
      } catch (error) {
        console.error(`[@hook:usePlaywrightWeb] Navigate error:`, error);
        return {
          success: false,
          error: `Failed to navigate: ${error}`,
          execution_time: 0,
        };
      }
    },
    [host],
  );

  // Click element (convenience method)
  const clickElement = useCallback(
    async (selector: string): Promise<WebCommandResult> => {
      try {
        console.log(`[@hook:usePlaywrightWeb] Clicking element ${selector} on ${host.host_name}`);

        const response = await fetch('/server/web/executeCommand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: host,
            command: 'click_element',
            params: { selector },
          }),
        });

        const result = await response.json();
        return {
          success: result.success || false,
          error: result.error || '',
          execution_time: result.execution_time || 0,
        };
      } catch (error) {
        console.error(`[@hook:usePlaywrightWeb] Click element error:`, error);
        return {
          success: false,
          error: `Failed to click element: ${error}`,
          execution_time: 0,
        };
      }
    },
    [host],
  );

  // Input text (convenience method)
  const inputText = useCallback(
    async (selector: string, text: string): Promise<WebCommandResult> => {
      try {
        console.log(`[@hook:usePlaywrightWeb] Inputting text to ${selector} on ${host.host_name}`);

        const response = await fetch('/server/web/executeCommand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: host,
            command: 'input_text',
            params: { selector, text },
          }),
        });

        const result = await response.json();
        return {
          success: result.success || false,
          error: result.error || '',
          execution_time: result.execution_time || 0,
        };
      } catch (error) {
        console.error(`[@hook:usePlaywrightWeb] Input text error:`, error);
        return {
          success: false,
          error: `Failed to input text: ${error}`,
          execution_time: 0,
        };
      }
    },
    [host],
  );

  // Get page info (convenience method)
  const getPageInfo = useCallback(async (): Promise<WebCommandResult> => {
    try {
      console.log(`[@hook:usePlaywrightWeb] Getting page info from ${host.host_name}`);

      const response = await fetch('/server/web/getPageInfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: host }),
      });

      const result = await response.json();

      // Update page state
      if (result.success) {
        setCurrentUrl(result.url || '');
        setPageTitle(result.title || '');
      }

      return {
        success: result.success || false,
        url: result.url || '',
        title: result.title || '',
        error: result.error || '',
        execution_time: result.execution_time || 0,
      };
    } catch (error) {
      console.error(`[@hook:usePlaywrightWeb] Get page info error:`, error);
      return {
        success: false,
        error: `Failed to get page info: ${error}`,
        execution_time: 0,
      };
    }
  }, [host]);

  // Clear terminal
  const clearTerminal = useCallback(() => {
    setTerminalOutput('');
  }, []);

  // Reset all state to initial values
  const resetState = useCallback(() => {
    console.log('[@hook:usePlaywrightWeb] Resetting all state to initial values');
    setSession({
      connected: false,
      host,
    });
    setTerminalOutput('');
    setCommandHistory([]);
    setCurrentCommand('');
    setCurrentUrl('');
    setPageTitle('');
    setIsExecuting(false);
  }, [host]);

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    setIsExecuting(false);

    try {
      console.log('[@hook:usePlaywrightWeb] Disconnecting from web session');

      // Use the resetState function for consistency
      resetState();

      console.log('[@hook:usePlaywrightWeb] Disconnected successfully');
    } catch (error) {
      console.error('[@hook:usePlaywrightWeb] Disconnect error:', error);
    }
  }, [resetState]);

  return {
    // State
    session,
    terminalOutput,
    commandHistory,
    currentCommand,
    currentUrl,
    pageTitle,
    isExecuting,
    error,

    // Actions
    executeCommand,
    navigateToUrl,
    clickElement,
    inputText,
    getPageInfo,
    clearTerminal,
    resetState,
    handleDisconnect,
    setCurrentCommand,
    getStatus,
    openBrowser,
    closeBrowser,

    // Refs
    terminalRef,
  };
};
