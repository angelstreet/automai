import { Box, Button, TextField, Paper, Typography, CircularProgress } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';

import { usePlaywrightWeb } from '../../../hooks/controller/usePlaywrightWeb';
import { Host } from '../../../types/common/Host_Types';

interface PlaywrightWebTerminalProps {
  host: Host;
  deviceId: string;
  onDisconnectComplete?: () => void;
  isCollapsed: boolean;
  panelWidth: string;
  panelHeight: string;
  streamContainerDimensions?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

export const PlaywrightWebTerminal = React.memo(function PlaywrightWebTerminal({
  host,
  deviceId,
  onDisconnectComplete,
}: PlaywrightWebTerminalProps) {
  const {
    currentCommand,
    isExecuting,
    terminalOutput,
    executeCommand,
    handleDisconnect,
    setCurrentCommand,
    session,
    currentUrl,
    pageTitle,
  } = usePlaywrightWeb(host, deviceId);

  const terminalRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll terminal to bottom when new output arrives
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Focus command input when component mounts
  useEffect(() => {
    if (commandInputRef.current) {
      commandInputRef.current.focus();
    }
  }, []);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCommand.trim() && !isExecuting) {
      await executeCommand(currentCommand.trim());
      setCurrentCommand('');
    }
  };

  const handleDisconnectWithCallback = async () => {
    await handleDisconnect();
    if (onDisconnectComplete) {
      onDisconnectComplete();
    }
  };

  const formatTerminalOutput = (output: string) => {
    return output.split('\n').map((line, index) => (
      <Box
        key={index}
        component="pre"
        sx={{
          margin: 0,
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          lineHeight: 1.2,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {line}
      </Box>
    ));
  };

  return (
    <Box
      sx={{
        p: 1,
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Page Info Display */}
      {session.connected && (currentUrl || pageTitle) && (
        <Paper
          sx={{
            p: 1,
            mb: 1,
            backgroundColor: '#2d2d30',
            color: '#cccccc',
            border: '1px solid #3e3e42',
          }}
        >
          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
            {pageTitle && `📄 ${pageTitle}`}
            {pageTitle && currentUrl && ' | '}
            {currentUrl && `🌐 ${currentUrl}`}
          </Typography>
        </Paper>
      )}

      {/* Terminal Output */}
      <Paper
        ref={terminalRef}
        sx={{
          flex: 1,
          p: 1,
          backgroundColor: '#1e1e1e',
          color: '#00ff00',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          overflow: 'auto',
          border: '1px solid #333',
          mb: 1,
        }}
      >
        {terminalOutput ? (
          formatTerminalOutput(terminalOutput)
        ) : (
          <Box>
            <Typography variant="body2" sx={{ color: '#888', fontFamily: 'monospace' }}>
              Playwright Web Terminal ready...
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontFamily: 'monospace' }}>
              Commands (JSON format):
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#444', fontFamily: 'monospace', display: 'block' }}
            >
              {'{"command": "navigate_to_url", "url": "https://google.com"}'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#444', fontFamily: 'monospace', display: 'block' }}
            >
              {'{"command": "click_element", "selector": "input[name=q]"}'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#444', fontFamily: 'monospace', display: 'block' }}
            >
              {'{"command": "input_text", "selector": "input[name=q]", "text": "hello"}'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#444', fontFamily: 'monospace', display: 'block' }}
            >
              {'{"command": "get_page_info"}'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#444', fontFamily: 'monospace', display: 'block' }}
            >
              {'{"command": "execute_javascript", "script": "return document.title"}'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#444', fontFamily: 'monospace', display: 'block' }}
            >
              {'{"command": "tap_x_y", "x": 100, "y": 200}'}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Command Input and Send Button */}
      <Box component="form" onSubmit={handleCommandSubmit} sx={{ display: 'flex', gap: 1 }}>
        <TextField
          ref={commandInputRef}
          value={currentCommand}
          onChange={(e) => setCurrentCommand(e.target.value)}
          placeholder='{"command": "navigate_to_url", "url": "https://example.com"}'
          variant="outlined"
          size="small"
          disabled={!session.connected || isExecuting}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            },
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!session.connected || isExecuting || !currentCommand.trim()}
          sx={{ minWidth: '80px' }}
        >
          {isExecuting ? <CircularProgress size={20} /> : 'Send'}
        </Button>
      </Box>

      {/* Disconnect Button */}
      <Button
        variant="contained"
        color="error"
        onClick={handleDisconnectWithCallback}
        fullWidth
        size="small"
        sx={{ mt: 1 }}
      >
        {'Disconnect'}
      </Button>
    </Box>
  );
});
