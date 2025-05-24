'use client';

import { useEffect, useRef, useState } from 'react';

import { Host } from '@/types/component/hostComponentType';

interface TerminalEmulatorProps {
  sessionId: string;
  host: Host;
  onConnectionStatusChange: (connected: boolean) => void;
}

export function TerminalEmulator({
  sessionId,
  host,
  onConnectionStatusChange,
}: TerminalEmulatorProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<any>(null);
  const fitAddon = useRef<any>(null);
  const currentInput = useRef<string>('');
  const currentDirectory = useRef<string>(host.is_windows ? `C:\\Users\\${host.user}` : '~'); // Track current directory
  const [isTerminalReady, setIsTerminalReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeTerminal = async () => {
      if (!terminalRef.current || terminalInstance.current) return;

      console.log(`[@component:TerminalEmulator] Initializing terminal for session: ${sessionId}`);

      try {
        // Dynamically import xterm to avoid SSR issues
        const { Terminal } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');
        const { WebLinksAddon } = await import('@xterm/addon-web-links');

        if (!mounted) return;

        // Create terminal instance
        const terminal = new Terminal({
          cursorBlink: true,
          theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#d4d4d4',
            selection: 'rgba(255, 255, 255, 0.3)',
            black: '#000000',
            red: '#cd3131',
            green: '#0dbc79',
            yellow: '#e5e510',
            blue: '#2472c8',
            magenta: '#bc3fbc',
            cyan: '#11a8cd',
            white: '#e5e5e5',
            brightBlack: '#666666',
            brightRed: '#f14c4c',
            brightGreen: '#23d18b',
            brightYellow: '#f5f543',
            brightBlue: '#3b8eea',
            brightMagenta: '#d670d6',
            brightCyan: '#29b8db',
            brightWhite: '#e5e5e5',
          },
          fontSize: 14,
          fontFamily:
            '"Cascadia Code", "Fira Code", "JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
          lineHeight: 1.2,
          allowTransparency: false,
          convertEol: true,
          scrollback: 1000,
        });

        // Add addons
        const fit = new FitAddon();
        const webLinks = new WebLinksAddon();

        terminal.loadAddon(fit);
        terminal.loadAddon(webLinks);

        // Store references
        terminalInstance.current = terminal;
        fitAddon.current = fit;

        // Open terminal in the DOM
        terminal.open(terminalRef.current);

        // Focus the terminal immediately
        terminal.focus();

        // Fit to container
        setTimeout(() => {
          fit.fit();
        }, 100);

        // Handle user input - collect input until Enter
        terminal.onData((data) => {
          handleTerminalInput(data, terminal);
        });

        // Handle terminal resize
        terminal.onResize(({ cols, rows }) => {
          console.log(`[@component:TerminalEmulator] Terminal resized: ${cols}x${rows}`);
        });

        // Show initial prompt
        showInitialPrompt(terminal);

        setIsTerminalReady(true);
        onConnectionStatusChange(true);

        console.log(`[@component:TerminalEmulator] Terminal initialized successfully`);
      } catch (error) {
        console.error(`[@component:TerminalEmulator] Error initializing terminal:`, error);
        onConnectionStatusChange(false);
      }
    };

    const showInitialPrompt = (terminal: any) => {
      // Show welcome and initial prompt
      terminal.write(`\r\n🔗 Connected to ${host.name} (${host.ip}:${host.port || 22})\r\n`);
      showPrompt(terminal);
    };

    const handleTerminalInput = async (data: string, terminal: any) => {
      // Handle special keys
      if (data === '\r' || data === '\n') {
        // Enter pressed - execute command
        terminal.write('\r\n');

        if (currentInput.current.trim()) {
          await executeCommand(currentInput.current.trim(), terminal);
        }

        currentInput.current = '';
        showPrompt(terminal);
      } else if (data === '\x7f') {
        // Backspace
        if (currentInput.current.length > 0) {
          currentInput.current = currentInput.current.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (data === '\x03') {
        // Ctrl+C
        terminal.write('^C\r\n');
        currentInput.current = '';
        showPrompt(terminal);
      } else if (data.charCodeAt(0) >= 32) {
        // Printable characters
        currentInput.current += data;
        terminal.write(data);
      }
    };

    const executeCommand = async (command: string, terminal: any) => {
      try {
        console.log(`[@component:TerminalEmulator] Executing command: ${command}`);

        // Handle cd command specially to track directory changes
        let actualCommand = command;
        let isCdCommand = false;

        if (command.startsWith('cd ') || command === 'cd') {
          isCdCommand = true;
          const targetDir =
            command.substring(3).trim() || (host.is_windows ? `C:\\Users\\${host.user}` : '~');

          if (host.is_windows) {
            // For Windows, first change directory, then get current directory
            actualCommand = `cd "${targetDir}" 2>$null; if ($?) { pwd } else { Write-Error "Cannot access path" }`;
          } else {
            // For Linux/Unix, change directory and get pwd
            actualCommand = `cd "${targetDir}" 2>/dev/null && pwd || echo "cd: cannot access '${targetDir}': No such file or directory"`;
          }
        } else if (!host.is_windows && currentDirectory.current !== '~') {
          // For non-cd commands on Linux, prefix with cd to current directory
          actualCommand = `cd "${currentDirectory.current}" && ${command}`;
        } else if (host.is_windows && currentDirectory.current !== `C:\\Users\\${host.user}`) {
          // For non-cd commands on Windows, prefix with cd to current directory
          actualCommand = `cd "${currentDirectory.current}"; ${command}`;
        }

        // Import terminal action
        const { sendTerminalData } = await import('@/app/actions/terminalsAction');
        const result = await sendTerminalData(sessionId, actualCommand);

        console.log(`[@component:TerminalEmulator] Command result:`, {
          success: result.success,
          hasData: !!result.data,
          hasStdout: !!result.data?.stdout,
          hasStderr: !!result.data?.stderr,
          error: result.error,
          isCdCommand,
        });

        if (result.success && result.data) {
          // Handle cd command results
          if (isCdCommand) {
            if (result.data.stdout && !result.data.stderr) {
              // Successfully changed directory, update our tracking
              const newDir = result.data.stdout.trim();
              currentDirectory.current = newDir;
              console.log(`[@component:TerminalEmulator] Directory changed to: ${newDir}`);
              // Don't show the pwd output for cd commands
            } else if (result.data.stderr) {
              // Show error for failed cd
              terminal.write(`\x1b[31m${result.data.stderr.trim()}\x1b[0m\r\n`);
            } else {
              // Fallback error message
              terminal.write(`\x1b[31mcd: command failed\x1b[0m\r\n`);
            }
          } else {
            // Display normal command output
            if (result.data.stdout) {
              console.log(`[@component:TerminalEmulator] Writing stdout:`, result.data.stdout);
              terminal.write(result.data.stdout);
            }
            if (result.data.stderr) {
              console.log(`[@component:TerminalEmulator] Writing stderr:`, result.data.stderr);
              terminal.write(`\x1b[31m${result.data.stderr}\x1b[0m`);
            }

            // If no output, show a message
            if (!result.data.stdout && !result.data.stderr) {
              terminal.write(`\x1b[90m(command completed with no output)\x1b[0m\r\n`);
            }
          }
        } else {
          console.error(`[@component:TerminalEmulator] Command failed:`, result.error);
          terminal.write(`\x1b[31mError: ${result.error || 'Command failed'}\x1b[0m\r\n`);
        }
      } catch (error) {
        console.error(`[@component:TerminalEmulator] Error executing command:`, error);
        terminal.write(
          `\x1b[31mError: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m\r\n`,
        );
      }
    };

    const showPrompt = (terminal: any) => {
      if (host.is_windows) {
        terminal.write(`PS ${currentDirectory.current}> `);
      } else {
        const shortDir =
          currentDirectory.current === '/home/' + host.user || currentDirectory.current === '~'
            ? '~'
            : currentDirectory.current;
        terminal.write(`${host.user}@${host.name}:${shortDir}$ `);
      }
    };

    initializeTerminal();

    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current) {
        setTimeout(() => {
          fitAddon.current.fit();
        }, 100);
      }
    };

    // Handle focus to ensure terminal gets input
    const handleFocus = () => {
      if (terminalInstance.current) {
        terminalInstance.current.focus();
      }
    };

    window.addEventListener('resize', handleResize);

    // Focus on any click in the terminal area
    if (terminalRef.current) {
      terminalRef.current.addEventListener('click', handleFocus);
    }

    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);

      if (terminalRef.current) {
        terminalRef.current.removeEventListener('click', handleFocus);
      }

      if (terminalInstance.current) {
        console.log(`[@component:TerminalEmulator] Disposing terminal`);
        terminalInstance.current.dispose();
        terminalInstance.current = null;
      }
    };
  }, [sessionId, host, onConnectionStatusChange]);

  // Auto-resize when terminal becomes ready
  useEffect(() => {
    if (isTerminalReady && fitAddon.current) {
      const resizeTimer = setTimeout(() => {
        fitAddon.current.fit();
        // Focus after resize
        if (terminalInstance.current) {
          terminalInstance.current.focus();
        }
      }, 200);

      return () => clearTimeout(resizeTimer);
    }
  }, [isTerminalReady]);

  return (
    <div
      className="w-full h-full bg-[#1e1e1e] relative"
      onClick={() => {
        // Ensure terminal gets focus on any click
        if (terminalInstance.current) {
          terminalInstance.current.focus();
        }
      }}
    >
      <div ref={terminalRef} className="w-full h-full" style={{ padding: '8px 8px 48px 8px' }} />
    </div>
  );
}
