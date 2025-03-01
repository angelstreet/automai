'use client';
/* eslint-disable @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars */

import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { AttachAddon } from '@xterm/addon-attach';
// @ts-ignore - Type issues with xterm addons
import { FitAddon } from '@xterm/addon-fit';
// @ts-ignore - Type issues with xterm addons
import { SearchAddon } from '@xterm/addon-search';
// @ts-ignore - Type issues with xterm addons
import { WebLinksAddon } from '@xterm/addon-web-links';
// @ts-ignore - Type issues with xterm addons

import '@xterm/xterm/css/xterm.css';
import { useToast } from '@/components/shadcn/use-toast';
import { toast } from 'sonner';

interface Connection {
  id: string;
  name: string;
  ip: string;
  type: string;
  port: number;
  username: string;
  password: string;
}

interface TerminalProps {
  connection: Connection;
}

export function Terminal({ connection }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const connectionAttemptedRef = useRef<boolean>(false);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeTerminal = async () => {
      if (!terminalRef.current) return;

      // Prevent duplicate connection attempts
      if (connectionAttemptedRef.current) {
        console.log('Preventing duplicate terminal connection attempt');
        return;
      }

      connectionAttemptedRef.current = true;
      setIsConnecting(true);

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

      // Delay fitting to ensure DOM is ready
      setTimeout(() => {
        try {
          if (terminalRef.current && term.element) {
            fitAddon.fit();

            setTimeout(() => {
              const initialDimensions = { cols: term.cols, rows: term.rows };
              console.log('Initial terminal dimensions:', initialDimensions);

              console.log('Terminal initialized with dimensions', {
                connectionId: connection?.id || 'unknown',
                dimensions: initialDimensions,
              });
            }, 200);
          }
        } catch (error) {
          console.error('Error fitting terminal:', error);
        }
      }, 500);

      // Store terminal instance
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // Set initial terminal text
      term.write(
        `\x1B[1;3;33mInitializing terminal for ${connection?.name || 'unknown'} (${connection?.ip || 'unknown'})...\x1B[0m\r\n`,
      );

      // Initialize WebSocket server first
      try {
        console.log('[Terminal] Initializing WebSocket server');
        term.write(`\x1B[1;3;33mInitializing terminal server...\x1B[0m\r\n`);
        
        const initResponse = await fetch('/api/terminals/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ connectionId: connection.id }),
        });
        
        const initResult = await initResponse.json();
        
        if (!initResult.success) {
          console.error('[Terminal] Failed to initialize WebSocket server:', initResult.message);
          term.write(`\r\n\x1B[1;3;31mFailed to initialize terminal server: ${initResult.message}\x1B[0m\r\n`);
          setIsConnecting(false);
          setError('Failed to initialize terminal server');
          return;
        }
        
        console.log('[Terminal] WebSocket server initialized successfully');
        term.write(`\x1B[1;3;33mTerminal server initialized, connecting...\x1B[0m\r\n`);
      } catch (error) {
        console.error('[Terminal] Error initializing WebSocket server:', error);
        term.write(`\r\n\x1B[1;3;31mError initializing terminal server\x1B[0m\r\n`);
        setIsConnecting(false);
        setError('Error initializing terminal server');
        return;
      }

      // Use the Next.js API route for WebSocket connections instead of the standalone server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socketUrl = `${protocol}//${window.location.host}/api/terminals/${connection.id}`;
      console.log(`[WebSocket] Connecting to: ${socketUrl}`, {
        connectionId: connection.id,
        connectionType: connection.type,
        username: connection.username,
        password: connection.password ? '********' : undefined,
      });

      try {
        const socket = new WebSocket(socketUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log('[WebSocket] Connection established successfully');
          setIsConnecting(false);

          // Log successful connection
          console.log('WebSocket connection established', {
            connectionId: connection.id,
          });

          term.write(`\x1B[1;3;33mWebSocket connected, authenticating...\x1B[0m\r\n`);

          // Send authentication message
          const authMessage = {
            type: 'auth',
            connectionType: connection.type,
            username: connection.username,
            password: connection.password,
          };

          console.log('[WebSocket] Sending authentication', {
            type: 'auth',
            connectionType: connection.type,
            username: connection.username,
            hasPassword: !!connection.password,
          });

          // Log authentication attempt
          console.log('Sending authentication to server', {
            connectionId: connection.id,
            connectionType: connection.type,
            username: connection.username,
          });

          socket.send(JSON.stringify(authMessage));

          // Attach WebSocket to terminal - this will handle the SSH connection
          const attachAddon = new AttachAddon(socket);
          term.loadAddon(attachAddon);
        };

        socket.onerror = (event) => {
          console.error('[WebSocket] Connection error:', event);
          setError('Connection error');
          term.write(`\r\n\x1B[1;3;31mWebSocket error: Could not connect to terminal server\x1B[0m\r\n`);
          term.write(`\r\n\x1B[1;3;31mPlease check your network connection and try again.\x1B[0m\r\n`);
          
          toast({
            variant: 'destructive',
            title: 'Connection Error',
            description: 'Failed to connect to terminal server. Please try again later.',
          });
        };

        // Handle JSON messages from the server (like error messages)
        socket.onmessage = (event) => {
          try {
            // Check if data is empty or whitespace before parsing
            if (!event.data || typeof event.data !== 'string' || !event.data.trim()) {
              return; // Skip empty messages
            }

            // Try to parse as JSON first
            const data = JSON.parse(event.data);

            console.log('[WebSocket] Received message:', data);

            // Handle connection status messages
            if (data.status === 'connected') {
              console.log('[SSH] Connection established successfully');
              term.write(`\r\n\x1B[1;3;32mSSH connection established successfully.\x1B[0m\r\n`);
              return;
            }

            // Handle error messages
            if (data.error) {
              console.error('[SSH] Error:', data.error);

              console.error('SSH connection error from server', {
                connectionId: connection.id,
                error: data.error,
                errorType: data.errorType || 'UNKNOWN_ERROR',
              });

              // Customize toast based on error type
              let toastTitle = 'SSH Connection Error';
              let toastDescription = data.error || 'Failed to establish SSH connection';

              if (data.errorType === 'SSH_AUTH_ERROR') {
                toastTitle = 'Authentication Failed';
                toastDescription = 'Invalid username or password. Please check your credentials.';
              } else if (data.errorType === 'SSH_NETWORK_ERROR') {
                toastTitle = 'Network Error';
                toastDescription = `Could not connect to ${data.details?.host}:${data.details?.port}. Server may be unreachable.`;
              } else if (data.errorType === 'SSH_SHELL_ERROR') {
                toastTitle = 'Shell Error';
                toastDescription = 'Failed to open shell session on the remote server.';
              }

              // Show toast notification for SSH error
              toast({
                variant: 'destructive',
                title: toastTitle,
                description: toastDescription,
                duration: 5000,
              });

              // Display error in terminal with appropriate message
              term.write(`\r\n\x1B[1;3;31mError: ${data.error}\x1B[0m\r\n`);

              if (data.errorType === 'SSH_AUTH_ERROR') {
                term.write(
                  `\r\n\x1B[1;3;31mAuthentication failed. Please check your username and password.\x1B[0m\r\n`,
                );
              } else if (data.errorType === 'SSH_NETWORK_ERROR') {
                term.write(
                  `\r\n\x1B[1;3;31mCould not connect to ${data.details?.host}:${data.details?.port}. Server may be unreachable.\x1B[0m\r\n`,
                );
              } else if (data.errorType === 'SSH_SHELL_ERROR') {
                term.write(
                  `\r\n\x1B[1;3;31mFailed to open shell session on the remote server.\x1B[0m\r\n`,
                );
              } else {
                term.write(
                  `\r\n\x1B[1;3;31mPlease check your connection settings and try again.\x1B[0m\r\n`,
                );
              }
            }
          } catch (e) {
            // Not JSON data, will be handled by the AttachAddon
            // This is normal for terminal output
          }
        };

        socket.onclose = (event) => {
          console.log('[WebSocket] Connection closed', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            connectionId: connection.id,
          });

          console.log('Terminal WebSocket closed', {
            connectionId: connection.id,
          });

          // Show different messages based on close code
          if (event.code === 1006) {
            // Abnormal closure
            term.write(
              '\r\n\x1B[1;3;31mConnection closed abnormally. The server may be unavailable.\x1B[0m\r\n',
            );

            // Show toast for abnormal closure
            toast({
              variant: 'destructive',
              title: 'Connection Lost',
              description:
                'The WebSocket connection was closed abnormally. The server may be unavailable.',
              duration: 5000,
            });
          } else {
            term.write('\r\n\x1B[1;3;33mConnection closed.\x1B[0m\r\n');
          }
        };

        // Handle window resize
        const handleResize = () => {
          try {
            if (fitAddon && term && term.element) {
              fitAddon.fit();

              // Add small delay to ensure dimensions are updated after fit
              setTimeout(() => {
                const dimensions = { cols: term.cols, rows: term.rows };

                // Log terminal dimensions for debugging
                console.log('[Terminal] Dimensions after resize:', dimensions);

                console.log('Terminal resized', {
                  connectionId: connection.id,
                  dimensions: dimensions || { cols: 0, rows: 0 },
                });

                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(
                    JSON.stringify({
                      type: 'resize',
                      cols: term.cols,
                      rows: term.rows,
                    }),
                  );
                }
              }, 50);
            }
          } catch (error) {
            console.error('[Terminal] Error during resize:', error);
          }
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
          window.removeEventListener('resize', handleResize);
          if (socket && socket.readyState !== WebSocket.CLOSED) {
            socket.close();
          }
          term.dispose();
        };
      } catch (error) {
        console.error('[WebSocket] Connection error:', error);
        setError('Connection error');
        term.write(`\r\n\x1B[1;3;31mWebSocket error: Could not connect to terminal server\x1B[0m\r\n`);
        term.write(`\r\n\x1B[1;3;31mPlease check your network connection and try again.\x1B[0m\r\n`);
        
        toast({
          variant: 'destructive',
          title: 'Connection Error',
          description: 'Failed to connect to terminal server. Please try again later.',
        });
      }
    };

    initializeTerminal();
  }, [connection, toast]);

  return (
    <div className="w-full h-full">
      {isConnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Initializing terminal connection...</p>
          </div>
        </div>
      )}
      <div
        ref={terminalRef}
        className="w-full h-[calc(90%)] rounded-lg overflow-hidden border border-border"
      />
    </div>
  );
}
