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
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useBluetoothRemoteConnection } from '../../../hooks/remote/useBluetoothRemoteConnection';
import { BluetoothRemotePanel } from '../../remote/BluetoothRemotePanel';

interface BluetoothRemoteModalProps {
  open: boolean;
  onClose: () => void;
}

export const BluetoothRemoteModal: React.FC<BluetoothRemoteModalProps> = ({ open, onClose }) => {
  // Use the Bluetooth Remote connection hook to get connection form
  const {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    handleConnect,
    handleDisconnect,
  } = useBluetoothRemoteConnection();

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
          
          {/* Right side: Close button */}
          <IconButton
            onClick={handleCloseModal}
            size="small"
            sx={{ ml: 1 }}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pb: 2, overflow: 'hidden', maxHeight: 'none' }}>
        {!session.connected ? (
          /* Connection Form */
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
          /* Connected - Show Remote Control Panel */
          <BluetoothRemotePanel
            connectionConfig={{
              device_address: connectionForm.device_address,
              device_name: connectionForm.device_name,
              pairing_pin: connectionForm.pairing_pin,
            }}
            autoConnect={false} // Manual connect via connection form
            compact={false} // Full modal mode
            sx={{ height: '500px' }}
          />
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