import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, Android } from '@mui/icons-material';
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
      maxWidth={false}
      sx={{
        '& .MuiDialog-paper': {
          width: '900px', // Increased width by more than 200px (from ~600px to 900px)
          height: '650px', // Increased height by 50px (from ~600px to 650px)
          maxWidth: '90vw',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Android color="primary" />
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
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 0 }}>
        {/* Show error message if connection fails */}
        {connectionError && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1, mx: 2, mt: 2 }}>
            <Typography color="error">{connectionError}</Typography>
          </Box>
        )}

        {/* Full height container for remote panel */}
        <Box sx={{ flex: 1, display: 'flex' }}>
          <AndroidTVRemotePanel
            connectionConfig={{
              host_ip: connectionForm.host_ip,
              host_port: connectionForm.host_port,
              host_username: connectionForm.host_username,
              host_password: connectionForm.host_password,
              device_ip: connectionForm.device_ip,
              device_port: connectionForm.device_port,
            }}
            compact={false}
            showScreenshot={true}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}; 