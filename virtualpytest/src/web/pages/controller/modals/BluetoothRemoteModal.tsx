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

import { useBluetoothRemoteConnection } from '../hooks/useBluetoothRemoteConnection';
import { RemoteInterface } from '../components/RemoteInterface';

interface BluetoothRemoteModalProps {
  open: boolean;
  onClose: () => void;
}

export const BluetoothRemoteModal: React.FC<BluetoothRemoteModalProps> = ({ open, onClose }) => {
  const {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    remoteConfig,
    handleConnect,
    handleDisconnect,
    handleCommand,
  } = useBluetoothRemoteConnection();

  const [showOverlays, setShowOverlays] = useState(false);
  const [remoteScale, setRemoteScale] = useState(1.2);

  // Update scale when config loads
  useEffect(() => {
    if (remoteConfig) {
      setRemoteScale(remoteConfig.remote_info.default_scale);
    }
  }, [remoteConfig]);

  const handleCloseModal = () => {
    if (session.connected) {
      handleDisconnect();
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
            <Typography variant="h6" component="span" sx={{ fontSize: '1.1rem' }}>
              Bluetooth Remote
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
              Pair with a Bluetooth device to control it remotely using HID protocol.
            </Typography>
            
            {connectionError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {connectionError}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Device Address (MAC)"
                  value={connectionForm.device_address}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, device_address: e.target.value }))}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Device Name"
                  value={connectionForm.device_name}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, device_name: e.target.value }))}
                  placeholder="Smart TV"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Pairing PIN"
                  value={connectionForm.pairing_pin}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, pairing_pin: e.target.value }))}
                  placeholder="0000"
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
              onCommand={handleCommand}
              fallbackImageUrl="/suncherry_remote.png"
              fallbackName="Sunrise Remote"
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
            onClick={handleConnect}
            disabled={connectionLoading || !connectionForm.device_address}
          >
            {connectionLoading ? <CircularProgress size={20} /> : 'Pair & Connect'}
          </Button>
        ) : (
          <Button 
            variant="contained" 
            color="error"
            onClick={handleDisconnect}
            disabled={connectionLoading}
          >
            {connectionLoading ? <CircularProgress size={20} /> : 'Disconnect'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}; 