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
            selectionBackground: 'rgba(255, 255, 255, 0.3)',
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

        // The persistent shell will provide its own initial prompt
        // No need to manually generate one

        setIsTerminalReady(true);
        onConnectionStatusChange(true);

        console.log(`[@component:TerminalEmulator] Terminal initialized successfully`);
      } catch (error) {
        console.error(`[@component:TerminalEmulator] Error initializing terminal:`, error);
        onConnectionStatusChange(false);
      }
    };

    const handleTerminalInput = async (data: string, terminal: any) => {
      // Handle special keys
      if (data === '\r' || data === '\n') {
        // Enter pressed - execute command
        terminal.write('\r\n');

        await executeCommand(currentInput.current.trim(), terminal, true);
        currentInput.current = '';
      } else if (data === '\x7f') {
        // Backspace
        if (currentInput.current.length > 0) {
          currentInput.current = currentInput.current.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (data === '\x03') {
        // Ctrl+C
        terminal.write('^C\r\n');

        // Stop any active polling when user interrupts
        stopOutputPolling();

        await executeCommand('', terminal, true); // Send Ctrl+C and get new prompt
        currentInput.current = '';
      } else if (data.charCodeAt(0) >= 32) {
        // Printable characters
        currentInput.current += data;
        terminal.write(data);
      }
    };

    const executeCommand = async (command: string, terminal: any, showOutput: boolean = true) => {
      try {
        console.log(`[@component:TerminalEmulator] Sending to persistent shell: "${command}"`);

        // Import terminal action - send raw command to persistent shell
        const { sendTerminalData, pollTerminalOutput } = await import(
          '@/app/actions/terminalsAction'
        );
        const result = await sendTerminalData(sessionId, command);

        console.log(`[@component:TerminalEmulator] Shell response:`, {
          success: result.success,
          hasStdout: !!result.data?.stdout,
          hasStderr: !!result.data?.stderr,
          error: result.error,
        });

        if (result.success && result.data && showOutput) {
          // Display exact shell output
          if (result.data.stdout) {
            terminal.write(result.data.stdout);
          }
          if (result.data.stderr) {
            terminal.write(result.data.stderr);
          }

          // For commands that might be long-running, start polling for additional output
          if (
            command.trim() &&
            !command.includes('cd ') &&
            !command.includes('ls ') &&
            !command.includes('pwd')
          ) {
            console.log(
              `[@component:TerminalEmulator] Starting output polling for potentially long-running command`,
            );
            startOutputPolling(terminal, pollTerminalOutput);
          }
        } else if (!result.success) {
          console.error(`[@component:TerminalEmulator] Shell command failed:`, result.error);
          if (showOutput) {
            terminal.write(`\x1b[31mShell Error: ${result.error || 'Command failed'}\x1b[0m\r\n`);
          }
        }
      } catch (error) {
        console.error(`[@component:TerminalEmulator] Error sending to shell:`, error);
        if (showOutput) {
          terminal.write(
            `\x1b[31mError: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m\r\n`,
          );
        }
      }
    };

    // Polling mechanism for long-running commands
    let pollingInterval: NodeJS.Timeout | null = null;
    let pollCount = 0;
    const MAX_POLLS = 120; // Poll for up to 2 minutes (120 * 1 second)

    const startOutputPolling = (terminal: any, pollFunction: any) => {
      // Clear any existing polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      pollCount = 0;
      pollingInterval = setInterval(async () => {
        try {
          pollCount++;

          // Stop polling after max attempts
          if (pollCount > MAX_POLLS) {
            console.log(
              `[@component:TerminalEmulator] Stopping output polling after ${MAX_POLLS} attempts`,
            );
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
            return;
          }

          const pollResult = await pollFunction(sessionId, 500);

          if (pollResult.success && pollResult.data?.hasOutput && pollResult.data.stdout) {
            console.log(
              `[@component:TerminalEmulator] Received additional output (poll ${pollCount})`,
            );
            terminal.write(pollResult.data.stdout);
          } else if (!pollResult.success) {
            console.error(`[@component:TerminalEmulator] Polling failed:`, pollResult.error);
            // Don't stop polling on single failures, but log them
          }

          // If we get output that looks like a shell prompt, stop polling
          if (
            pollResult.data?.stdout &&
            (pollResult.data.stdout.includes('$ ') ||
              pollResult.data.stdout.includes('> ') ||
              pollResult.data.stdout.includes('# '))
          ) {
            console.log(`[@component:TerminalEmulator] Detected shell prompt, stopping polling`);
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
          }
        } catch (error) {
          console.error(`[@component:TerminalEmulator] Error during output polling:`, error);
        }
      }, 1000); // Poll every 1 second
    };

    const stopOutputPolling = () => {
      if (pollingInterval) {
        console.log(`[@component:TerminalEmulator] Stopping output polling`);
        clearInterval(pollingInterval);
        pollingInterval = null;
        pollCount = 0;
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

    // Focus on any click in the terminal area - copy ref to variable
    const terminalElement = terminalRef.current;
    if (terminalElement) {
      terminalElement.addEventListener('click', handleFocus);
    }

    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);

      if (terminalElement) {
        terminalElement.removeEventListener('click', handleFocus);
      }

      // Stop any active polling
      stopOutputPolling();

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
    <div className="flex flex-col h-full w-full bg-[#1e1e1e]">
      <div
        ref={terminalRef}
        className="flex-1 w-full min-h-0"
        style={{ padding: '8px' }}
        onClick={() => {
          // Ensure terminal gets focus on any click
          if (terminalInstance.current) {
            terminalInstance.current.focus();
          }
        }}
      />
    </div>
  );
}
