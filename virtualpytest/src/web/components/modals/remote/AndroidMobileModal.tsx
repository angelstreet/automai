import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Button,
  TextField,
  Grid,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import { useRemoteConnection } from '../../../hooks/remote/useRemoteConnection';
import { AndroidMobileOverlay } from '../../remote/AndroidMobileOverlay';
import { AndroidElement } from '../../../types/remote/types';
import { BaseConnectionConfig } from '../../../types/remote/remoteTypes';

interface AndroidMobileModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional pre-configured connection parameters */
  connectionConfig?: BaseConnectionConfig;
  /** Whether to auto-connect on mount if config is provided */
  autoConnect?: boolean;
}

export function AndroidMobileModal({ open, onClose, connectionConfig, autoConnect }: AndroidMobileModalProps) {
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

  // Track if we've already initialized to prevent duplicate calls
  const isInitializedRef = useRef(false);

  // Debug logging
  console.log('[@component:AndroidMobileModal] Props received:', {
    open,
    autoConnect,
    connectionConfig,
    hasConnectionConfig: !!connectionConfig
  });

  // Use the extended remote connection hook for Android mobile
  const {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    androidElements,
    androidApps,
    androidScreenshot,
    handleTakeControl,
    handleReleaseControl,
    handleRemoteCommand,
    handleScreenshotAndDumpUI,
    handleClickElement,
    handleGetApps,
    clearElements,
    fetchDefaultValues,
  } = useRemoteConnection('android-mobile');

  // Initialize connection form with provided config or fetch defaults
  useEffect(() => {
    if (open && !isInitializedRef.current) {
      isInitializedRef.current = true;
      
      if (connectionConfig) {
        console.log('[@component:AndroidMobileModal] Initializing with provided config');
        setConnectionForm({
          host_ip: connectionConfig.host_ip,
          host_port: connectionConfig.host_port || '22',
          host_username: connectionConfig.host_username,
          host_password: connectionConfig.host_password,
          device_ip: connectionConfig.device_ip,
          device_port: connectionConfig.device_port || '5555',
        });
      } else {
        console.log('[@component:AndroidMobileModal] No config provided, fetching defaults');
        fetchDefaultValues();
      }
    }
    
    // Reset initialization when modal closes
    if (!open) {
      isInitializedRef.current = false;
    }
  }, [open, connectionConfig, fetchDefaultValues, setConnectionForm]);

  // Auto-connect when config is provided and modal opens
  useEffect(() => {
    // Check if connection form has all required fields populated
    const hasRequiredFields = connectionForm.host_ip && 
                             connectionForm.host_username && 
                             connectionForm.host_password && 
                             connectionForm.device_ip;
                             
    if (autoConnect && 
        connectionConfig && 
        open &&
        !session.connected && 
        !connectionLoading && 
        isInitializedRef.current && 
        hasRequiredFields) {
      console.log('[@component:AndroidMobileModal] Auto-connecting to Android Mobile...');
      handleTakeControl();
    }
  }, [autoConnect, connectionConfig, open, session.connected, connectionLoading, handleTakeControl, connectionForm]);

  // Debug logging for render condition
  useEffect(() => {
    console.log('[@component:AndroidMobileModal] Render condition debug:', {
      autoConnect,
      hasConnectionConfig: !!connectionConfig,
      shouldAutoConnect: !!(autoConnect && connectionConfig),
      sessionConnected: session.connected,
      open
    });
  });

  // Auto-dump function that triggers after UI interactions
  const scheduleAutoDump = () => {
    // Only auto-dump if overlay is currently visible (user is actively inspecting UI)
    if (!showOverlay) return;

    // Clear any existing timer
    if (autoDumpTimerRef.current) {
      clearTimeout(autoDumpTimerRef.current);
    }

    setIsAutoDumpScheduled(true);

    // Schedule new dump after 1.5 seconds
    autoDumpTimerRef.current = setTimeout(() => {
      console.log('[@component:AndroidMobileModal] Auto-dumping UI elements after action');
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
      console.log('[@component:AndroidMobileModal] Screenshot and UI dump completed, elements found:', androidElements.length);
      
      // Show overlay after successful dump
      setShowOverlay(true);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to take screenshot and dump UI';
      setDumpError(errorMessage);
      console.error('[@component:AndroidMobileModal] Screenshot and UI dump failed:', error);
    } finally {
      setIsDumpingUI(false);
    }
  };

  // Handle element click from overlay
  const handleOverlayElementClick = async (element: AndroidElement) => {
    console.log(`[@component:AndroidMobileModal] Received overlay click for element ID ${element.id}`);
    
    try {
      await handleClickElement(element);
      // Update selected element in UI for visual feedback
      setSelectedElement(element.id.toString());
      // Schedule auto-dump after successful element click
      scheduleAutoDump();
    } catch (error: any) {
      console.error('[@component:AndroidMobileModal] Element click failed:', error);
      setDumpError(`Element click failed: ${error.message}`);
    }
  };

  // Clear overlay
  const handleClearOverlay = () => {
    // Cancel any pending auto-dump
    if (autoDumpTimerRef.current) {
      clearTimeout(autoDumpTimerRef.current);
      autoDumpTimerRef.current = null;
      setIsAutoDumpScheduled(false);
    }

    setShowOverlay(false);
  };

  // Handle modal close
  const handleCloseModal = () => {
    // Clear overlay when closing modal
    handleClearOverlay();
    // Clear all errors when closing
    setDumpError(null);
    onClose();
  };

  // Enhanced release control handler with error clearing
  const handleReleaseControlWithCleanup = async () => {
    try {
      await handleReleaseControl();
      // Clear all errors after successful release
      setDumpError(null);
    } catch (error) {
      console.error('[@component:AndroidMobileModal] Release control failed:', error);
    }
  };

  // Update device resolution when screenshot is available
  useEffect(() => {
    if (androidScreenshot && screenshotRef.current) {
      // Use default Android phone resolution
      setDeviceResolution({ width: 1080, height: 2340 });
    }
  }, [androidScreenshot]);

  // Auto-show overlay when elements are available
  useEffect(() => {
    console.log(`[@component:AndroidMobileModal] Elements updated: ${androidElements.length} elements`);
    if (androidElements.length > 0) {
      console.log(`[@component:AndroidMobileModal] Auto-showing overlay for ${androidElements.length} elements`);
      setShowOverlay(true);
    }
  }, [androidElements]);

  // Simple boolean check for auto-connect mode
  const isAutoConnectMode = !!(autoConnect && connectionConfig);

  return (
    <>
      <Dialog open={open} onClose={handleCloseModal} maxWidth="lg" fullWidth>
        <DialogTitle>Android Mobile Remote Control</DialogTitle>
        <DialogContent>
          {/* When auto-connecting, show loading or connected interface only */}
          {isAutoConnectMode ? (
            // Auto-connect mode - show only remote control interface
            <Box sx={{ p: 2 }}>
              {!session.connected ? (
                /* Loading state during auto-connection */
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  minHeight: 300
                }}>
                  {connectionLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={24} />
                      <Typography variant="h6">
                        Connecting to Android Mobile...
                      </Typography>
                    </Box>
                  ) : connectionError ? (
                    <Box sx={{ textAlign: 'center' }}>
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {connectionError}
                      </Alert>
                      <Button
                        variant="contained"
                        onClick={handleTakeControl}
                        disabled={connectionLoading}
                      >
                        Retry Connection
                      </Button>
                    </Box>
                  ) : (
                    <Typography variant="h6" color="textSecondary">
                      Initializing connection...
                    </Typography>
                  )}
                </Box>
              ) : (
                /* Connected state - Remote control interface only */
                <Box sx={{ maxWidth: '400px', margin: '0 auto' }}>
                  {/* Remote Control Interface - Single Column Layout */}
                  {/* App Launcher Section */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      App Launcher ({androidApps.length} apps)
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Select an app...</InputLabel>
                        <Select
                          value={selectedApp}
                          label="Select an app..."
                          disabled={androidApps.length === 0}
                          onChange={(e) => {
                            const appPackage = e.target.value;
                            if (appPackage) {
                              setSelectedApp(appPackage);
                              handleRemoteCommand('LAUNCH_APP', { package: appPackage });
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
                    </Box>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleGetApps}
                      disabled={!session.connected}
                      fullWidth
                    >
                      Refresh Apps
                    </Button>
                  </Box>

                  {/* UI Elements Section */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      UI Elements ({androidElements.length})
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleDumpUIWithLoading}
                        disabled={!session.connected || isDumpingUI}
                        sx={{ flex: 1 }}
                      >
                        {isDumpingUI ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={16} />
                            <Typography variant="caption">Capturing...</Typography>
                          </Box>
                        ) : (
                          'Screenshot & Dump UI'
                        )}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={clearElements}
                        disabled={androidElements.length === 0}
                        sx={{ flex: 1 }}
                      >
                        Clear
                      </Button>
                    </Box>

                    {/* Element selection dropdown */}
                    <FormControl fullWidth size="small">
                      <InputLabel>Select element to click...</InputLabel>
                      <Select
                        value={selectedElement}
                        label="Select element to click..."
                        disabled={!session.connected || androidElements.length === 0}
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
                          // Helper function to get display name for element
                          const getElementDisplayName = (el: AndroidElement) => {
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

                  {/* Device Controls */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Device Controls
                    </Typography>
                    
                    {/* System buttons */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleRemoteCommand('BACK')}
                        disabled={!session.connected}
                        sx={{ flex: 1 }}
                      >
                        Back
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleRemoteCommand('HOME')}
                        disabled={!session.connected}
                        sx={{ flex: 1 }}
                      >
                        Home
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleRemoteCommand('MENU')}
                        disabled={!session.connected}
                        sx={{ flex: 1 }}
                      >
                        Menu
                      </Button>
                    </Box>

                    {/* Volume controls */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleRemoteCommand('VOLUME_UP')}
                        disabled={!session.connected}
                        sx={{ flex: 1 }}
                      >
                        Vol+
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleRemoteCommand('VOLUME_DOWN')}
                        disabled={!session.connected}
                        sx={{ flex: 1 }}
                      >
                        Vol-
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleRemoteCommand('POWER')}
                        disabled={!session.connected}
                        sx={{ flex: 1 }}
                      >
                        Power
                      </Button>
                    </Box>

                    {/* Phone specific buttons */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleRemoteCommand('CAMERA')}
                        disabled={!session.connected}
                        sx={{ flex: 1 }}
                      >
                        Camera
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleRemoteCommand('CALL')}
                        disabled={!session.connected}
                        sx={{ flex: 1 }}
                      >
                        Call
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleRemoteCommand('ENDCALL')}
                        disabled={!session.connected}
                        sx={{ flex: 1 }}
                      >
                        End Call
                      </Button>
                    </Box>
                  </Box>

                  {/* Error Display Area */}
                  {(connectionError || dumpError) && (
                    <Box sx={{ mb: 2 }}>
                      <Alert severity="error">
                        {connectionError || dumpError}
                      </Alert>
                    </Box>
                  )}

                  {/* Modal Controls */}
                  <Box sx={{ pt: 2, borderTop: '1px solid #e0e0e0' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button 
                        variant="outlined"
                        onClick={handleCloseModal}
                        sx={{ flex: 1 }}
                      >
                        Close
                      </Button>
                      <Button 
                        variant="contained" 
                        color="error"
                        onClick={handleReleaseControlWithCleanup}
                        disabled={connectionLoading}
                        sx={{ flex: 1 }}
                      >
                        {connectionLoading ? <CircularProgress size={20} /> : 'Release Control'}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            // Manual connection mode - show full interface with connection form
            <Grid container spacing={3}>
              {/* Left Column: Connection & Screenshot */}
              <Grid item xs={6}>
                {!session.connected ? (
                  /* Connection Form */
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      SSH + ADB Connection
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Host IP"
                          value={connectionForm.host_ip}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, host_ip: e.target.value }))}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Host Port"
                          value={connectionForm.host_port}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, host_port: e.target.value }))}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Username"
                          value={connectionForm.host_username}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, host_username: e.target.value }))}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Password"
                          type="password"
                          value={connectionForm.host_password}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, host_password: e.target.value }))}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Device IP"
                          value={connectionForm.device_ip}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, device_ip: e.target.value }))}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Device Port"
                          value={connectionForm.device_port}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, device_port: e.target.value }))}
                          size="small"
                        />
                      </Grid>
                    </Grid>

                    <Button
                      variant="contained"
                      onClick={handleTakeControl}
                      disabled={connectionLoading || !connectionForm.host_ip || !connectionForm.host_username || !connectionForm.host_password || !connectionForm.device_ip}
                      sx={{ mt: 2 }}
                      fullWidth
                    >
                      {connectionLoading ? <CircularProgress size={20} /> : 'Connect'}
                    </Button>

                    {/* Error Display Area - Bottom Left */}
                    <Box sx={{ mt: 2, minHeight: '60px' }}>
                      {(connectionError || dumpError) && (
                        <Alert severity="error">
                          {connectionError || dumpError}
                        </Alert>
                      )}
                    </Box>
                  </Box>
                ) : (
                  /* Screenshot Display with Error Area */
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                      {androidScreenshot ? (
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                          <img
                            ref={screenshotRef}
                            src={`data:image/png;base64,${androidScreenshot}`}
                            alt="Android Screenshot"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '400px',
                              border: '1px solid #ccc',
                              borderRadius: '8px',
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              msUserSelect: 'none',
                              pointerEvents: 'auto'
                            }}
                            draggable={false}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ 
                          width: '100%', 
                          height: 300, 
                          border: '2px dashed #ccc', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          borderRadius: 1,
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none'
                        }}>
                          <Typography color="textSecondary" textAlign="center">
                            Click "Screenshot & Dump UI" to capture.
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Error Display Area - Bottom Left */}
                    <Box sx={{ mt: 2, minHeight: '60px' }}>
                      {(connectionError || dumpError) && (
                        <Alert severity="error">
                          {connectionError || dumpError}
                        </Alert>
                      )}
                    </Box>
                  </Box>
                )}
              </Grid>

              {/* Right Column: Mobile Features */}
              <Grid item xs={6}>
                {/* App Launcher Section */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    App Launcher ({androidApps.length} apps)
                  </Typography>
                  
                  <Box sx={{ mb: 1, mt: 1}}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Select an app...</InputLabel>
                      <Select
                        value={selectedApp}
                        label="Select an app..."
                        disabled={androidApps.length === 0}
                        onChange={(e) => {
                          const appPackage = e.target.value;
                          if (appPackage) {
                            setSelectedApp(appPackage);
                            handleRemoteCommand('LAUNCH_APP', { package: appPackage });
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
                  </Box>

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleGetApps}
                    disabled={!session.connected}
                    fullWidth
                  >
                    Refresh Apps
                  </Button>
                </Box>

                {/* UI Elements Section */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    UI Elements ({androidElements.length})
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleDumpUIWithLoading}
                      disabled={!session.connected || isDumpingUI}
                      sx={{ flex: 1 }}
                    >
                      {isDumpingUI ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={16} />
                          <Typography variant="caption">Capturing...</Typography>
                        </Box>
                      ) : (
                        'Screenshot & Dump UI'
                      )}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={clearElements}
                      disabled={androidElements.length === 0}
                      sx={{ flex: 1 }}
                    >
                      Clear
                    </Button>
                  </Box>

                  {/* Element selection dropdown */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Select element to click...</InputLabel>
                    <Select
                      value={selectedElement}
                      label="Select element to click..."
                      disabled={!session.connected || androidElements.length === 0}
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
                        const getElementDisplayName = (el: AndroidElement) => {
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
                  <Typography variant="h6" gutterBottom>
                    Device Controls
                  </Typography>
                  
                  {/* System buttons */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleRemoteCommand('BACK')}
                      disabled={!session.connected}
                      sx={{ flex: 1 }}
                    >
                      Back
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleRemoteCommand('HOME')}
                      disabled={!session.connected}
                      sx={{ flex: 1 }}
                    >
                      Home
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleRemoteCommand('MENU')}
                      disabled={!session.connected}
                      sx={{ flex: 1 }}
                    >
                      Menu
                    </Button>
                  </Box>

                  {/* Volume controls */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleRemoteCommand('VOLUME_UP')}
                      disabled={!session.connected}
                      sx={{ flex: 1 }}
                    >
                      Vol+
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleRemoteCommand('VOLUME_DOWN')}
                      disabled={!session.connected}
                      sx={{ flex: 1 }}
                    >
                      Vol-
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleRemoteCommand('POWER')}
                      disabled={!session.connected}
                      sx={{ flex: 1 }}
                    >
                      Power
                    </Button>
                  </Box>

                  {/* Phone specific buttons */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleRemoteCommand('CAMERA')}
                      disabled={!session.connected}
                      sx={{ flex: 1 }}
                    >
                      Camera
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleRemoteCommand('CALL')}
                      disabled={!session.connected}
                      sx={{ flex: 1 }}
                    >
                      Call
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleRemoteCommand('ENDCALL')}
                      disabled={!session.connected}
                      sx={{ flex: 1 }}
                    >
                      End Call
                    </Button>
                  </Box>
                </Box>

                {/* Modal Controls */}
                <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      variant="outlined"
                      onClick={handleCloseModal}
                      sx={{ flex: 1 }}
                    >
                      Close
                    </Button>
                    <Button 
                      variant="contained" 
                      color="error"
                      onClick={handleReleaseControlWithCleanup}
                      disabled={connectionLoading}
                      sx={{ flex: 1 }}
                    >
                      {connectionLoading ? <CircularProgress size={20} /> : 'Release Control'}
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>

      {/* AndroidMobileOverlay - positioned outside the dialog */}
      {showOverlay && androidElements.length > 0 && (
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
    </>
  );
} 