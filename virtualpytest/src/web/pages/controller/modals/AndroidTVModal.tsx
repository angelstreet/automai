import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Grid,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';

import { 
  AndroidTVSession, 
  ConnectionForm, 
  RemoteConfig 
} from '../types';
import { useAndroidTVConnection } from '../hooks/useAndroidTVConnection';
import { RemoteInterface } from '../components/RemoteInterface';

interface AndroidTVModalProps {
  open: boolean;
  onClose: () => void;
}

export const AndroidTVModal: React.FC<AndroidTVModalProps> = ({ open, onClose }) => {
  const {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    remoteConfig,
    handleTakeControl,
    handleReleaseControl,
    handleRemoteCommand,
    fetchDefaultValues,
  } = useAndroidTVConnection();

  const [showOverlays, setShowOverlays] = useState(false);
  const [remoteScale, setRemoteScale] = useState(1.2);

  // Load default values when modal opens
  useEffect(() => {
    if (open) {
      fetchDefaultValues();
    }
  }, [open, fetchDefaultValues]);

  // Update scale when config loads
  useEffect(() => {
    if (remoteConfig) {
      setRemoteScale(remoteConfig.remote_info.default_scale);
    }
  }, [remoteConfig]);

  const handleCloseModal = () => {
    if (session.connected) {
      handleReleaseControl();
    }
    onClose();
  };

  const handleScreenshot = () => {
    // TODO: Implement screenshot functionality
    console.log('[@component:AndroidTVModal] Screenshot button clicked');
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCloseModal}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>Android TV Remote Control</DialogTitle>
      <DialogContent>
        {!session.connected ? (
          <Grid container spacing={3}>
            {/* Left Column: Connection Form */}
            <Grid item xs={6}>
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
                  onClick={handleTakeControl}
                  disabled={connectionLoading || !connectionForm.host_ip || !connectionForm.host_username || !connectionForm.host_password || !connectionForm.device_ip}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  {connectionLoading ? <CircularProgress size={20} /> : 'Connect'}
                </Button>
              </Box>
            </Grid>

            {/* Right Column: Placeholder */}
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
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
                    Connect to view Android TV interface
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {/* Left Column: Screenshot Placeholder */}
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
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
                    No screenshot available. Click "Screenshot" to capture.
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Right Column: Remote Control */}
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Remote Control Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label="Connected" 
                      color="success" 
                      size="small"
                    />
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* Show Overlays button */}
                    <Button
                      variant={showOverlays ? "contained" : "outlined"}
                      size="small"
                      onClick={() => setShowOverlays(!showOverlays)}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      {showOverlays ? 'Hide Overlays' : 'Show Overlays'}
                    </Button>
                    
                    {/* Scale controls */}
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                        Scale:
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => setRemoteScale(prev => Math.max(remoteConfig?.remote_info.min_scale || 0.5, prev - 0.1))}
                        disabled={remoteScale <= (remoteConfig?.remote_info.min_scale || 0.5)}
                        sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}
                      >
                        -
                      </Button>
                      <Typography variant="caption" sx={{ minWidth: 35, textAlign: 'center', fontSize: '0.75rem' }}>
                        {Math.round(remoteScale * 100)}%
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => setRemoteScale(prev => Math.min(remoteConfig?.remote_info.max_scale || 2.0, prev + 0.1))}
                        disabled={remoteScale >= (remoteConfig?.remote_info.max_scale || 2.0)}
                        sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}
                      >
                        +
                      </Button>
                    </Box>
                  </Box>
                </Box>

                {/* Remote Interface */}
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                  <RemoteInterface
                    remoteConfig={remoteConfig}
                    scale={remoteScale}
                    showOverlays={showOverlays}
                    onCommand={handleRemoteCommand}
                    fallbackImageUrl="/android-tv-remote.png"
                    fallbackName="Android TV Remote"
                  />
                </Box>

                {/* Screenshot Button */}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleScreenshot}
                    fullWidth
                  >
                    Screenshot
                  </Button>
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
                      onClick={handleReleaseControl}
                      disabled={connectionLoading}
                      sx={{ flex: 1 }}
                    >
                      {connectionLoading ? <CircularProgress size={20} /> : 'Release Control'}
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
}; 