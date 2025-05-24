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

        // Show initial connection message and get the natural prompt
        terminal.write(`🔗 Connected to ${host.name} (${host.ip}:${host.port || 22})\r\n`);

        // Get the initial prompt
        await getPrompt(terminal);

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
        console.log(`[@component:TerminalEmulator] Sending raw input: "${command}"`);

        // Import terminal action - send raw command exactly as typed
        const { sendTerminalData } = await import('@/app/actions/terminalsAction');
        const result = await sendTerminalData(sessionId, command);

        console.log(`[@component:TerminalEmulator] Raw SSH response:`, {
          success: result.success,
          hasStdout: !!result.data?.stdout,
          hasStderr: !!result.data?.stderr,
          error: result.error,
        });

        if (result.success && result.data && showOutput) {
          // Display exact SSH output
          if (result.data.stdout) {
            terminal.write(result.data.stdout);
          }
          if (result.data.stderr) {
            terminal.write(result.data.stderr);
          }

          // After command output, get the current prompt
          if (command.trim()) {
            await getPrompt(terminal);
          }
        } else if (!result.success) {
          console.error(`[@component:TerminalEmulator] SSH command failed:`, result.error);
          if (showOutput) {
            terminal.write(`\x1b[31mSSH Error: ${result.error || 'Command failed'}\x1b[0m\r\n`);
            // Still show prompt after error
            await getPrompt(terminal);
          }
        }
      } catch (error) {
        console.error(`[@component:TerminalEmulator] Error sending to SSH:`, error);
        if (showOutput) {
          terminal.write(
            `\x1b[31mError: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m\r\n`,
          );
          // Still show prompt after error
          await getPrompt(terminal);
        }
      }
    };

    const getPrompt = async (terminal: any) => {
      try {
        // Get current prompt by sending a command that shows the prompt format
        const { sendTerminalData } = await import('@/app/actions/terminalsAction');
        const result = await sendTerminalData(
          sessionId,
          'echo "$(whoami)@$(hostname):$(pwd | sed "s|^$HOME|~|")\\$ " | tr -d "\\n"',
        );

        if (result.success && result.data?.stdout) {
          terminal.write(result.data.stdout);
        } else {
          // Fallback prompt if the command fails
          terminal.write(`${host.user || 'user'}@${host.name}:~$ `);
        }
      } catch (error) {
        console.error(`[@component:TerminalEmulator] Error getting prompt:`, error);
        // Fallback prompt
        terminal.write(`${host.user || 'user'}@${host.name}:~$ `);
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
