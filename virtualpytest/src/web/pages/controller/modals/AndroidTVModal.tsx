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
    if (localRemoteConfig) {
      setRemoteScale(localRemoteConfig.remote_info.default_scale);
    }
  }, []);

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

  // Local button layout configuration for better control
  const localRemoteConfig = {
    remote_info: {
      name: 'Fire TV Remote',
      type: 'android_tv',
      image_url: '/android-tv-remote.png',
      default_scale: 0.6,
      min_scale: 0.3,
      max_scale: 1.0,
      button_scale_factor: 1.5,
      global_offset: { x: 0, y: 0 }
    },
    button_layout: {
      power: {
        key: 'POWER',
        position: { x: 70, y: 30 },
        size: { width: 14, height: 14 },
        shape: 'circle',
        comment: 'Power button'
      },
      voice: {
        key: 'VOICE_ASSIST',
        position: { x: 70, y: 55 },
        size: { width: 16, height: 16 },
        shape: 'circle',
        comment: 'Voice/microphone button'
      },
      nav_up: {
        key: 'DPAD_UP',
        position: { x: 70, y: 95 },
        size: { width: 18, height: 10 },
        shape: 'rectangle',
        comment: 'Navigation up'
      },
      nav_left: {
        key: 'DPAD_LEFT',
        position: { x: 52, y: 110 },
        size: { width: 10, height: 18 },
        shape: 'rectangle',
        comment: 'Navigation left'
      },
      nav_center: {
        key: 'DPAD_CENTER',
        position: { x: 70, y: 110 },
        size: { width: 14, height: 14 },
        shape: 'circle',
        comment: 'Navigation center/select'
      },
      nav_right: {
        key: 'DPAD_RIGHT',
        position: { x: 88, y: 110 },
        size: { width: 10, height: 18 },
        shape: 'rectangle',
        comment: 'Navigation right'
      },
      nav_down: {
        key: 'DPAD_DOWN',
        position: { x: 70, y: 125 },
        size: { width: 18, height: 10 },
        shape: 'rectangle',
        comment: 'Navigation down'
      },
      back: {
        key: 'BACK',
        position: { x: 48, y: 150 },
        size: { width: 12, height: 12 },
        shape: 'circle',
        comment: 'Back button'
      },
      home: {
        key: 'HOME',
        position: { x: 70, y: 150 },
        size: { width: 12, height: 12 },
        shape: 'circle',
        comment: 'Home button'
      },
      menu: {
        key: 'MENU',
        position: { x: 92, y: 150 },
        size: { width: 12, height: 12 },
        shape: 'circle',
        comment: 'Menu button'
      },
      rewind: {
        key: 'MEDIA_REWIND',
        position: { x: 48, y: 175 },
        size: { width: 12, height: 12 },
        shape: 'circle',
        comment: 'Rewind button'
      },
      play_pause: {
        key: 'MEDIA_PLAY_PAUSE',
        position: { x: 70, y: 175 },
        size: { width: 12, height: 12 },
        shape: 'circle',
        comment: 'Play/pause button'
      },
      fast_forward: {
        key: 'MEDIA_FAST_FORWARD',
        position: { x: 92, y: 175 },
        size: { width: 12, height: 12 },
        shape: 'circle',
        comment: 'Fast forward button'
      },
      volume_up: {
        key: 'VOLUME_UP',
        position: { x: 70, y: 200 },
        size: { width: 16, height: 16 },
        shape: 'circle',
        comment: 'Volume up button'
      },
      volume_down: {
        key: 'VOLUME_DOWN',
        position: { x: 70, y: 225 },
        size: { width: 16, height: 16 },
        shape: 'circle',
        comment: 'Volume down button'
      },
      mute: {
        key: 'VOLUME_MUTE',
        position: { x: 70, y: 250 },
        size: { width: 16, height: 16 },
        shape: 'circle',
        comment: 'Mute button'
      }
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCloseModal}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>Android TV Remote Control</DialogTitle>
      <DialogContent sx={{ maxHeight: '600px', overflow: 'auto' }}>
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
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', maxHeight: '400px' }}>
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
              <Box sx={{ display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', flex: 1, minHeight: '300px' }}>
                  <Box sx={{ 
                    width: '100%', 
                    height: 300, 
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

                {/* Screenshot Button */}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleScreenshot}
                    fullWidth
                    sx={{ fontSize: '0.9rem', py: 1 }}
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
                      sx={{ flex: 1, fontSize: '0.9rem', py: 1 }}
                      size="small"
                    >
                      Close
                    </Button>
                    <Button 
                      variant="contained" 
                      color="error"
                      onClick={handleReleaseControl}
                      disabled={connectionLoading}
                      sx={{ flex: 1, fontSize: '0.9rem', py: 1 }}
                      size="small"
                    >
                      {connectionLoading ? <CircularProgress size={16} /> : 'Release Control'}
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Right Column: Remote Control */}
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                {/* Remote Control Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
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
                      sx={{ minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
                    >
                      {showOverlays ? 'Hide Overlays' : 'Show Overlays'}
                    </Button>
                    
                    {/* Scale controls */}
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                        Scale:
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => setRemoteScale(prev => Math.max(localRemoteConfig?.remote_info.min_scale || 0.5, prev - 0.1))}
                        disabled={remoteScale <= (localRemoteConfig?.remote_info.min_scale || 0.5)}
                        sx={{ minWidth: 20, width: 20, height: 20, p: 0, fontSize: '0.7rem' }}
                      >
                        -
                      </Button>
                      <Typography variant="caption" sx={{ minWidth: 30, textAlign: 'center', fontSize: '0.65rem' }}>
                        {Math.round(remoteScale * 100)}%
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => setRemoteScale(prev => Math.min(localRemoteConfig?.remote_info.max_scale || 2.0, prev + 0.1))}
                        disabled={remoteScale >= (localRemoteConfig?.remote_info.max_scale || 2.0)}
                        sx={{ minWidth: 20, width: 20, height: 20, p: 0, fontSize: '0.7rem' }}
                      >
                        +
                      </Button>
                    </Box>
                  </Box>
                </Box>

                {/* Remote Interface */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  overflow: 'hidden',
                  alignItems: 'flex-start',
                  flex: 1,
                  maxHeight: '400px'
                }}>
                  <RemoteInterface
                    remoteConfig={localRemoteConfig}
                    scale={remoteScale}
                    showOverlays={showOverlays}
                    onCommand={handleRemoteCommand}
                    fallbackImageUrl="/android-tv-remote.png"
                    fallbackName="Android TV Remote"
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
}; 