import {
  Box,
  Button,
  Typography,
  CircularProgress,
  TextField,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Divider,
} from '@mui/material';
import {
  Terminal,
  Clear,
  PlayArrow,
  Stop,
  Folder,
  InsertDriveFile,
  Refresh,
  History,
} from '@mui/icons-material';
import React, { useState, useRef, useEffect } from 'react';

import { useBashDesktop } from '../../../hooks/controller/useBashDesktop';
import { Host } from '../../../types/common/Host_Types';

interface BashDesktopTerminalProps {
  host: Host;
  deviceId: string; // Device ID to select the correct device and make API calls
  onDisconnectComplete?: () => void;
  sx?: any;
  // Simplified panel state props
  isCollapsed: boolean;
  panelWidth: string;
  panelHeight: string;
  // Stream container dimensions for modal context
  streamContainerDimensions?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

export const BashDesktopTerminal = React.memo(
  function BashDesktopTerminal({
    host,
    deviceId,
    onDisconnectComplete,
    isCollapsed,
    panelWidth,
    panelHeight,
    streamContainerDimensions,
  }: BashDesktopTerminalProps) {
    const hookResult = useBashDesktop(host, deviceId);

    const {
      // State
      commandHistory,
      currentCommand,
      isExecuting,
      isDisconnecting,
      terminalOutput,
      workingDirectory,
      systemInfo,

      // Actions
      executeCommand,
      clearTerminal,
      handleDisconnect,
      setCurrentCommand,
      changeDirectory,
      listDirectory,
      readFile,
      writeFile,

      // Configuration
      layoutConfig,

      // Session info
      session,
    } = hookResult;

    // Local state for UI
    const [selectedFile, setSelectedFile] = useState<string>('');
    const [fileContent, setFileContent] = useState<string>('');
    const [isFileMode, setIsFileMode] = useState<boolean>(false);
    const [directoryListing, setDirectoryListing] = useState<string[]>([]);

    // Terminal scroll management
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
      if (commandInputRef.current && !isCollapsed) {
        commandInputRef.current.focus();
      }
    }, [isCollapsed]);

    const handleCommandSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (currentCommand.trim() && !isExecuting) {
        await executeCommand(currentCommand.trim());
        setCurrentCommand('');
      }
    };

    const handleCommandKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleCommandSubmit(e);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Get previous command from history
        if (commandHistory.length > 0) {
          const lastCommand = commandHistory[commandHistory.length - 1];
          setCurrentCommand(lastCommand);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Clear current command
        setCurrentCommand('');
      }
    };

    const handleListDirectory = async () => {
      const result = await listDirectory(workingDirectory);
      if (result.success) {
        setDirectoryListing(result.files || []);
      }
    };

    const handleFileRead = async () => {
      if (selectedFile) {
        const result = await readFile(selectedFile);
        if (result.success) {
          setFileContent(result.content || '');
          setIsFileMode(true);
        }
      }
    };

    const handleFileWrite = async () => {
      if (selectedFile && fileContent) {
        const result = await writeFile(selectedFile, fileContent);
        if (result.success) {
          setIsFileMode(false);
          setFileContent('');
          setSelectedFile('');
        }
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
          maxWidth: `${layoutConfig?.containerWidth || 400}px`,
          margin: '0 auto',
          width: '100%',
          height: '100%',
        }}
      >
        {/* System Info Header */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Desktop Terminal
          </Typography>
          {systemInfo && (
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`${systemInfo.os_name} ${systemInfo.os_version}`}
                size="small"
                variant="outlined"
              />
              <Chip label={systemInfo.architecture} size="small" variant="outlined" />
            </Box>
          )}
        </Box>

        {/* Working Directory */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="textSecondary">
            Working Directory:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Folder fontSize="small" />
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {workingDirectory || '~'}
            </Typography>
            <IconButton size="small" onClick={handleListDirectory}>
              <Refresh fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* File Operations Mode */}
        {isFileMode ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <InsertDriveFile fontSize="small" />
              <Typography variant="body2">{selectedFile}</Typography>
              <Button size="small" onClick={() => setIsFileMode(false)}>
                Back to Terminal
              </Button>
            </Box>
            <TextField
              multiline
              rows={8}
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              placeholder="File content..."
              variant="outlined"
              size="small"
              sx={{ flex: 1, mb: 1 }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleFileWrite}
                disabled={!selectedFile || isExecuting}
              >
                Save File
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setIsFileMode(false);
                  setFileContent('');
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        ) : (
          <>
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
                minHeight: '200px',
                maxHeight: '300px',
                border: '1px solid #333',
              }}
            >
              {terminalOutput ? (
                formatTerminalOutput(terminalOutput)
              ) : (
                <Typography variant="body2" sx={{ color: '#888', fontFamily: 'monospace' }}>
                  Terminal ready. Type commands below...
                </Typography>
              )}
            </Paper>

            {/* Command Input */}
            <Box
              component="form"
              onSubmit={handleCommandSubmit}
              sx={{ mt: 1, display: 'flex', gap: 1 }}
            >
              <TextField
                ref={commandInputRef}
                value={currentCommand}
                onChange={(e) => setCurrentCommand(e.target.value)}
                onKeyDown={handleCommandKeyDown}
                placeholder="Enter bash command..."
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
              <Tooltip title="Execute Command">
                <IconButton
                  type="submit"
                  disabled={!session.connected || isExecuting || !currentCommand.trim()}
                  color="primary"
                >
                  {isExecuting ? <CircularProgress size={20} /> : <PlayArrow />}
                </IconButton>
              </Tooltip>
            </Box>

            {/* Quick Actions */}
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => executeCommand('ls -la')}
                disabled={!session.connected || isExecuting}
                startIcon={<Folder />}
              >
                List Files
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => executeCommand('pwd')}
                disabled={!session.connected || isExecuting}
                startIcon={<Terminal />}
              >
                Show Path
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={clearTerminal}
                disabled={isExecuting}
                startIcon={<Clear />}
              >
                Clear
              </Button>
            </Box>

            {/* Directory Listing */}
            {directoryListing.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="caption" color="textSecondary">
                  Directory Contents:
                </Typography>
                <Box sx={{ maxHeight: '100px', overflow: 'auto' }}>
                  {directoryListing.slice(0, 10).map((file, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'action.hover' },
                        p: 0.5,
                      }}
                      onClick={() => setSelectedFile(file)}
                    >
                      <InsertDriveFile fontSize="small" />
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'monospace',
                          color: selectedFile === file ? 'primary.main' : 'inherit',
                        }}
                      >
                        {file}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* File Operations */}
            {selectedFile && (
              <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleFileRead}
                  disabled={!session.connected || isExecuting}
                  startIcon={<InsertDriveFile />}
                >
                  Read File
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setFileContent('');
                    setIsFileMode(true);
                  }}
                  disabled={!session.connected || isExecuting}
                  startIcon={<InsertDriveFile />}
                >
                  Edit File
                </Button>
              </Box>
            )}

            {/* Command History */}
            {commandHistory.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="caption" color="textSecondary">
                  Recent Commands:
                </Typography>
                <Box sx={{ maxHeight: '60px', overflow: 'auto' }}>
                  {commandHistory.slice(-5).map((cmd, index) => (
                    <Box
                      key={index}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'action.hover' },
                        p: 0.5,
                      }}
                      onClick={() => setCurrentCommand(cmd)}
                    >
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {cmd}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}

        {/* Disconnect Button */}
        <Box sx={{ pt: 1, borderTop: '1px solid #e0e0e0', mt: 1 }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleDisconnectWithCallback}
            disabled={isDisconnecting}
            fullWidth
            size="small"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </Box>
      </Box>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    const hostChanged = JSON.stringify(prevProps.host) !== JSON.stringify(nextProps.host);
    const deviceIdChanged = prevProps.deviceId !== nextProps.deviceId;
    const isCollapsedChanged = prevProps.isCollapsed !== nextProps.isCollapsed;
    const panelWidthChanged = prevProps.panelWidth !== nextProps.panelWidth;
    const panelHeightChanged = prevProps.panelHeight !== nextProps.panelHeight;
    const streamContainerDimensionsChanged =
      JSON.stringify(prevProps.streamContainerDimensions) !==
      JSON.stringify(nextProps.streamContainerDimensions);

    // Return true if props are equal (don't re-render), false if they changed (re-render)
    const shouldSkipRender =
      !hostChanged &&
      !deviceIdChanged &&
      !isCollapsedChanged &&
      !panelWidthChanged &&
      !panelHeightChanged &&
      !streamContainerDimensionsChanged;

    return shouldSkipRender;
  },
);
