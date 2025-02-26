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

  useEffect(() => {
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
    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    // Store terminal instance
    xtermRef.current = term;

    // Connect to WebSocket for SSH session
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/virtualization/machines/${connection.id}/terminal`);

    ws.onopen = () => {
      logger.info('Terminal WebSocket connected', {
        action: 'TERMINAL_WS_CONNECTED',
        data: { connectionId: connection.id },
        saveToDb: true
      });

      // Attach WebSocket to terminal
      const attachAddon = new AttachAddon(ws);
      term.loadAddon(attachAddon);

      // Set initial terminal text
      term.write(`\x1B[1;3;32mConnected to ${connection.name} (${connection.ip})\x1B[0m\r\n`);
    };

    ws.onerror = (error) => {
      logger.error('Terminal WebSocket error', {
        action: 'TERMINAL_WS_ERROR',
        data: { connectionId: connection.id, error: error.toString() },
        saveToDb: true
      });
      term.write('\r\n\x1B[1;3;31mConnection error. Please try again.\x1B[0m\r\n');
    };

    ws.onclose = () => {
      logger.info('Terminal WebSocket closed', {
        action: 'TERMINAL_WS_CLOSED',
        data: { connectionId: connection.id },
        saveToDb: true
      });
      term.write('\r\n\x1B[1;3;33mConnection closed.\x1B[0m\r\n');
    };

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      ws.send(JSON.stringify({
        type: 'resize',
        cols: term.cols,
        rows: term.rows
      }));
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [connection]);

  return (
    <div className="w-full h-full p-4">
      <div 
        ref={terminalRef} 
        className="w-full h-full rounded-lg overflow-hidden border border-border"
      />
    </div>
  );
} 