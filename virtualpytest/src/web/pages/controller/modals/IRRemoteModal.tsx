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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useIRRemoteConnection } from '../hooks/useIRRemoteConnection';
import { IRRemotePanel } from '../../../src/components/remote/IRRemotePanel';

interface IRRemoteModalProps {
  open: boolean;
  onClose: () => void;
}

export const IRRemoteModal: React.FC<IRRemoteModalProps> = ({ open, onClose }) => {
  // Use the IR Remote connection hook to get connection form
  const {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    handleConnect,
    handleDisconnect,
  } = useIRRemoteConnection();

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
              IR Remote Control
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
              Configure IR transmitter settings to control your TV or set-top box.
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
                  label="IR Device Path"
                  value={connectionForm.device_path}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, device_path: e.target.value }))}
                  placeholder="/dev/lirc0"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Protocol</InputLabel>
                  <Select
                    value={connectionForm.protocol}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, protocol: e.target.value }))}
                  >
                    <MenuItem value="NEC">NEC</MenuItem>
                    <MenuItem value="RC5">RC5</MenuItem>
                    <MenuItem value="RC6">RC6</MenuItem>
                    <MenuItem value="SONY">SONY</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Frequency (Hz)"
                  value={connectionForm.frequency}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, frequency: e.target.value }))}
                  placeholder="38000"
                />
              </Grid>
            </Grid>
          </Box>
        ) : (
          /* Connected - Show Remote Control Panel */
          <IRRemotePanel
            connectionConfig={{
              device_path: connectionForm.device_path,
              protocol: connectionForm.protocol,
              frequency: connectionForm.frequency,
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
            disabled={connectionLoading || !connectionForm.device_path}
          >
            {connectionLoading ? <CircularProgress size={20} /> : 'Connect'}
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