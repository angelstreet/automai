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
            background: '#000000',
            foreground: '#ffffff',
            cursor: '#ffffff',
            selection: 'rgba(255, 255, 255, 0.3)',
            black: '#000000',
            red: '#e06c75',
            green: '#98c379',
            yellow: '#d19a66',
            blue: '#61afef',
            magenta: '#c678dd',
            cyan: '#56b6c2',
            white: '#abb2bf',
            brightBlack: '#5c6370',
            brightRed: '#e06c75',
            brightGreen: '#98c379',
            brightYellow: '#d19a66',
            brightBlue: '#61afef',
            brightMagenta: '#c678dd',
            brightCyan: '#56b6c2',
            brightWhite: '#ffffff',
          },
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          rows: 30,
          cols: 100,
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

        // Fit to container
        fit.fit();

        // Handle user input
        terminal.onData((data) => {
          handleTerminalInput(data);
        });

        // Handle terminal resize
        terminal.onResize(({ cols, rows }) => {
          console.log(`[@component:TerminalEmulator] Terminal resized: ${cols}x${rows}`);
          // TODO: Send resize command to SSH session
        });

        // Setup connection simulation
        // In a real implementation, this would connect to the SSH session
        simulateSSHConnection(terminal);

        setIsTerminalReady(true);
        onConnectionStatusChange(true);

        console.log(`[@component:TerminalEmulator] Terminal initialized successfully`);
      } catch (error) {
        console.error(`[@component:TerminalEmulator] Error initializing terminal:`, error);
        onConnectionStatusChange(false);
      }
    };

    initializeTerminal();

    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);

      if (terminalInstance.current) {
        console.log(`[@component:TerminalEmulator] Disposing terminal`);
        terminalInstance.current.dispose();
        terminalInstance.current = null;
      }
    };
  }, [sessionId, host, onConnectionStatusChange]);

  const handleTerminalInput = async (data: string) => {
    if (!sessionId) return;

    try {
      console.log(`[@component:TerminalEmulator] Sending data to session ${sessionId}:`, data);

      // Send data to terminal session
      const { sendTerminalData } = await import('@/app/actions/terminalsAction');
      await sendTerminalData(sessionId, data);
    } catch (error) {
      console.error(`[@component:TerminalEmulator] Error sending terminal data:`, error);

      // Show error in terminal
      if (terminalInstance.current) {
        terminalInstance.current.write(
          `\r\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\r\n`,
        );
      }
    }
  };

  const simulateSSHConnection = (terminal: any) => {
    // Simulate connection process - minimal output
    setTimeout(() => {
      // Show appropriate prompt based on OS
      if (host.is_windows) {
        terminal.write(`PS C:\\Users\\${host.user || 'user'}> `);
      } else {
        terminal.write(`${host.user || 'user'}@${host.name}:~$ `);
      }
    }, 500);

    // TODO: Replace with real SSH connection
    // This is where we would establish the actual SSH connection
    // and start streaming real terminal data
  };

  // Auto-resize when terminal becomes ready
  useEffect(() => {
    if (isTerminalReady && fitAddon.current) {
      const resizeTimer = setTimeout(() => {
        fitAddon.current.fit();
      }, 100);

      return () => clearTimeout(resizeTimer);
    }
  }, [isTerminalReady]);

  return (
    <div className="w-full h-full bg-black">
      <div ref={terminalRef} className="w-full h-full" style={{ padding: '10px' }} />

      {/* Loading overlay */}
      {!isTerminalReady && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
            <p>Initializing terminal...</p>
          </div>
        </div>
      )}
    </div>
  );
}
