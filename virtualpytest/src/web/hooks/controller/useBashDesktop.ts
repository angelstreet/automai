import { useState, useCallback, useRef, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';

export const useBashDesktop = (host: Host, _deviceId: string) => {
  // Minimal terminal state
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Execute command directly
  const executeCommand = useCallback(
    async (command: string) => {
      if (isExecuting || !command.trim()) {
        return { success: false, error: 'Already executing or empty command' };
      }

      setIsExecuting(true);

      try {
        console.log('[@hook:useBashDesktop] Executing command:', command);

        const response = await fetch('/server/desktop/executeCommand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: host,
            command: 'execute_bash_command',
            params: {
              command: command,
              timeout: 30,
            },
          }),
        });

        const result = await response.json();

        // Update terminal output
        const commandLine = `$ ${command}\n`;
        const resultOutput = result.success
          ? result.output || ''
          : `Error: ${result.error || 'Command failed'}`;
        setTerminalOutput((prev) => prev + commandLine + resultOutput + '\n');

        return result;
      } catch (error) {
        console.error('[@hook:useBashDesktop] Command execution error:', error);
        const commandLine = `$ ${command}\n`;
        const errorOutput = `Error: ${error}\n`;
        setTerminalOutput((prev) => prev + commandLine + errorOutput);
        return { success: false, error: String(error) };
      } finally {
        setIsExecuting(false);
      }
    },
    [host, isExecuting],
  );

  // Handle form submit
  const handleCommandSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (currentCommand.trim()) {
        await executeCommand(currentCommand.trim());
        setCurrentCommand('');
      }
    },
    [currentCommand, executeCommand],
  );

  // Clear terminal
  const clearTerminal = useCallback(() => {
    setTerminalOutput('');
  }, []);

  // Simple disconnect (just clears terminal)
  const handleDisconnect = useCallback(async () => {
    setTerminalOutput('');
    setCurrentCommand('');
  }, []);

  return {
    // Minimal state
    session: { connected: true }, // Always connected - no real session
    terminalOutput,
    currentCommand,
    isExecuting,

    // Actions
    executeCommand,
    handleCommandSubmit,
    clearTerminal,
    handleDisconnect,
    setCurrentCommand,

    // Ref
    terminalRef,
  };
};
