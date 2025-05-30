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
import { useAndroidTVConnection } from '../../../hooks/remote/useAndroidTVConnection';
import { AndroidTVRemotePanel } from '../../remote/AndroidTVRemotePanel';

interface AndroidTVModalProps {
  open: boolean;
  onClose: () => void;
}

export const AndroidTVModal: React.FC<AndroidTVModalProps> = ({ open, onClose }) => {
  // Use the Android TV connection hook to get connection form
  const {
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    session,
    handleTakeControl,
    handleReleaseControl,
    fetchDefaultValues,
  } = useAndroidTVConnection();

  // Load default values when modal opens
  useEffect(() => {
    if (open) {
      fetchDefaultValues();
    }
  }, [open, fetchDefaultValues]);

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
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="div">
          Android TV Remote Control
        </Typography>
        
        {/* Close button - always visible */}
        <IconButton
          onClick={handleCloseModal}
          size="small"
          sx={{ ml: 1 }}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
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
          /* Connected - Show Remote Control Panel */
          <AndroidTVRemotePanel
            connectionConfig={{
              host_ip: connectionForm.host_ip,
              host_port: connectionForm.host_port,
              host_username: connectionForm.host_username,
              host_password: connectionForm.host_password,
              device_ip: connectionForm.device_ip,
              device_port: connectionForm.device_port,
            }}
            autoConnect={false} // Manual connect via connection form
            compact={false} // Full modal mode
            showScreenshot={true} // Show screenshot in modal
            sx={{ height: '500px' }}
          />
        )}
      </DialogContent>
      
      {/* Dialog Actions - Always visible */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          variant="outlined"
          onClick={handleCloseModal}
          sx={{ minWidth: 100 }}
        >
          Close
        </Button>
        {session.connected && (
          <Button 
            variant="contained" 
            color="error"
            onClick={handleReleaseControl}
            disabled={connectionLoading}
            sx={{ minWidth: 120 }}
          >
            {connectionLoading ? <CircularProgress size={16} /> : 'Release Control'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}; 