import { Box, Button, TextField, Paper, Typography, CircularProgress } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';

import { useBashDesktop } from '../../../hooks/controller/useBashDesktop';
import { Host } from '../../../types/common/Host_Types';

interface BashDesktopTerminalProps {
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

export const BashDesktopTerminal = React.memo(function BashDesktopTerminal({
  host,
  deviceId,
  onDisconnectComplete,
}: BashDesktopTerminalProps) {
  const {
    currentCommand,
    isExecuting,
    isDisconnecting,
    terminalOutput,
    executeCommand,
    handleDisconnect,
    setCurrentCommand,
    session,
  } = useBashDesktop(host, deviceId);

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
          <Typography variant="body2" sx={{ color: '#888', fontFamily: 'monospace' }}>
            Terminal ready...
          </Typography>
        )}
      </Paper>

      {/* Command Input and Send Button */}
      <Box component="form" onSubmit={handleCommandSubmit} sx={{ display: 'flex', gap: 1 }}>
        <TextField
          ref={commandInputRef}
          value={currentCommand}
          onChange={(e) => setCurrentCommand(e.target.value)}
          placeholder="Enter command..."
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
        disabled={isDisconnecting}
        fullWidth
        size="small"
        sx={{ mt: 1 }}
      >
        {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
      </Button>
    </Box>
  );
});
