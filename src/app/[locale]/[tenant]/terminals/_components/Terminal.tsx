'use client';
/* eslint-disable @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars */

import { AttachAddon } from '@xterm/addon-attach';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal as XTerm } from '@xterm/xterm';
import { useEffect, useRef, useState } from 'react';
import '@xterm/xterm/css/xterm.css';
import { useToast } from '@/components/shadcn/use-toast';

interface Connection {
  id: string;
  name: string;
  ip: string;
  type: string;
  port: number;
  username: string;
  password: string;
  host?: string;
  user?: string;
  os_type?: string;
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

  // Before component unmounts, store connection info to avoid reload
  useEffect(() => {
    return () => {
      // Cache the current connection data for navigation back
      if (connection) {
        try {
          // Store the current timestamp to validate the cache later
          sessionStorage.setItem('terminal_exit_timestamp', Date.now().toString());
        } catch (e) {
          console.error('Error storing terminal data on exit:', e);
        }
      }
    };
  }, [connection]);

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

      // Auto-detect Windows from is_windows field or os_type
      // Deep inspect the connection object to understand what's happening with is_windows
      console.log('Connection data for Windows detection:', {
        is_windows_field: connection.is_windows,
        is_windows_type: typeof connection.is_windows,
        os_type: connection.os_type,
        // Log the full connection object keys for debugging
        connection_keys: Object.keys(connection),
        // Try to stringify is_windows to see its true value
        stringify_is_windows: JSON.stringify(connection.is_windows),
        // Check if connection.is_windows is truthy
        is_windows_truthy: !!connection.is_windows,
      });
      
      // Explicitly check is_windows field, ensure it's treated as boolean
      // First convert to boolean with !! then compare strictly with === true
      // This handles all edge cases (undefined, null, string 'true', etc.)
      const explicitIsWindows = !!connection.is_windows === true;
      const osTypeIsWindows = typeof connection.os_type === 'string' && 
                              connection.os_type.toLowerCase().includes('windows');
      
      const isWindows = explicitIsWindows || osTypeIsWindows;
      console.log('[Terminal] Initial Windows detection:', {
        is_windows: isWindows,
        is_windows_field: connection.is_windows,
        os_type: connection.os_type,
      });

      if (isWindows) {
        term.write(
          `\x1B[1;3;36mWindows system detected, will use special connection mode\x1B[0m\r\n`,
        );
      }

      // Initialize WebSocket server first
      try {
        // For testing, allow overriding connection ID (this should be removed in production)
        const testConnectionId = 'test-connection-id'; // Hardcoded test connection ID
        const connectionId = connection.id === 'test' ? testConnectionId : connection.id;

        console.log('[Terminal] Initializing WebSocket server', {
          connectionId: connectionId,
          originalId: connection.id,
          usingTestId: connection.id === 'test',
          host: connection.ip,
          port: connection.port,
        });
        term.write(`\x1B[1;3;33mInitializing terminal server...\x1B[0m\r\n`);

        const initResponse = await fetch('/api/terminals/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ connectionId: connectionId }),
        });

        if (!initResponse.ok) {
          const statusText = initResponse.statusText;
          const responseText = await initResponse.text();
          let errorMsg = `Server error: ${initResponse.status} ${statusText}`;
          try {
            // Try to parse error message from JSON response
            const errorJson = JSON.parse(responseText);
            if (errorJson.error) {
              errorMsg = `Server error: ${errorJson.error}`;
            }
          } catch (e) {
            // If parsing fails, use the raw response text
            if (responseText) {
              errorMsg += ` - ${responseText}`;
            }
          }

          console.error('[Terminal] Server returned error:', {
            status: initResponse.status,
            statusText,
            responseText,
          });

          term.write(`\r\n\x1B[1;3;31m${errorMsg}\x1B[0m\r\n`);
          setIsConnecting(false);
          setError(errorMsg);
          return;
        }

        const initResult = await initResponse.json();
        console.log('[Terminal] Init response:', initResult);

        if (!initResult.success) {
          console.error(
            '[Terminal] Failed to initialize WebSocket server:',
            initResult.error || initResult.message,
          );
          term.write(
            `\r\n\x1B[1;3;31mFailed to initialize terminal server: ${initResult.error || initResult.message}\x1B[0m\r\n`,
          );
          setIsConnecting(false);
          setError('Failed to initialize terminal server');
          return;
        }

        console.log('[Terminal] WebSocket server initialized successfully');
        term.write(`\x1B[1;3;33mTerminal server initialized, connecting...\x1B[0m\r\n`);
      } catch (error) {
        console.error('[Terminal] Error initializing WebSocket server:', error);
        term.write(
          `\r\n\x1B[1;3;31mError initializing terminal server: ${error instanceof Error ? error.message : String(error)}\x1B[0m\r\n`,
        );
        setIsConnecting(false);
        setError('Error initializing terminal server');
        return;
      }

      // Use the Next.js API route for WebSocket connections instead of the standalone server
      const websocket_protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Use the same port that the page is being served from
      const websocket_port = window.location.port;

      // Redefine connectionId for this scope
      const testConnectionId = 'test-connection-id';
      const connectionId = connection.id === 'test' ? testConnectionId : connection.id;

      const socketUrl = `${websocket_protocol}//${window.location.hostname}:${websocket_port}/api/terminals/ws/${connectionId}`;
      console.log(`[WebSocket] Connecting to: ${socketUrl}`, {
        connectionId: connectionId,
        websocket_protocol: websocket_protocol,
        hostname: window.location.hostname,
        websocket_port: websocket_port,
        originalId: connection.id,
        usingTestId: connection.id === 'test',
        connectionType: connection.type,
        ssh_username: connection.username,
        ssh_host: connection.ip,
        ssh_port: connection.port,
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

          // Get Windows flag from connection info - prioritizing is_windows field
          console.log('WebSocket connection data for Windows detection:', {
            is_windows_field: connection.is_windows,
            is_windows_type: typeof connection.is_windows,
            os_type: connection.os_type,
            stringify_is_windows: JSON.stringify(connection.is_windows),
            is_windows_truthy: !!connection.is_windows,
          });
          
          // Use the same logic for consistency throughout the component
          const explicitIsWindows = !!connection.is_windows === true;
          const osTypeIsWindows = typeof connection.os_type === 'string' && 
                                 connection.os_type.toLowerCase().includes('windows');
          
          const is_windows = explicitIsWindows || osTypeIsWindows;
          console.log('[Terminal] Windows detection result:', {
            is_windows: is_windows,
            is_windows_field: connection.is_windows,
            os_type: connection.os_type,
          });

          // Additional logging for Windows detection
          if (is_windows) {
            console.log('[Terminal] Windows OS detected, will use cmd.exe', {
              os_type: connection.os_type,
              ip: connection.ip,
            });
            term.write(
              `\x1B[1;3;33mWindows system detected, will connect using cmd.exe...\x1B[0m\r\n`,
            );
          }

          // Send authentication message
          const authMessage = {
            type: 'auth',
            connectionType: connection.type,
            ssh_username: connection.username || connection.user || 'root',
            ssh_password: connection.password,
            ssh_host: connection.ip,
            ssh_port: connection.port,
            is_windows: is_windows,
          };

          console.log('[WebSocket] Sending authentication', {
            type: 'auth',
            connectionType: connection.type,
            ssh_username: connection.username || connection.user || 'root',
            hasPassword: !!connection.password,
            ssh_host: connection.ip,
            ssh_port: connection.port,
            is_windows: is_windows,
          });

          // Log authentication attempt
          console.log('Sending authentication to server', {
            connectionId: connection.id,
            connectionType: connection.type,
            ssh_username: connection.username,
          });

          socket.send(JSON.stringify(authMessage));

          // Attach WebSocket to terminal - this will handle the SSH connection
          const attachAddon = new AttachAddon(socket);
          term.loadAddon(attachAddon);
        };

        socket.onerror = (event) => {
          console.error('[WebSocket] Connection error:', event);
          setError('Connection error');
          term.write(
            `\r\n\x1B[1;3;31mWebSocket error: Could not connect to terminal server\x1B[0m\r\n`,
          );
          term.write(
            `\r\n\x1B[1;3;31mPlease check your network connection and try again.\x1B[0m\r\n`,
          );

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
              console.log('[SSH] Connection established successfully', data.details);
              term.write(`\r\n\x1B[1;3;32mSSH connection established successfully.\x1B[0m\r\n`);

              // Add Windows-specific message if connected to Windows
              if (data.details?.is_windows) {
                term.write(
                  `\r\n\x1B[1;3;32mConnected to Windows system. Using cmd.exe shell.\x1B[0m\r\n`,
                );
              }
              return;
            }

            // Handle retry with Windows mode message
            if (data.status === 'retry') {
              console.log('[SSH] Retrying with Windows mode:', data);
              term.write(
                `\r\n\x1B[1;3;33m${data.message || 'Trying Windows connection mode...'}\x1B[0m\r\n`,
              );
              return;
            }

            // Handle server banner messages
            if (data.type === 'banner') {
              console.log('[SSH] Banner received:', data.message);
              term.write(`\r\n\x1B[1;3;36mServer message: ${data.message}\x1B[0m\r\n`);
              return;
            }

            // Handle error messages
            if (data.error) {
              console.error('[SSH] Error:', data.error);

              console.error('SSH connection error from server', {
                connectionId: connection.id,
                error: data.error,
                errorType: data.errorType || 'UNKNOWNerror',
              });

              // Customize toast based on error type
              let toastTitle = 'SSH Connection Error';
              let toastDescription = data.error || 'Failed to establish SSH connection';

              if (data.errorType === 'SSH_AUTHerror') {
                toastTitle = 'Authentication Failed';
                toastDescription = 'Invalid username or password. Please check your credentials.';
              } else if (data.errorType === 'SSH_NETWORKerror') {
                toastTitle = 'Network Error';
                toastDescription = `Could not connect to ${data.details?.ssh_host}:${data.details?.ssh_port}. Server may be unreachable.`;
              } else if (data.errorType === 'SSH_SHELLerror') {
                toastTitle = 'Shell Error';
                toastDescription = 'Failed to open shell session on the remote server.';
              } else if (data.errorType === 'SSH_HANDSHAKE_TIMEOUT') {
                toastTitle = 'Handshake Timeout';
                toastDescription = `SSH handshake timed out. Server at ${data.details?.ssh_host}:${data.details?.ssh_port} might be unreachable or incompatible.`;
              }

              // Show toast notification for SSH error
              toast({
                variant: 'destructive',
                title: toastTitle,
                description: toastDescription,
              });

              // Display error in terminal with appropriate message
              term.write(`\r\n\x1B[1;3;31mError: ${data.error}\x1B[0m\r\n`);

              if (data.errorType === 'SSH_AUTHerror') {
                term.write(
                  `\r\n\x1B[1;3;31mAuthentication failed. Please check your username and password.\x1B[0m\r\n`,
                );
              } else if (data.errorType === 'SSH_NETWORKerror') {
                term.write(
                  `\r\n\x1B[1;3;31mCould not connect to ${data.details?.ssh_host}:${data.details?.ssh_port}. Server may be unreachable.\x1B[0m\r\n`,
                );
              } else if (data.errorType === 'SSH_SHELLerror') {
                term.write(
                  `\r\n\x1B[1;3;31mFailed to open shell session on the remote server.\x1B[0m\r\n`,
                );
              } else if (data.errorType === 'SSH_HANDSHAKE_TIMEOUT') {
                term.write(
                  `\r\n\x1B[1;3;31mSSH handshake timed out. This could be due to:\x1B[0m\r\n`,
                );
                term.write(
                  `\r\n\x1B[1;3;31m- A firewall blocking the connection\x1B[0m\r\n` +
                    `\r\n\x1B[1;3;31m- The server not running SSH on port ${data.details?.ssh_port}\x1B[0m\r\n` +
                    `\r\n\x1B[1;3;31m- Network issues between the server and client\x1B[0m\r\n`,
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
        term.write(
          `\r\n\x1B[1;3;31mWebSocket error: Could not connect to terminal server\x1B[0m\r\n`,
        );
        term.write(
          `\r\n\x1B[1;3;31mPlease check your network connection and try again.\x1B[0m\r\n`,
        );

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
    <div className="w-full h-full flex flex-col">
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
        className="w-full h-[calc(100vh-4rem)] rounded-lg overflow-hidden border border-border"
      />
    </div>
  );
}
