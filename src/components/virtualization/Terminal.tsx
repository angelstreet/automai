'use client';

import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { AttachAddon } from 'xterm-addon-attach';
import 'xterm/css/xterm.css';
import { useToast } from '@/components/ui/use-toast';

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
  const { toast } = useToast();

  useEffect(() => {
    if (!terminalRef.current) return;
    
    // Prevent duplicate connection attempts
    if (connectionAttemptedRef.current) {
      console.log('Preventing duplicate terminal connection attempt');
      return;
    }
    
    connectionAttemptedRef.current = true;

    // Initialize xterm.js
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1b1e',
        foreground: '#ffffff',
      },
      cols: 80,  // Set default initial columns
      rows: 24,  // Set default initial rows
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
          
          // Add additional delay before reading dimensions to ensure proper initialization
          setTimeout(() => {
            // Log initial terminal dimensions
            const initialDimensions = { cols: term.cols, rows: term.rows };
            console.log('Initial terminal dimensions:', initialDimensions);
            
            console.log('Terminal initialized with dimensions', {
              connectionId: connection?.id || 'unknown',
              dimensions: initialDimensions
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

    // Set initial terminal text before connection is established
    term.write(`\x1B[1;3;33mInitializing terminal for ${connection?.name || 'unknown'} (${connection?.ip || 'unknown'})...\x1B[0m\r\n`);

    // Create WebSocket connection with proper protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Check if connection ID is valid before attempting to connect
    if (!connection.id) {
      console.error('[WebSocket] Invalid connection ID:', connection);
      term.write(`\r\n\x1B[1;3;31mError: Invalid connection ID\x1B[0m\r\n`);
      term.write(`\r\n\x1B[1;3;31mPlease check your connection settings and try again.\x1B[0m\r\n`);
      return;
    }
    
    const socketUrl = `${protocol}//${window.location.host}/api/virtualization/machines/${connection.id}/terminal`;
    console.log(`[WebSocket] Connecting to: ${socketUrl}`, { 
      connectionId: connection.id,
      connectionType: connection.type,
      username: connection.username,
      password: connection.password ? '********' : undefined
    });
    
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('[WebSocket] Connection established successfully');
      
      // Log successful connection
      console.log('WebSocket connection established', {
        connectionId: connection.id
      });
      
      term.write(`\x1B[1;3;33mWebSocket connected, authenticating...\x1B[0m\r\n`);
      
      // Send authentication message
      const authMessage = {
        type: 'auth',
        connectionType: connection.type,
        username: connection.username,
        password: connection.password
      };
      
      console.log('[WebSocket] Sending authentication', { 
        type: 'auth',
        connectionType: connection.type,
        username: connection.username,
        hasPassword: !!connection.password
      });
      
      // Log authentication attempt
      console.log('Sending authentication to server', {
        connectionId: connection.id,
        connectionType: connection.type,
        username: connection.username
      });
      
      socket.send(JSON.stringify(authMessage));

      // Attach WebSocket to terminal - this will handle the SSH connection
      const attachAddon = new AttachAddon(socket);
      term.loadAddon(attachAddon);
    };

    socket.onerror = (error) => {
      // Handle WebSocket error event properly
      let errorMessage;
      try {
        // WebSocket error event contains an Event object, not an Error
        // The actual error details are not accessible in the event object due to browser security
        errorMessage = 'Connection failed';
      } catch (e) {
        errorMessage = 'Unknown WebSocket error';
      }
      
      console.log('[WebSocket] Error event details:', error);
      
      console.error('[WebSocket] Terminal error:', {
        message: errorMessage,
        connectionId: connection.id
      });
      
      // Show toast notification for WebSocket error
      toast({
        variant: 'destructive',
        title: 'WebSocket Connection Error',
        description: `Failed to establish WebSocket connection: ${errorMessage}`,
        duration: 5000,
      });
      
      term.write(`\r\n\x1B[1;3;31mWebSocket connection error: ${errorMessage}\x1B[0m\r\n`);
      term.write(`\r\n\x1B[1;3;31mPlease check your network connection and try again.\x1B[0m\r\n`);
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
            errorType: data.errorType || 'UNKNOWN_ERROR'
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
            term.write(`\r\n\x1B[1;3;31mAuthentication failed. Please check your username and password.\x1B[0m\r\n`);
          } else if (data.errorType === 'SSH_NETWORK_ERROR') {
            term.write(`\r\n\x1B[1;3;31mCould not connect to ${data.details?.host}:${data.details?.port}. Server may be unreachable.\x1B[0m\r\n`);
          } else if (data.errorType === 'SSH_SHELL_ERROR') {
            term.write(`\r\n\x1B[1;3;31mFailed to open shell session on the remote server.\x1B[0m\r\n`);
          } else {
            term.write(`\r\n\x1B[1;3;31mPlease check your connection settings and try again.\x1B[0m\r\n`);
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
        connectionId: connection.id
      });
      
      console.log('Terminal WebSocket closed', {
        connectionId: connection.id
      });
      
      term.write('\r\n\x1B[1;3;33mConnection closed.\x1B[0m\r\n');
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
              dimensions: dimensions || { cols: 0, rows: 0 }
            });
            
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'resize',
                cols: term.cols,
                rows: term.rows
              }));
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
  }, [connection, toast]);

  return (
    <div className="w-full h-full">
      <div 
        ref={terminalRef} 
        className="w-full h-[calc(90%)] rounded-lg overflow-hidden border border-border"
      />
    </div>
  );
} 