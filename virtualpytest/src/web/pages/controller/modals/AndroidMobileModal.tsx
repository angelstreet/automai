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
} from '@mui/material';
import { useAndroidMobileConnection } from '../hooks/useAndroidMobileConnection';

interface AndroidMobileModalProps {
  open: boolean;
  onClose: () => void;
}

export function AndroidMobileModal({ open, onClose }: AndroidMobileModalProps) {
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

  // Load default values when modal opens
  useEffect(() => {
    if (open) {
      fetchDefaultValues();
    }
  }, [open, fetchDefaultValues]);

  // Auto-dump function that triggers after UI interactions (same as RecAndroidPhoneRemote)
  const scheduleAutoDump = () => {
    // Only auto-dump if overlay is currently visible (user is actively inspecting UI)
    if (!showOverlay) return;

    // Clear any existing timer
    if (autoDumpTimerRef.current) {
      clearTimeout(autoDumpTimerRef.current);
    }

    setIsAutoDumpScheduled(true);

    // Schedule new dump after 2 seconds
    autoDumpTimerRef.current = setTimeout(() => {
      console.log('[@component:AndroidMobileModal] Auto-dumping UI elements after action');
      setIsAutoDumpScheduled(false);
      handleDumpUIWithLoading();
    }, 2000);
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
      
      // Note: We don't check androidElements.length here because the state update is asynchronous
      // The backend filtering will ensure we only get useful elements
      // If the backend returns success but no elements, it means the screen is truly empty
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to take screenshot and dump UI';
      setDumpError(errorMessage);
      console.error('[@component:AndroidMobileModal] Screenshot and UI dump failed:', error);
    } finally {
      setIsDumpingUI(false);
    }
  };

  // Handle element click from overlay (same pattern as RecAndroidPhoneRemote)
  const handleOverlayElementClick = async (element: any) => {
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
    onClose();
  };

  // Update device resolution when screenshot is available
  useEffect(() => {
    if (androidScreenshot && screenshotRef.current) {
      // Try to get resolution from screenshot metadata or use default
      // For now, use default Android phone resolution
      setDeviceResolution({ width: 1080, height: 2340 });
    }
  }, [androidScreenshot]);

  return (
    <Dialog open={open} onClose={handleCloseModal} maxWidth="lg" fullWidth>
      <DialogTitle>Android Mobile Remote Control</DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Left Column: Connection & Screenshot */}
          <Grid item xs={6}>
            {!session.connected ? (
              /* Connection Form */
              <Box>
                <Typography variant="h6" gutterBottom>
                  SSH + ADB Connection
                </Typography>
                
                {connectionError && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                    <Typography color="error">{connectionError}</Typography>
                  </Box>
                )}

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
                  onClick={handleConnect}
                  disabled={connectionLoading || !connectionForm.host_ip || !connectionForm.host_username || !connectionForm.host_password || !connectionForm.device_ip}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  {connectionLoading ? <CircularProgress size={20} /> : 'Connect'}
                </Button>
              </Box>
            ) : (
              /* Screenshot Display */
              <Box>
                
                {androidScreenshot ? (
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      ref={screenshotRef}
                      src={`data:image/png;base64,${androidScreenshot}`}
                      alt="Android Screenshot"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '500px',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                      }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ 
                    width: '100%', 
                    height: 400, 
                    border: '2px dashed #ccc', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderRadius: 1
                  }}>
                    <Typography color="textSecondary">
                      No screenshot available. Click "Screenshot & Dump UI" to capture.
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Grid>

          {/* Right Column: Mobile Features */}
          <Grid item xs={6}>
            {/* App Launcher Section */}
            <Box sx={{ mb: 1 }}>
             
              <Box sx={{ mb: 2, mt: 2}}>
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
                  disabled={isDumpingUI}
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

              {/* Show overlay toggle */}
              {androidElements.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Button
                    variant={showOverlay ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setShowOverlay(!showOverlay)}
                    sx={{ flex: 1 }}
                  >
                    {showOverlay ? 'Hide Overlay' : 'Show Overlay'}
                  </Button>
                  {isAutoDumpScheduled && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="caption">Auto-dump in 2s...</Typography>
                    </Box>
                  )}
                </Box>
              )}

              {dumpError && (
                <Box sx={{ mb: 1, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
                  <Typography variant="caption" color="error">{dumpError}</Typography>
                </Box>
              )}

              {/* Always show element selection dropdown */}
              <FormControl fullWidth size="small" >
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
              {/* System buttons */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1   }}>
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
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
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
              <Box sx={{ display: 'flex', gap: 1 }}>
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
            </Box>

            {/* Modal Controls */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
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
                  onClick={handleDisconnect}
                  disabled={connectionLoading}
                  sx={{ flex: 1 }}
                >
                  {connectionLoading ? <CircularProgress size={20} /> : 'Release Control'}
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
} 