import { Box, Button, TextField, Paper, Typography, Grid, Chip } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';

import { usePyAutoGUI } from '../../../hooks/controller/usePyAutoGUI';
import { Host } from '../../../types/common/Host_Types';

interface PyAutoGUITerminalProps {
  host: Host;
  deviceId: string;
  onDisconnectComplete?: () => void;
}

export const PyAutoGUITerminal = React.memo(function PyAutoGUITerminal({
  host,
  deviceId,
  onDisconnectComplete,
}: PyAutoGUITerminalProps) {
  const {
    terminalOutput,
    isExecuting,
    launchApp,
    tap,
    sendKeys,
    typeText,
    clearTerminal,
    handleDisconnect,
    session,
  } = usePyAutoGUI(host, deviceId);

  // Form states
  const [appName, setAppName] = useState('');
  const [tapX, setTapX] = useState('');
  const [tapY, setTapY] = useState('');
  const [keys, setKeys] = useState('');
  const [text, setText] = useState('');

  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom when new output arrives
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const handleLaunchApp = async () => {
    if (appName.trim()) {
      await launchApp(appName.trim());
      setAppName('');
    }
  };

  const handleTap = async () => {
    const x = parseInt(tapX);
    const y = parseInt(tapY);
    if (!isNaN(x) && !isNaN(y)) {
      await tap(x, y);
      setTapX('');
      setTapY('');
    }
  };

  const handleSendKeys = async () => {
    if (keys.trim()) {
      await sendKeys(keys.trim());
      setKeys('');
    }
  };

  const handleTypeText = async () => {
    if (text.trim()) {
      await typeText(text.trim());
      setText('');
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

  // Predefined apps for quick access
  const quickApps = ['notepad', 'mspaint', 'calc', 'explorer'];
  const quickKeys = ['ctrl+c', 'ctrl+v', 'ctrl+s', 'alt+f4', 'enter', 'escape'];

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
          p: 0.5,
          backgroundColor: '#1a1a2e',
          color: '#0ff',
          fontFamily: 'monospace',
          fontSize: '0.7rem',
          overflow: 'auto',
          border: '1px solid #333',
          mb: 0.5,
          minHeight: '80px',
          maxHeight: '120px',
        }}
      >
        {terminalOutput ? (
          formatTerminalOutput(terminalOutput)
        ) : (
          <Typography variant="body2" sx={{ color: '#888', fontFamily: 'monospace' }}>
            PyAutoGUI ready... Use buttons below to control the desktop.
          </Typography>
        )}
      </Paper>

      {/* Control Buttons */}
      <Box sx={{ mb: 0.5 }}>
        {/* Launch App Section */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#0ff', fontSize: '0.8rem' }}>
            Launch Application
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
            <TextField
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="App name (e.g., notepad)"
              variant="outlined"
              size="small"
              disabled={!session.connected || isExecuting}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': { height: '32px' },
              }}
            />
            <Button
              variant="contained"
              onClick={handleLaunchApp}
              disabled={!session.connected || isExecuting || !appName.trim()}
              sx={{ minWidth: '60px', height: '32px', fontSize: '0.75rem' }}
            >
              Launch
            </Button>
          </Box>
          {/* Quick app buttons */}
          <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap' }}>
            {quickApps.map((app) => (
              <Chip
                key={app}
                label={app}
                size="small"
                onClick={() => {
                  setAppName(app);
                  launchApp(app);
                }}
                disabled={isExecuting}
                sx={{ cursor: 'pointer', height: '24px', fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        </Box>

        {/* Tap Coordinates Section */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#0ff', fontSize: '0.8rem' }}>
            Tap Coordinates
          </Typography>
          <Grid container spacing={0.5} alignItems="center">
            <Grid item xs={4}>
              <TextField
                value={tapX}
                onChange={(e) => setTapX(e.target.value)}
                placeholder="X"
                variant="outlined"
                size="small"
                disabled={!session.connected || isExecuting}
                type="number"
                sx={{ '& .MuiOutlinedInput-root': { height: '32px' } }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                value={tapY}
                onChange={(e) => setTapY(e.target.value)}
                placeholder="Y"
                variant="outlined"
                size="small"
                disabled={!session.connected || isExecuting}
                type="number"
                sx={{ '& .MuiOutlinedInput-root': { height: '32px' } }}
              />
            </Grid>
            <Grid item xs={4}>
              <Button
                variant="contained"
                onClick={handleTap}
                disabled={!session.connected || isExecuting || !tapX || !tapY}
                fullWidth
                sx={{ height: '32px', fontSize: '0.75rem' }}
              >
                Tap
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Send Keys Section */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#0ff', fontSize: '0.8rem' }}>
            Send Keys
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
            <TextField
              value={keys}
              onChange={(e) => setKeys(e.target.value)}
              placeholder="Keys (e.g., ctrl+s, enter)"
              variant="outlined"
              size="small"
              disabled={!session.connected || isExecuting}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': { height: '32px' },
              }}
            />
            <Button
              variant="contained"
              onClick={handleSendKeys}
              disabled={!session.connected || isExecuting || !keys.trim()}
              sx={{ minWidth: '60px', height: '32px', fontSize: '0.75rem' }}
            >
              Send
            </Button>
          </Box>
          {/* Quick key buttons */}
          <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap' }}>
            {quickKeys.map((key) => (
              <Chip
                key={key}
                label={key}
                size="small"
                onClick={() => {
                  setKeys(key);
                  sendKeys(key);
                }}
                disabled={isExecuting}
                sx={{ cursor: 'pointer', height: '24px', fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        </Box>

        {/* Type Text Section */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#0ff', fontSize: '0.8rem' }}>
            Type Text
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <TextField
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Text to type"
              variant="outlined"
              size="small"
              disabled={!session.connected || isExecuting}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': { height: '32px' },
              }}
            />
            <Button
              variant="contained"
              onClick={handleTypeText}
              disabled={!session.connected || isExecuting || !text.trim()}
              sx={{ minWidth: '60px', height: '32px', fontSize: '0.75rem' }}
            >
              Type
            </Button>
          </Box>
        </Box>

        {/* Clear and Disconnect */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            variant="outlined"
            onClick={clearTerminal}
            disabled={isExecuting}
            size="small"
            sx={{ flex: 1, height: '28px', fontSize: '0.7rem' }}
          >
            Clear
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDisconnectWithCallback}
            disabled={isExecuting}
            size="small"
            sx={{ flex: 1, height: '28px', fontSize: '0.7rem' }}
          >
            Disconnect
          </Button>
        </Box>
      </Box>
    </Box>
  );
});
