import { useState, useCallback, useRef, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';

export const usePyAutoGUI = (host: Host, _deviceId: string) => {
  // Minimal state similar to bash
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

  // Execute PyAutoGUI command
  const executeCommand = useCallback(
    async (command: string, params: any = {}) => {
      if (isExecuting) {
        return { success: false, error: 'Already executing command' };
      }

      setIsExecuting(true);

      try {
        console.log('[@hook:usePyAutoGUI] Executing command:', command, params);

        const response = await fetch('/server/desktop/executeCommand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: host,
            command: command,
            params: params,
          }),
        });

        const result = await response.json();

        // Update terminal output
        const commandLine = `> ${command} ${JSON.stringify(params)}\n`;
        const resultOutput = result.success
          ? result.output || 'Command executed successfully'
          : `Error: ${result.error || 'Command failed'}`;
        setTerminalOutput((prev) => prev + commandLine + resultOutput + '\n');

        return result;
      } catch (error) {
        console.error('[@hook:usePyAutoGUI] Command execution error:', error);
        const commandLine = `> ${command}\n`;
        const errorOutput = `Error: ${error}\n`;
        setTerminalOutput((prev) => prev + commandLine + errorOutput);
        return { success: false, error: String(error) };
      } finally {
        setIsExecuting(false);
      }
    },
    [host, isExecuting],
  );

  // Launch application
  const launchApp = useCallback(
    async (appName: string) => {
      return await executeCommand('execute_pyautogui_launch', { app_name: appName });
    },
    [executeCommand],
  );

  // Tap at coordinates
  const tap = useCallback(
    async (x: number, y: number) => {
      return await executeCommand('execute_pyautogui_click', { x, y });
    },
    [executeCommand],
  );

  // Send keys
  const sendKeys = useCallback(
    async (keys: string) => {
      // Handle key combinations like "ctrl+s" or single keys
      if (keys.includes('+')) {
        const keyArray = keys.split('+').map((k) => k.trim());
        return await executeCommand('execute_pyautogui_keypress', { keys: keyArray });
      } else {
        return await executeCommand('execute_pyautogui_keypress', { key: keys });
      }
    },
    [executeCommand],
  );

  // Type text
  const typeText = useCallback(
    async (text: string) => {
      return await executeCommand('execute_pyautogui_type', { text });
    },
    [executeCommand],
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
    // State
    session: { connected: true }, // Always connected like bash
    terminalOutput,
    currentCommand,
    isExecuting,

    // Command functions
    launchApp,
    tap,
    sendKeys,
    typeText,
    executeCommand,

    // UI actions
    clearTerminal,
    handleDisconnect,
    setCurrentCommand,

    // Ref
    terminalRef,
  };
};
