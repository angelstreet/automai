import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  PhoneAndroid,
  PhoneIphone,
  Laptop,
  DesktopMac,
  Refresh,
  Screenshot,
  Apps,
  TouchApp,
  Visibility,
  VisibilityOff,
  Settings,
  Launch,
  Stop,
  Home,
  ArrowBack,
  VolumeUp,
  VolumeDown,
  PowerSettingsNew,
  Camera,
  Menu,
  Call,
  CallEnd,
  DeviceHub,
} from '@mui/icons-material';

import { Host } from '../../../types/common/Host_Types';
import { AppiumElement, AppiumApp } from '../../../types/controller/Remote_Types';
import { useAppiumRemote } from '../../../hooks/controller/useAppiumRemote';
import AppiumOverlay from './AppiumOverlay';

interface AppiumRemoteProps {
  host: Host;
  onDisconnect?: () => void;
}

const AppiumRemote: React.FC<AppiumRemoteProps> = ({ host, onDisconnect }) => {
  const {
    // State
    appiumElements,
    appiumApps,
    showOverlay,
    selectedElement,
    selectedApp,
    isDumpingUI,
    isDisconnecting,
    isRefreshingApps,
    detectedPlatform,

    // Actions
    handleDisconnect,
    handleOverlayElementClick,
    handleRemoteCommand,
    clearElements,
    handleGetApps,
    handleDumpUIWithLoading,

    // Setters
    setSelectedElement,
    setSelectedApp,
    setShowOverlay,

    // Configuration
    layoutConfig,

    // Session info
    session,
  } = useAppiumRemote(host);

  // Local state for UI
  const [showAppDialog, setShowAppDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [coordinateX, setCoordinateX] = useState('');
  const [coordinateY, setCoordinateY] = useState('');

  console.log('[@component:AppiumRemote] Rendered for host:', host?.host_name);

  // Platform icon mapping
  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'ios':
        return <PhoneIphone />;
      case 'android':
        return <PhoneAndroid />;
      case 'windows':
        return <Laptop />;
      case 'macos':
        return <DesktopMac />;
      default:
        return <DeviceHub />;
    }
  };

  // Platform-specific system keys
  const getSystemKeys = () => {
    if (!detectedPlatform) return [];

    const platformConfig = layoutConfig.deviceCapabilities[detectedPlatform];
    return platformConfig?.systemKeys || [];
  };

  // Handle key press
  const handleKeyPress = useCallback(
    async (key: string) => {
      console.log(`[@component:AppiumRemote] Key press: ${key}`);
      await handleRemoteCommand('press_key', { key });
    },
    [handleRemoteCommand],
  );

  // Handle text input
  const handleTextInput = useCallback(async () => {
    if (!textInput.trim()) return;

    console.log(`[@component:AppiumRemote] Text input: ${textInput}`);
    await handleRemoteCommand('input_text', { text: textInput });
    setTextInput('');
  }, [textInput, handleRemoteCommand]);

  // Handle coordinate tap
  const handleCoordinateTap = useCallback(async () => {
    const x = parseInt(coordinateX);
    const y = parseInt(coordinateY);

    if (isNaN(x) || isNaN(y)) return;

    console.log(`[@component:AppiumRemote] Coordinate tap: (${x}, ${y})`);
    await handleRemoteCommand('tap_coordinates', { x, y });
    setCoordinateX('');
    setCoordinateY('');
  }, [coordinateX, coordinateY, handleRemoteCommand]);

  // Handle app launch
  const handleAppLaunch = useCallback(
    async (app: AppiumApp) => {
      console.log(`[@component:AppiumRemote] Launching app: ${app.identifier}`);
      await handleRemoteCommand('launch_app', { app_identifier: app.identifier });
      setShowAppDialog(false);
    },
    [handleRemoteCommand],
  );

  // Handle disconnect with callback
  const handleDisconnectWithCallback = useCallback(async () => {
    await handleDisconnect();
    onDisconnect?.();
  }, [handleDisconnect, onDisconnect]);

  return (
    <Box>
      {/* Connection Status Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            {getPlatformIcon(detectedPlatform || session.deviceInfo?.platform || 'unknown')}
          </Grid>
          <Grid item xs>
            <Typography variant="h6">
              Appium Remote
              {detectedPlatform && (
                <Chip
                  label={detectedPlatform.toUpperCase()}
                  size="small"
                  sx={{ ml: 1 }}
                  color={session.connected ? 'success' : 'default'}
                />
              )}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {session.connectionInfo || 'Disconnected'}
            </Typography>
            {session.deviceInfo && (
              <Typography variant="caption" display="block">
                {session.deviceInfo.deviceName} ({session.deviceInfo.udid})
              </Typography>
            )}
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleDisconnectWithCallback}
              disabled={isDisconnecting || !session.connected}
              startIcon={isDisconnecting ? <CircularProgress size={16} /> : <Stop />}
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Control Panel */}
      {session.connected && (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Device Controls
          </Typography>

          {/* System Keys */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              System Keys
            </Typography>
            <Grid container spacing={1}>
              {getSystemKeys().map((key) => (
                <Grid item key={key}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleKeyPress(key)}
                    startIcon={
                      key === 'HOME' ? (
                        <Home />
                      ) : key === 'BACK' ? (
                        <ArrowBack />
                      ) : key === 'VOLUME_UP' ? (
                        <VolumeUp />
                      ) : key === 'VOLUME_DOWN' ? (
                        <VolumeDown />
                      ) : key === 'POWER' ? (
                        <PowerSettingsNew />
                      ) : key === 'CAMERA' ? (
                        <Camera />
                      ) : key === 'MENU' ? (
                        <Menu />
                      ) : key === 'CALL' ? (
                        <Call />
                      ) : key === 'ENDCALL' ? (
                        <CallEnd />
                      ) : undefined
                    }
                  >
                    {key.replace('_', ' ')}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Text Input */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Text Input
            </Typography>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs>
                <TextField
                  size="small"
                  placeholder="Enter text to input"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTextInput()}
                />
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleTextInput}
                  disabled={!textInput.trim()}
                >
                  Send
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Coordinate Tap */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Coordinate Tap
            </Typography>
            <Grid container spacing={1} alignItems="center">
              <Grid item>
                <TextField
                  size="small"
                  label="X"
                  type="number"
                  value={coordinateX}
                  onChange={(e) => setCoordinateX(e.target.value)}
                  sx={{ width: 80 }}
                />
              </Grid>
              <Grid item>
                <TextField
                  size="small"
                  label="Y"
                  type="number"
                  value={coordinateY}
                  onChange={(e) => setCoordinateY(e.target.value)}
                  sx={{ width: 80 }}
                />
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleCoordinateTap}
                  disabled={!coordinateX || !coordinateY}
                  startIcon={<TouchApp />}
                >
                  Tap
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {/* Action Buttons */}
      {session.connected && (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Actions
          </Typography>

          <Grid container spacing={1}>
            {/* Screenshot & UI Dump */}
            <Grid item>
              <Tooltip title="Take screenshot and dump UI elements">
                <Button
                  variant="outlined"
                  startIcon={isDumpingUI ? <CircularProgress size={16} /> : <Screenshot />}
                  onClick={handleDumpUIWithLoading}
                  disabled={isDumpingUI}
                >
                  {isDumpingUI ? 'Dumping...' : 'Screenshot & Dump'}
                </Button>
              </Tooltip>
            </Grid>

            {/* Toggle Overlay */}
            {appiumElements.length > 0 && (
              <Grid item>
                <Tooltip title={showOverlay ? 'Hide element overlay' : 'Show element overlay'}>
                  <Button
                    variant="outlined"
                    startIcon={showOverlay ? <VisibilityOff /> : <Visibility />}
                    onClick={() => setShowOverlay(!showOverlay)}
                  >
                    {showOverlay ? 'Hide Overlay' : 'Show Overlay'}
                  </Button>
                </Tooltip>
              </Grid>
            )}

            {/* Apps */}
            <Grid item>
              <Tooltip title="View and launch apps">
                <Button
                  variant="outlined"
                  startIcon={isRefreshingApps ? <CircularProgress size={16} /> : <Apps />}
                  onClick={() => setShowAppDialog(true)}
                  disabled={isRefreshingApps}
                >
                  Apps ({appiumApps.length})
                </Button>
              </Tooltip>
            </Grid>

            {/* Refresh Apps */}
            <Grid item>
              <Tooltip title="Refresh app list">
                <IconButton onClick={handleGetApps} disabled={isRefreshingApps}>
                  {isRefreshingApps ? <CircularProgress size={20} /> : <Refresh />}
                </IconButton>
              </Tooltip>
            </Grid>

            {/* Clear Elements */}
            {appiumElements.length > 0 && (
              <Grid item>
                <Button variant="outlined" color="secondary" onClick={clearElements}>
                  Clear Elements
                </Button>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Element Info */}
      {appiumElements.length > 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            UI Elements ({appiumElements.length})
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {showOverlay
              ? 'Click on highlighted elements in the screenshot'
              : 'Enable overlay to interact with elements'}
          </Typography>
          {selectedElement && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" display="block">
                Selected: Element {selectedElement}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Apps Dialog */}
      <Dialog open={showAppDialog} onClose={() => setShowAppDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Available Apps ({appiumApps.length})
          {detectedPlatform && (
            <Chip label={detectedPlatform.toUpperCase()} size="small" sx={{ ml: 1 }} />
          )}
        </DialogTitle>
        <DialogContent>
          {appiumApps.length === 0 ? (
            <Typography color="textSecondary">
              No apps available. Click refresh to load apps.
            </Typography>
          ) : (
            <List>
              {appiumApps.map((app, index) => (
                <ListItem key={app.identifier} button onClick={() => handleAppLaunch(app)}>
                  <ListItemIcon>
                    <Launch />
                  </ListItemIcon>
                  <ListItemText primary={app.label} secondary={app.identifier} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleGetApps} disabled={isRefreshingApps}>
            {isRefreshingApps ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={() => setShowAppDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Appium Overlay */}
      {session.connected && showOverlay && appiumElements.length > 0 && (
        <AppiumOverlay
          elements={appiumElements}
          onElementClick={handleOverlayElementClick}
          selectedElementId={selectedElement}
          highlightColors={layoutConfig.uiConfig.elementHighlightColors}
        />
      )}
    </Box>
  );
};

export default AppiumRemote;
