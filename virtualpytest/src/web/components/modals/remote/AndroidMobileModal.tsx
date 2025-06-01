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
  Alert,
} from '@mui/material';
import { useRemoteConnection } from '../../../hooks/remote/useRemoteConnection';
import { AndroidMobileCore } from '../../remote/AndroidMobileCore';
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

  // Auto-dump function that triggers after UI interactions
  const scheduleAutoDump = () => {
    if (!showOverlay) return;

    if (autoDumpTimerRef.current) {
      clearTimeout(autoDumpTimerRef.current);
    }

    setIsAutoDumpScheduled(true);

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
      setSelectedElement(element.id.toString());
      scheduleAutoDump();
    } catch (error: any) {
      console.error('[@component:AndroidMobileModal] Element click failed:', error);
      setDumpError(`Element click failed: ${error.message}`);
    }
  };

  // Clear overlay
  const handleClearOverlay = () => {
    if (autoDumpTimerRef.current) {
      clearTimeout(autoDumpTimerRef.current);
      autoDumpTimerRef.current = null;
      setIsAutoDumpScheduled(false);
    }

    setShowOverlay(false);
  };

  // Handle modal close
  const handleCloseModal = () => {
    handleClearOverlay();
    setDumpError(null);
    onClose();
  };

  // Enhanced release control handler with error clearing
  const handleReleaseControlWithCleanup = async () => {
    try {
      await handleReleaseControl();
      setDumpError(null);
    } catch (error) {
      console.error('[@component:AndroidMobileModal] Release control failed:', error);
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
    console.log(`[@component:AndroidMobileModal] Elements updated: ${androidElements.length} elements`);
    if (androidElements.length > 0) {
      console.log(`[@component:AndroidMobileModal] Auto-showing overlay for ${androidElements.length} elements`);
      setShowOverlay(true);
    }
  }, [androidElements]);

  return (
    <>
      <Dialog open={open} onClose={handleCloseModal} maxWidth="lg" fullWidth>
        <DialogTitle>Android Mobile Remote Control</DialogTitle>
        <DialogContent>
          {/* Two-column layout: Connection form/screenshot on left, remote control on right */}
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

            {/* Right Column: Remote Control */}
            <Grid item xs={6}>
              <AndroidMobileCore
                session={session}
                connectionLoading={connectionLoading}
                connectionError={connectionError}
                dumpError={dumpError}
                androidApps={androidApps}
                androidElements={androidElements}
                isDumpingUI={isDumpingUI}
                selectedApp={selectedApp}
                selectedElement={selectedElement}
                setSelectedApp={setSelectedApp}
                setSelectedElement={setSelectedElement}
                handleGetApps={handleGetApps}
                handleDumpUIWithLoading={handleDumpUIWithLoading}
                clearElements={clearElements}
                handleRemoteCommand={handleRemoteCommand}
                handleOverlayElementClick={handleOverlayElementClick}
                onDisconnect={handleReleaseControlWithCleanup}
              />
            </Grid>
          </Grid>
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