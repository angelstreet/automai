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
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [currentInput, setCurrentInput] = useState('');

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
          handleTerminalInput(data);
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
      if (host.is_windows) {
        terminal.write(`PS C:\\Users\\${host.user}> `);
      } else {
        terminal.write(`${host.user}@${host.name}:~$ `);
      }
    };

    const handleTerminalInput = async (data: string) => {
      if (!terminalInstance.current) return;

      const terminal = terminalInstance.current;

      // Handle special keys
      if (data === '\r' || data === '\n') {
        // Enter pressed - execute command
        terminal.write('\r\n');

        if (currentInput.trim()) {
          await executeCommand(currentInput.trim());
        }

        setCurrentInput('');
        showPrompt();
      } else if (data === '\x7f') {
        // Backspace
        if (currentInput.length > 0) {
          setCurrentInput((prev) => prev.slice(0, -1));
          terminal.write('\b \b');
        }
      } else if (data === '\x03') {
        // Ctrl+C
        terminal.write('^C\r\n');
        setCurrentInput('');
        showPrompt();
      } else if (data.charCodeAt(0) >= 32) {
        // Printable characters
        setCurrentInput((prev) => prev + data);
        terminal.write(data);
      }
    };

    const executeCommand = async (command: string) => {
      if (!terminalInstance.current) return;

      const terminal = terminalInstance.current;

      try {
        console.log(`[@component:TerminalEmulator] Executing command: ${command}`);

        // Import terminal action
        const { sendTerminalData } = await import('@/app/actions/terminalsAction');
        const result = await sendTerminalData(sessionId, command);

        if (result.success && result.data) {
          // Display command output
          if (result.data.stdout) {
            terminal.write(result.data.stdout);
          }
          if (result.data.stderr) {
            terminal.write(`\x1b[31m${result.data.stderr}\x1b[0m`); // Red color for errors
          }
        } else {
          terminal.write(`\x1b[31mError: ${result.error || 'Command failed'}\x1b[0m\r\n`);
        }
      } catch (error) {
        console.error(`[@component:TerminalEmulator] Error executing command:`, error);
        terminal.write(
          `\x1b[31mError: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m\r\n`,
        );
      }
    };

    const showPrompt = () => {
      if (!terminalInstance.current) return;

      if (host.is_windows) {
        terminalInstance.current.write(`PS C:\\Users\\${host.user}> `);
      } else {
        terminalInstance.current.write(`${host.user}@${host.name}:~$ `);
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
  }, [sessionId, host, onConnectionStatusChange, currentInput]);

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
      <div ref={terminalRef} className="w-full h-full" style={{ padding: '8px' }} />
    </div>
  );
}
