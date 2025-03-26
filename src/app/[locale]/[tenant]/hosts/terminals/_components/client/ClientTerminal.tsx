'use client';

import { initTerminal, closeTerminal, sendTerminalData } from '@/app/actions/terminals';
import { Host } from '@/app/[locale]/[tenant]/hosts/types';
import { useToast } from '@/components/shadcn/use-toast';
import { useEffect, useRef, useState } from 'react';
import { AttachAddon } from '@xterm/addon-attach';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';

interface ClientTerminalProps {
  host: Host;
}

export default function ClientTerminal({ host }: ClientTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const connectTerminal = async () => {
      if (!terminalRef.current) return;

      // Initialize xterm.js
      const term = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1a1b1e',
          foreground: '#ffffff',
        },
        cols: 80,
        rows: 24,
      });

      // Add addons
      const fitAddon = new FitAddon();
      const searchAddon = new SearchAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(searchAddon);
      term.loadAddon(webLinksAddon);

      // Open terminal in container
      term.open(terminalRef.current);
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // Fit terminal to container
      setTimeout(() => {
        try {
          fitAddon.fit();
        } catch (error) {
          console.error('Error fitting terminal:', error);
        }
      }, 100);

      // Initial terminal message
      term.write(`\x1B[1;3;33mConnecting to ${host.name} (${host.ip})...\x1B[0m\r\n`);

      try {
        // Initialize terminal session via server action
        const response = await initTerminal(host.id);

        if (!response.success) {
          term.write(`\r\n\x1B[1;3;31mError: ${response.error}\x1B[0m\r\n`);
          setIsConnecting(false);
          setError(response.error || 'Failed to initialize terminal');

          toast({
            variant: 'destructive',
            title: 'Connection Error',
            description: response.error || 'Failed to initialize terminal session',
          });

          return;
        }

        // Store session ID for cleanup
        sessionIdRef.current = response.data.sessionId;

        // Set up WebSocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = `${protocol}//${window.location.host}/api/terminals/ws/${response.data.sessionId}`;

        const socket = new WebSocket(socketUrl);

        socket.onopen = () => {
          console.log('WebSocket connection established');
          setIsConnecting(false);
          term.write(`\x1B[1;3;32mConnected!\x1B[0m\r\n`);

          // Attach WebSocket to terminal
          const attachAddon = new AttachAddon(socket);
          term.loadAddon(attachAddon);
        };

        socket.onerror = (event) => {
          console.error('WebSocket error:', event);
          term.write(`\r\n\x1B[1;3;31mConnection error\x1B[0m\r\n`);
          setError('WebSocket connection error');

          toast({
            variant: 'destructive',
            title: 'Connection Error',
            description: 'Failed to establish WebSocket connection',
          });
        };

        socket.onclose = () => {
          console.log('WebSocket connection closed');
          term.write('\r\n\x1B[1;3;33mConnection closed.\x1B[0m\r\n');
        };

        // Handle window resize
        const handleResize = () => {
          try {
            if (fitAddon && term.element) {
              fitAddon.fit();

              // Send resize command to server
              socket.send(
                JSON.stringify({
                  type: 'resize',
                  cols: term.cols,
                  rows: term.rows,
                }),
              );
            }
          } catch (error) {
            console.error('Error during resize:', error);
          }
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
          window.removeEventListener('resize', handleResize);

          // Close socket
          if (socket.readyState !== WebSocket.CLOSED) {
            socket.close();
          }

          // Close terminal session via server action
          if (sessionIdRef.current) {
            closeTerminal(sessionIdRef.current).catch((err) => {
              console.error('Error closing terminal session:', err);
            });
          }

          // Dispose terminal
          term.dispose();
        };
      } catch (error) {
        console.error('Error connecting to terminal:', error);
        term.write(
          `\r\n\x1B[1;3;31mFailed to connect: ${error instanceof Error ? error.message : String(error)}\x1B[0m\r\n`,
        );
        setIsConnecting(false);
        setError('Failed to connect to terminal');

        toast({
          variant: 'destructive',
          title: 'Connection Error',
          description: 'An unexpected error occurred while connecting to the terminal',
        });
      }
    };

    connectTerminal();
  }, [host, toast]);

  return (
    <div className="flex flex-col h-full w-full">
      {isConnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Connecting to {host.name}...</p>
          </div>
        </div>
      )}
      <div
        ref={terminalRef}
        className="w-full h-full rounded-lg overflow-hidden border border-border"
      />
    </div>
  );
}
