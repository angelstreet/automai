import { useState, useEffect, useCallback, useRef } from 'react';

import { Host } from '../../types/common/Host_Types';

interface BashDesktopSession {
  connected: boolean;
  host: Host;
  deviceId: string;
  connectionTime?: Date;
}

interface SystemInfo {
  os_name: string;
  os_version: string;
  architecture: string;
  uptime: string;
  distribution: string;
}

interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  exit_code?: number;
  execution_time?: number;
}

interface FileResult {
  success: boolean;
  content?: string;
  error?: string;
}

interface DirectoryResult {
  success: boolean;
  files?: string[];
  error?: string;
}

export const useBashDesktop = (host: Host, deviceId: string) => {
  // Session state
  const [session, setSession] = useState<BashDesktopSession>({
    connected: false,
    host,
    deviceId,
  });

  // Terminal state
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // File operations state
  const [currentDirectory, setCurrentDirectory] = useState<string>('/');
  const [directoryContents, setDirectoryContents] = useState<string[]>([]);
  const [isFileMode, setIsFileMode] = useState(false);
  const [currentFile, setCurrentFile] = useState<{
    path: string;
    content: string;
    modified: boolean;
  } | null>(null);

  // System state
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
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

  // Execute desktop command using direct fetch to server route (following remote pattern)
  const executeDesktopCommand = useCallback(
    async (command: string, options: { working_dir?: string; timeout?: number } = {}) => {
      try {
        console.log(
          `[@hook:useBashDesktop] Executing command on ${host.host_name}:${deviceId}:`,
          command,
        );

        const response = await fetch('/server/desktop/executeCommand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: host,
            device_id: deviceId,
            command: 'execute_bash_command',
            params: {
              command: command,
              working_dir: options.working_dir,
              timeout: options.timeout || 30,
            },
          }),
        });

        const result = await response.json();

        console.log(`[@hook:useBashDesktop] Raw command result:`, result);

        // Handle nested response structure - actual result may be in result.success
        const actualResult =
          result.success && typeof result.success === 'object' ? result.success : result;

        console.log(`[@hook:useBashDesktop] Processed command result:`, {
          success: actualResult.success,
          exit_code: actualResult.exit_code,
          output_length: actualResult.output?.length || 0,
        });

        return {
          success: actualResult.success || false,
          output: actualResult.output || '',
          error: actualResult.error || '',
          exit_code: actualResult.exit_code || 0,
          execution_time: actualResult.execution_time || 0,
        };
      } catch (error) {
        console.error(`[@hook:useBashDesktop] Command execution error:`, error);
        return {
          success: false,
          error: `Failed to execute command: ${error}`,
          exit_code: -1,
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
        console.log('[@hook:useBashDesktop] Initializing connection for', deviceId);

        // Test connection with a simple command
        const result = await executeDesktopCommand('echo "Connection test"');

        if (result.success) {
          setSession({
            connected: true,
            host,
            deviceId,
            connectionTime: new Date(),
          });

          // Get system information
          await getSystemInfo();

          // Get initial working directory
          await getCurrentDirectory();

          console.log('[@hook:useBashDesktop] Connection established successfully');
        } else {
          console.error('[@hook:useBashDesktop] Connection failed:', result.error);
        }
      } catch (error) {
        console.error('[@hook:useBashDesktop] Connection error:', error);
      }
    };

    initializeConnection();
  }, [host, deviceId]);

  // Get system information
  const getSystemInfo = useCallback(async () => {
    try {
      const result = await executeDesktopCommand(
        'uname -a && echo "---" && cat /etc/os-release 2>/dev/null || echo "Unknown"',
      );

      if (result.success && result.output) {
        // Parse system info from output
        const lines = result.output.split('\n');
        const unameInfo = lines[0]?.split(' ') || [];

        const info: SystemInfo = {
          os_name: unameInfo[0] || 'Unknown',
          os_version: unameInfo[2] || 'Unknown',
          architecture: unameInfo[unameInfo.length - 1] || 'Unknown',
          uptime: 'Unknown',
          distribution: 'Unknown',
        };

        // Try to parse distribution info
        const osReleaseStart = lines.findIndex((line: string) => line === '---');
        if (osReleaseStart !== -1) {
          const osReleaseLines = lines.slice(osReleaseStart + 1);
          const prettyNameLine = osReleaseLines.find((line: string) =>
            line.startsWith('PRETTY_NAME='),
          );
          if (prettyNameLine) {
            info.distribution = prettyNameLine.split('=')[1]?.replace(/"/g, '') || 'Unknown';
          }
        }

        setSystemInfo(info);
      }
    } catch (error) {
      console.error('[@hook:useBashDesktop] Error getting system info:', error);
    }
  }, [executeDesktopCommand]);

  // Get current working directory
  const getCurrentDirectory = useCallback(async () => {
    try {
      const result = await executeDesktopCommand('pwd');

      if (result.success && result.output) {
        setCurrentDirectory(result.output.trim());
      }
    } catch (error) {
      console.error('[@hook:useBashDesktop] Error getting current directory:', error);
    }
  }, [executeDesktopCommand]);

  // Execute command
  const executeCommand = useCallback(
    async (command: string) => {
      if (!session.connected || isExecuting) {
        return { success: false, error: 'Not connected or already executing' };
      }

      setIsExecuting(true);

      try {
        console.log('[@hook:useBashDesktop] Executing command:', command);

        // Add command to history
        const newHistory = [...commandHistory, command];
        setCommandHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

        // Execute command
        const result = await executeDesktopCommand(command);

        // Build complete output with command and result
        const commandLine = `$ ${command}\n`;
        let resultOutput = '';
        if (result.success) {
          resultOutput = result.output || '';
        } else {
          resultOutput = `Error: ${result.error || 'Command failed'}`;
        }

        // Update terminal output with command + result in one go
        const newOutput = terminalOutput + commandLine + resultOutput + '\n';
        setTerminalOutput(newOutput);

        // Update working directory if it's a cd command
        if (command.startsWith('cd ')) {
          await getCurrentDirectory();
        }

        return result;
      } catch (error) {
        console.error('[@hook:useBashDesktop] Command execution error:', error);

        const commandLine = `$ ${command}\n`;
        const errorOutput = `Error: ${error}\n`;
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
      executeDesktopCommand,
      getCurrentDirectory,
    ],
  );

  // Change directory
  const changeDirectory = useCallback(
    async (path: string) => {
      return await executeCommand(`cd ${path}`);
    },
    [executeCommand],
  );

  // List directory contents
  const listDirectory = useCallback(
    async (path: string = '.'): Promise<DirectoryResult> => {
      try {
        const result = await executeDesktopCommand(`ls -la "${path}"`);

        if (result.success && result.output) {
          const files = result.output.split('\n').filter((line: string) => line.trim() !== '');
          return { success: true, files };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
    [executeDesktopCommand],
  );

  // Read file content
  const readFile = useCallback(
    async (filePath: string): Promise<FileResult> => {
      try {
        const result = await executeDesktopCommand(`cat "${filePath}"`);

        if (result.success) {
          return { success: true, content: result.output || '' };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
    [executeDesktopCommand],
  );

  // Write file content
  const writeFile = useCallback(
    async (filePath: string, content: string): Promise<FileResult> => {
      try {
        // Use echo to write content to file
        const escapedContent = content.replace(/'/g, "'\"'\"'");
        const result = await executeDesktopCommand(`echo '${escapedContent}' > "${filePath}"`);

        if (result.success) {
          return { success: true };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
    [executeDesktopCommand],
  );

  // Clear terminal
  const clearTerminal = useCallback(() => {
    setTerminalOutput('');
  }, []);

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    setIsExecuting(false); // Ensure execution state is reset

    try {
      console.log('[@hook:useBashDesktop] Disconnecting from desktop session');

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
      setCurrentDirectory('~');
      setDirectoryContents([]);
      setIsFileMode(false);
      setCurrentFile(null);
      setSystemInfo(null);

      console.log('[@hook:useBashDesktop] Disconnected successfully');
    } catch (error) {
      console.error('[@hook:useBashDesktop] Disconnect error:', error);
    } finally {
      // No need to set isDisconnecting to false here, as it's removed.
    }
  }, [host, deviceId]);

  return {
    // State
    session,
    terminalOutput,
    commandHistory,
    currentCommand,
    currentDirectory,
    directoryContents,
    isFileMode,
    currentFile,
    systemInfo,
    isExecuting,
    isLoading,
    error,

    // Actions
    executeCommand,
    changeDirectory,
    listDirectory,
    readFile,
    writeFile,
    clearTerminal,
    handleDisconnect,
    setCurrentCommand,

    // Configuration
    // layoutConfig, // Removed as per new_code
    terminalRef,
  };
};
