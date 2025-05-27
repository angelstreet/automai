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

  return (
    <Dialog 
      open={open} 
      onClose={handleCloseModal}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ minHeight: 40 }}>
          {/* Left side: Title and status */}
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6" component="span">
              Android TV Remote
            </Typography>
            {session.connected && (
              <Chip 
                label="Connected" 
                color="success" 
                size="small"
              />
            )}
          </Box>
          
          {/* Right side: Controls */}
          {session.connected && (
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
          )}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pb: 2, overflow: 'hidden', maxHeight: 'none' }}>
        {!session.connected ? (
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter SSH and ADB connection details to take control of the Android TV device.
            </Typography>
            
            {connectionError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {connectionError}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SSH Host IP"
                  value={connectionForm.host_ip}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, host_ip: e.target.value }))}
                  placeholder="192.168.1.100"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SSH Port"
                  value={connectionForm.host_port}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, host_port: e.target.value }))}
                  placeholder="22"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SSH Username"
                  value={connectionForm.host_username}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, host_username: e.target.value }))}
                  placeholder="root"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SSH Password"
                  type="password"
                  value={connectionForm.host_password}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, host_password: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Android Device IP"
                  value={connectionForm.device_ip}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, device_ip: e.target.value }))}
                  placeholder="192.168.1.101"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ADB Port"
                  value={connectionForm.device_port}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, device_port: e.target.value }))}
                  placeholder="5555"
                />
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Box sx={{ pt: 2, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
            <RemoteInterface
              remoteConfig={remoteConfig}
              scale={remoteScale}
              showOverlays={showOverlays}
              onCommand={handleRemoteCommand}
              fallbackImageUrl="/android-tv-remote.png"
              fallbackName="Android TV Remote"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseModal}>
          Close
        </Button>
        {!session.connected ? (
          <Button 
            variant="contained" 
            onClick={handleTakeControl}
            disabled={connectionLoading || !connectionForm.host_ip || !connectionForm.host_username || !connectionForm.host_password || !connectionForm.device_ip}
          >
            {connectionLoading ? <CircularProgress size={20} /> : 'Take Control'}
          </Button>
        ) : (
          <Button 
            variant="contained" 
            color="error"
            onClick={handleReleaseControl}
            disabled={connectionLoading}
          >
            {connectionLoading ? <CircularProgress size={20} /> : 'Release Control'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}; 