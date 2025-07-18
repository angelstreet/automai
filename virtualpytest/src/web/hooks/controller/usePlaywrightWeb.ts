import { useState, useEffect, useCallback, useRef } from 'react';

import { Host } from '../../types/common/Host_Types';

interface PlaywrightWebSession {
  connected: boolean;
  host: Host;
  deviceId: string;
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

export const usePlaywrightWeb = (host: Host, deviceId: string) => {
  // Session state
  const [session, setSession] = useState<PlaywrightWebSession>({
    connected: false,
    host,
    deviceId,
  });

  // Terminal state for command output
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Page state
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [pageTitle, setPageTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          `[@hook:usePlaywrightWeb] Executing command on ${host.host_name}:${deviceId}:`,
          command,
          params,
        );

        const response = await fetch('/server/web/executeCommand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: host,
            device_id: deviceId,
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
    [host, deviceId],
  );

  // Initialize connection
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        console.log('[@hook:usePlaywrightWeb] Initializing connection for', deviceId);

        // Test connection by getting status
        const result = await getStatus();

        if (result.success) {
          setSession({
            connected: true,
            host,
            deviceId,
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
  }, [host, deviceId]);

  // Get web controller status
  const getStatus = useCallback(async () => {
    try {
      const response = await fetch('/server/web/getStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host,
          device_id: deviceId,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }, [host, deviceId]);

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
        } catch (e) {
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
        setHistoryIndex(newHistory.length - 1);

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
    [
      session.connected,
      isExecuting,
      host,
      deviceId,
      terminalOutput,
      commandHistory,
      executeWebCommand,
    ],
  );

  // Navigate to URL (convenience method)
  const navigateToUrl = useCallback(
    async (url: string): Promise<WebCommandResult> => {
      return await executeWebCommand('navigate_to_url', { url });
    },
    [executeWebCommand],
  );

  // Click element (convenience method)
  const clickElement = useCallback(
    async (selector: string): Promise<WebCommandResult> => {
      return await executeWebCommand('click_element', { selector });
    },
    [executeWebCommand],
  );

  // Input text (convenience method)
  const inputText = useCallback(
    async (selector: string, text: string): Promise<WebCommandResult> => {
      return await executeWebCommand('input_text', { selector, text });
    },
    [executeWebCommand],
  );

  // Get page info (convenience method)
  const getPageInfo = useCallback(async (): Promise<WebCommandResult> => {
    const result = await executeWebCommand('get_page_info');
    if (result.success) {
      setCurrentUrl(result.url || '');
      setPageTitle(result.title || '');
    }
    return result;
  }, [executeWebCommand]);

  // Clear terminal
  const clearTerminal = useCallback(() => {
    setTerminalOutput('');
  }, []);

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    setIsExecuting(false);

    try {
      console.log('[@hook:usePlaywrightWeb] Disconnecting from web session');

      // Clear state
      setSession({
        connected: false,
        host,
        deviceId,
      });

      setTerminalOutput('');
      setCommandHistory([]);
      setHistoryIndex(-1);
      setCurrentCommand('');
      setCurrentUrl('');
      setPageTitle('');

      console.log('[@hook:usePlaywrightWeb] Disconnected successfully');
    } catch (error) {
      console.error('[@hook:usePlaywrightWeb] Disconnect error:', error);
    }
  }, [host, deviceId]);

  return {
    // State
    session,
    terminalOutput,
    commandHistory,
    currentCommand,
    currentUrl,
    pageTitle,
    isExecuting,
    isLoading,
    error,

    // Actions
    executeCommand,
    navigateToUrl,
    clickElement,
    inputText,
    getPageInfo,
    clearTerminal,
    handleDisconnect,
    setCurrentCommand,
    getStatus,

    // Refs
    terminalRef,
  };
};
