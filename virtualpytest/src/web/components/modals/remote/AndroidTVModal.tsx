import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, Android } from '@mui/icons-material';
import { AndroidTVRemotePanel } from '../../remote/AndroidTVRemotePanel';

interface AndroidTVModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional pre-configured connection parameters */
  connectionConfig?: {
    host_ip: string;
    host_port?: string;
    host_username: string;
    host_password: string;
    device_ip: string;
    device_port?: string;
  };
}

export const AndroidTVModal: React.FC<AndroidTVModalProps> = ({ 
  open, 
  onClose,
  connectionConfig 
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth={false}
      sx={{
        '& .MuiDialog-paper': {
          width: '1200px',
          height: '700px',
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
        
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ ml: 1 }}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 0 }}>
        <AndroidTVRemotePanel
          connectionConfig={connectionConfig}
          showScreenshot={true}
        />
      </DialogContent>
    </Dialog>
  );
}; 