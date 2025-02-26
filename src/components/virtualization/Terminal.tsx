'use client';

import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { AttachAddon } from 'xterm-addon-attach';
import 'xterm/css/xterm.css';
import { logger } from '@/lib/logger';

interface TerminalProps {
  connection: {
    id: string;
    name: string;
    ip: string;
    type: string;
  };
}

export function Terminal({ connection }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const connectionAttemptedRef = useRef<boolean>(false);

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
            
            logger.info('Terminal initialized with dimensions', {
              action: 'TERMINAL_INIT_DIMENSIONS',
              data: { 
                connectionId: connection?.id || 'unknown',
                dimensions: initialDimensions
              },
              saveToDb: true
            });
          }, 100);
        }
      } catch (error) {
        console.error('Error fitting terminal:', error);
      }
    }, 500);

    // Store terminal instance
    xtermRef.current = term;

    // Connect to WebSocket for SSH session
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/virtualization/machines/${connection.id}/terminal`;
    
    // Log the WebSocket URL and connection details for debugging
    console.log('Terminal connection details:', {
      wsUrl,
      connectionId: connection?.id || 'unknown',
      name: connection?.name || 'unknown',
      ip: connection?.ip || 'unknown',
      type: connection?.type || 'unknown'
    });
    
    logger.info('Initializing terminal WebSocket connection', {
      action: 'TERMINAL_WS_INIT',
      data: { 
        connectionId: connection?.id || 'unknown',
        wsUrl,
        connectionDetails: {
          name: connection?.name || 'unknown',
          ip: connection?.ip || 'unknown',
          type: connection?.type || 'unknown'
        }
      },
      saveToDb: true
    });
    
    // Create WebSocket connection
    const ws = new WebSocket(wsUrl);

    // Set initial terminal text before connection is established
    term.write(`\x1B[1;3;33mConnecting to ${connection?.name || 'unknown'} (${connection?.ip || 'unknown'})...\x1B[0m\r\n`);

    ws.onopen = () => {
      logger.info('Terminal WebSocket connected', {
        action: 'TERMINAL_WS_CONNECTED',
        data: { connectionId: connection?.id || 'unknown' },
        saveToDb: true
      });

      // Send authentication credentials if available
      if (connection.type === 'ssh') {
        ws.send(JSON.stringify({
          type: 'auth',
          connectionId: connection.id,
          connectionType: connection.type
        }));
      }

      // Attach WebSocket to terminal - this will handle the SSH connection
      const attachAddon = new AttachAddon(ws);
      term.loadAddon(attachAddon);

      // Set connected message
      term.write(`\x1B[1;3;32mConnected to ${connection?.name || 'unknown'} (${connection?.ip || 'unknown'})\x1B[0m\r\n`);
    };

    ws.onerror = (error) => {
      logger.error('Terminal WebSocket error', {
        action: 'TERMINAL_WS_ERROR',
        data: { connectionId: connection?.id || 'unknown', error: error.toString() },
        saveToDb: true
      });
      term.write('\r\n\x1B[1;3;31mConnection error. Please try again.\x1B[0m\r\n');
    };

    // Handle JSON messages from the server (like error messages)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle error messages
        if (data.error) {
          logger.error('Terminal received error from server', {
            action: 'TERMINAL_SERVER_ERROR',
            data: { 
              connectionId: connection?.id || 'unknown',
              error: data.error
            },
            saveToDb: true
          });
          
          term.write(`\r\n\x1B[1;3;31mError: ${data.error}\x1B[0m\r\n`);
        }
      } catch (e) {
        // Not JSON data, will be handled by the AttachAddon
      }
    };

    ws.onclose = () => {
      logger.info('Terminal WebSocket closed', {
        action: 'TERMINAL_WS_CLOSED',
        data: { connectionId: connection?.id || 'unknown' },
        saveToDb: true
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
            console.log('Terminal dimensions after resize:', dimensions);
            
            logger.info('Terminal resized', {
              action: 'TERMINAL_RESIZE',
              data: { 
                connectionId: connection?.id || 'unknown',
                dimensions: dimensions || { cols: 0, rows: 0 }
              },
              saveToDb: false
            });
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'resize',
                cols: term.cols,
                rows: term.rows
              }));
            }
          }, 50);
        }
      } catch (error) {
        console.error('Error during resize:', error);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
      }
      term.dispose();
    };
  }, [connection]);

  return (
    <div className="w-full h-full">
      <div 
        ref={terminalRef} 
        className="w-full h-[calc(100%-20px)] rounded-lg overflow-hidden border border-border"
      />
    </div>
  );
} 