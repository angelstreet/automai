import { useState, useEffect, useCallback, useRef } from 'react';

import { Host } from '../../types/common/Host_Types';

interface PlaywrightWebSession {
  connected: boolean;
  host: Host;
  connectionTime?: Date;
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
          signal: AbortSignal.timeout(600000), // 10 minutes timeout
        });

        const result = await response.json();

        console.log(`[@hook:usePlaywrightWeb] Raw command result:`, result);

        // Return the raw server response instead of filtering it
        return result;
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

        const { command, params } = parsedCommand;

        if (!command) {
          throw new Error('Command field is required in JSON');
        }

        // Add command to history
        const newHistory = [...commandHistory, commandStr];
        setCommandHistory(newHistory);

        // Execute command
        const result = await executeWebCommand(command, params || {});

        // Always show full JSON response
        let resultOutput = JSON.stringify(result, null, 2);
        setTerminalOutput(resultOutput);

        // Keep page state updates
        if (command === 'navigate_to_url' || command === 'get_page_info') {
          setCurrentUrl(result.url || '');
          setPageTitle(result.title || '');
        }

        return result;
      } catch (error) {
        console.error('[@hook:usePlaywrightWeb] Command execution error:', error);

        const errorResult = { success: false, error: String(error) };
        const errorOutput = JSON.stringify(errorResult, null, 2);
        setTerminalOutput(errorOutput);

        return errorResult;
      } finally {
        setIsExecuting(false);
      }
    },
    [session.connected, isExecuting, commandHistory, executeWebCommand],
  );

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
    clearTerminal,
    resetState,
    handleDisconnect,
    setCurrentCommand,
    getStatus,

    // Refs
    terminalRef,
  };
};
