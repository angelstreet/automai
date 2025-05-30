import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Android, Settings, Fullscreen, FullscreenExit } from '@mui/icons-material';

// Updated imports to use new structure
import { useAndroidMobileConnection } from '../../hooks/remote/useAndroidMobileConnection';
import { AndroidMobileOverlay } from './AndroidMobileOverlay';

interface AndroidMobileRemotePanelProps {
  /** Optional pre-configured connection parameters */
  connectionConfig?: {
    host_ip: string;
    host_port?: string;
    host_username: string;
    host_password: string;
    device_ip: string;
    device_port?: string;
  };
  /** Whether to auto-connect on mount if config is provided */
  autoConnect?: boolean;
  /** Compact mode for smaller spaces like NavigationEditor */
  compact?: boolean;
  /** Show/hide screenshot display */
  showScreenshot?: boolean;
  /** Custom styling */
  sx?: any;
}

export function AndroidMobileRemotePanel({
  connectionConfig,
  autoConnect = false,
  compact = false,
  showScreenshot = true,
  sx = {}
}: AndroidMobileRemotePanelProps) {
  // UI state
  const [isDumpingUI, setIsDumpingUI] = useState(false);
  const [dumpError, setDumpError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState('');
  const [selectedElement, setSelectedElement] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [deviceResolution, setDeviceResolution] = useState({ width: 1080, height: 2340 });

  // Auto-dump functionality
  const [isAutoDumpScheduled, setIsAutoDumpScheduled] = useState(false);
  const autoDumpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const screenshotRef = useRef<HTMLImageElement>(null);

  // Use the Android Mobile connection hook
  const {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    androidElements,
    androidApps,
    androidScreenshot,
    handleConnect,
    handleDisconnect,
    handleCommand,
    handleScreenshotAndDumpUI,
    handleClickElement,
    handleGetApps,
    clearElements,
    fetchDefaultValues,
  } = useAndroidMobileConnection();

  // Initialize connection form with provided config
  useEffect(() => {
    if (connectionConfig) {
      setConnectionForm({
        host_ip: connectionConfig.host_ip,
        host_port: connectionConfig.host_port || '22',
        host_username: connectionConfig.host_username,
        host_password: connectionConfig.host_password,
        device_ip: connectionConfig.device_ip,
        device_port: connectionConfig.device_port || '5555',
      });
    } else {
      fetchDefaultValues();
    }
  }, [connectionConfig, fetchDefaultValues, setConnectionForm]);

  // Auto-connect if config is provided and autoConnect is true
  useEffect(() => {
    if (connectionConfig && autoConnect && !session.connected && !connectionLoading) {
      console.log('[@component:AndroidMobileRemotePanel] Auto-connecting with provided config');
      handleConnect();
    }
  }, [connectionConfig, autoConnect, session.connected, connectionLoading, handleConnect]);

  // Auto-dump function that triggers after UI interactions
  const scheduleAutoDump = () => {
    if (!showOverlay) return;

    if (autoDumpTimerRef.current) {
      clearTimeout(autoDumpTimerRef.current);
    }

    setIsAutoDumpScheduled(true);

    autoDumpTimerRef.current = setTimeout(() => {
      console.log('[@component:AndroidMobileRemotePanel] Auto-dumping UI elements after action');
      setIsAutoDumpScheduled(false);
      handleDumpUIWithLoading();
    }, 1500);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoDumpTimerRef.current) {
        clearTimeout(autoDumpTimerRef.current);
      }
    };
  }, []);

  // Enhanced dump UI handler with loading state
  const handleDumpUIWithLoading = async () => {
    setIsDumpingUI(true);
    setDumpError(null);
    try {
      await handleScreenshotAndDumpUI();
      console.log('[@component:AndroidMobileRemotePanel] Screenshot and UI dump completed, elements found:', androidElements.length);
      setShowOverlay(true);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to take screenshot and dump UI';
      setDumpError(errorMessage);
      console.error('[@component:AndroidMobileRemotePanel] Screenshot and UI dump failed:', error);
    } finally {
      setIsDumpingUI(false);
    }
  };

  // Handle element click from overlay
  const handleOverlayElementClick = async (element: any) => {
    console.log(`[@component:AndroidMobileRemotePanel] Received overlay click for element ID ${element.id}`);
    
    try {
      await handleClickElement(element);
      setSelectedElement(element.id.toString());
      scheduleAutoDump();
    } catch (error: any) {
      console.error('[@component:AndroidMobileRemotePanel] Element click failed:', error);
      setDumpError(`Element click failed: ${error.message}`);
    }
  };

  // Update device resolution when screenshot is available
  useEffect(() => {
    if (androidScreenshot && screenshotRef.current) {
      setDeviceResolution({ width: 1080, height: 2340 });
    }
  }, [androidScreenshot]);

  // Auto-show overlay when elements are available
  useEffect(() => {
    if (androidElements.length > 0) {
      setShowOverlay(true);
    }
  }, [androidElements]);

  // Connection status display
  if (!session.connected) {
    return (
      <Box sx={{ 
        p: compact ? 1 : 2, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        ...sx 
      }}>
        <Typography variant={compact ? "body2" : "h6"} color="textSecondary" gutterBottom>
          Device Not Connected
        </Typography>
        {connectionConfig ? (
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={connectionLoading}
            size={compact ? "small" : "medium"}
          >
            {connectionLoading ? <CircularProgress size={16} /> : 'Connect'}
          </Button>
        ) : (
          <Typography variant="caption" color="textSecondary" textAlign="center">
            Configure device parameters to enable remote control
          </Typography>
        )}
        {connectionError && (
          <Typography variant="caption" color="error" sx={{ mt: 1, textAlign: 'center' }}>
            {connectionError}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: compact ? 1 : 2, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'auto',
      ...sx 
    }}>
      {/* Screenshot Display (optional) */}
      {showScreenshot && (
        <Box sx={{ mb: 2 }}>
          {androidScreenshot ? (
            <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <img
                ref={screenshotRef}
                src={`data:image/png;base64,${androidScreenshot}`}
                alt="Android Screenshot"
                style={{
                  maxWidth: '100%',
                  maxHeight: compact ? '200px' : '300px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </Box>
          ) : (
            <Box sx={{ 
              height: compact ? 150 : 200, 
              border: '2px dashed #ccc', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 1,
              mb: 2
            }}>
              <Typography variant="caption" color="textSecondary" textAlign="center">
                Take screenshot to see device screen
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* App Launcher Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant={compact ? "subtitle2" : "h6"} gutterBottom>
          App Launcher
        </Typography>
        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <InputLabel>Select an app...</InputLabel>
          <Select
            value={selectedApp}
            label="Select an app..."
            disabled={androidApps.length === 0}
            onChange={(e) => {
              const appPackage = e.target.value;
              if (appPackage) {
                setSelectedApp(appPackage);
                handleCommand('LAUNCH_APP', { package: appPackage });
              }
            }}
          >
            {androidApps.map((app) => (
              <MenuItem key={app.packageName} value={app.packageName}>
                {app.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          size="small"
          onClick={handleGetApps}
          fullWidth
        >
          Refresh Apps
        </Button>
      </Box>

      {/* UI Elements Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant={compact ? "subtitle2" : "h6"} gutterBottom>
          UI Elements ({androidElements.length})
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleDumpUIWithLoading}
            disabled={isDumpingUI}
            sx={{ flex: 1, minWidth: 'fit-content' }}
          >
            {isDumpingUI ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircularProgress size={12} />
                <Typography variant="caption">Capture</Typography>
              </Box>
            ) : (
              'Screenshot & Dump'
            )}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={clearElements}
            disabled={androidElements.length === 0}
            sx={{ flex: 1, minWidth: 'fit-content' }}
          >
            Clear
          </Button>
        </Box>

        {/* Show overlay toggle */}
        {androidElements.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
            <Button
              variant={showOverlay ? "contained" : "outlined"}
              size="small"
              onClick={() => setShowOverlay(!showOverlay)}
              sx={{ flex: 1 }}
            >
              {showOverlay ? 'Hide Overlay' : 'Show Overlay'}
            </Button>
            {isAutoDumpScheduled && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircularProgress size={12} />
                <Typography variant="caption">Auto-dump...</Typography>
              </Box>
            )}
          </Box>
        )}

        {dumpError && (
          <Box sx={{ mb: 1, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography variant="caption" color="error">{dumpError}</Typography>
          </Box>
        )}

        {/* Element selection dropdown */}
        <FormControl fullWidth size="small">
          <InputLabel>Select element to click...</InputLabel>
          <Select
            value={selectedElement}
            label="Select element to click..."
            disabled={androidElements.length === 0}
            onChange={(e) => {
              const elementId = parseInt(e.target.value as string);
              const element = androidElements.find(el => el.id === elementId);
              if (element) {
                setSelectedElement(element.id.toString());
                handleOverlayElementClick(element);
              }
            }}
          >
            {androidElements.map((element) => {
              const getElementDisplayName = (el: any) => {
                if (el.contentDesc && el.contentDesc !== '<no content-desc>') {
                  return `${el.contentDesc} (${el.className})`;
                }
                if (el.text && el.text !== '<no text>') {
                  return `"${el.text}" (${el.className})`;
                }
                if (el.resourceId && el.resourceId !== '<no resource-id>') {
                  return `${el.resourceId} (${el.className})`;
                }
                return `${el.className} #${el.id}`;
              };

              return (
                <MenuItem key={element.id} value={element.id}>
                  {getElementDisplayName(element)}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Box>

      {/* Mobile Phone Controls */}
      <Box>
        <Typography variant={compact ? "subtitle2" : "h6"} gutterBottom>
          Device Controls
        </Typography>
        
        {/* System buttons */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleCommand('BACK')}
            sx={{ flex: 1 }}
          >
            Back
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleCommand('HOME')}
            sx={{ flex: 1 }}
          >
            Home
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleCommand('MENU')}
            sx={{ flex: 1 }}
          >
            Menu
          </Button>
        </Box>

        {/* Volume controls */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleCommand('VOLUME_UP')}
            sx={{ flex: 1 }}
          >
            Vol+
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleCommand('VOLUME_DOWN')}
            sx={{ flex: 1 }}
          >
            Vol-
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleCommand('POWER')}
            sx={{ flex: 1 }}
          >
            Power
          </Button>
        </Box>

        {/* Phone specific buttons */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleCommand('CAMERA')}
            sx={{ flex: 1 }}
          >
            Camera
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleCommand('CALL')}
            sx={{ flex: 1 }}
          >
            Call
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleCommand('ENDCALL')}
            sx={{ flex: 1 }}
          >
            End Call
          </Button>
        </Box>

        {/* Disconnect button */}
        <Button 
          variant="contained" 
          color="error"
          onClick={handleDisconnect}
          disabled={connectionLoading}
          size="small"
          fullWidth
          sx={{ mt: 1 }}
        >
          {connectionLoading ? <CircularProgress size={16} /> : 'Disconnect'}
        </Button>
      </Box>

      {/* AndroidMobileOverlay - positioned outside the panel */}
      {showOverlay && androidElements.length > 0 && showScreenshot && (
        <AndroidMobileOverlay
          elements={androidElements}
          screenshotElement={screenshotRef.current}
          deviceWidth={deviceResolution.width}
          deviceHeight={deviceResolution.height}
          isVisible={showOverlay}
          selectedElementId={selectedElement ? parseInt(selectedElement) : undefined}
          onElementClick={handleOverlayElementClick}
        />
      )}
    </Box>
  );
} 