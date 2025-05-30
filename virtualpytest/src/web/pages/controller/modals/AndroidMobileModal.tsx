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
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useAndroidMobileConnection } from '../hooks/useAndroidMobileConnection';
import { AndroidMobileOverlay } from '../components/AndroidMobileOverlay';
import { AndroidMobileRemotePanel } from '../../../src/components/remote/AndroidMobileRemotePanel';

interface AndroidMobileModalProps {
  open: boolean;
  onClose: () => void;
}

export function AndroidMobileModal({ open, onClose }: AndroidMobileModalProps) {
  // Use the Android Mobile connection hook to get connection form
  const {
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    session,
    handleConnect,
    fetchDefaultValues,
  } = useAndroidMobileConnection();

  // Load default values when modal opens
  useEffect(() => {
    if (open) {
      fetchDefaultValues();
    }
  }, [open, fetchDefaultValues]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="div">
          Android Mobile Remote Control
        </Typography>
        
        {/* Close button - always visible */}
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Left Column: Connection Setup */}
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
              /* Connection established - show screenshot area */
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                <Typography variant="body2" color="textSecondary">
                  Device Connected - Use remote controls on the right
                </Typography>
              </Box>
            )}
          </Grid>

          {/* Right Column: Remote Control Panel */}
          <Grid item xs={6}>
            <AndroidMobileRemotePanel
              connectionConfig={session.connected ? {
                host_ip: connectionForm.host_ip,
                host_port: connectionForm.host_port,
                host_username: connectionForm.host_username,
                host_password: connectionForm.host_password,
                device_ip: connectionForm.device_ip,
                device_port: connectionForm.device_port,
              } : undefined}
              autoConnect={false} // Manual connect via left panel
              compact={false} // Full modal mode
              showScreenshot={true} // Show screenshot in modal
              sx={{ height: '500px' }}
            />
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
} 