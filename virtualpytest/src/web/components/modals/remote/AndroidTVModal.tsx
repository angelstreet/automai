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
    connectionLoading,
    connectionError,
    session,
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
      <DialogContent>
        {/* Show error message if connection fails */}
        {connectionError && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography color="error">{connectionError}</Typography>
          </Box>
        )}

        {/* Always show Remote Control Panel with autoConnect=true */}
        <AndroidTVRemotePanel
          connectionConfig={{
            host_ip: connectionForm.host_ip,
            host_port: connectionForm.host_port,
            host_username: connectionForm.host_username,
            host_password: connectionForm.host_password,
            device_ip: connectionForm.device_ip,
            device_port: connectionForm.device_port,
          }}
          autoConnect={true} // Auto connect when config is available
          compact={false} // Full modal mode
          showScreenshot={true} // Show screenshot in modal
          sx={{ height: '500px' }}
        />
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