import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, Android, Bluetooth, Router, PhoneAndroid } from '@mui/icons-material';
import { RemotePanel } from '../../remote/RemotePanel';
import { RemoteType, BaseConnectionConfig } from '../../../types/remote/remoteTypes';
import { getRemoteConfig } from '../../../hooks/remote/remoteConfigs';

interface RemoteModalProps {
  /** The type of remote device */
  remoteType: RemoteType;
  open: boolean;
  onClose: () => void;
  /** Optional pre-configured connection parameters */
  connectionConfig?: BaseConnectionConfig;
}

// Icon mapping for different remote types
const REMOTE_ICONS = {
  'android-tv': Android,
  'android-mobile': PhoneAndroid,
  'ir': Router,
  'bluetooth': Bluetooth,
} as const;

export const RemoteModal: React.FC<RemoteModalProps> = ({ 
  remoteType,
  open, 
  onClose,
  connectionConfig 
}) => {
  const deviceConfig = getRemoteConfig(remoteType);
  const IconComponent = REMOTE_ICONS[remoteType] || Android;
  
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
          <IconComponent color="primary" />
          {deviceConfig?.name || remoteType} Remote Control
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
        <RemotePanel
          remoteType={remoteType}
          connectionConfig={connectionConfig}
          showScreenshot={true}
        />
      </DialogContent>
    </Dialog>
  );
}; 