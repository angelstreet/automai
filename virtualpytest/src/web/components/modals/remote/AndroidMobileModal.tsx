import React from 'react';
import { RemoteModal } from './RemoteModal';
import { BaseConnectionConfig } from '../../../types/remote/remoteTypes';

interface AndroidMobileModalProps {
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

export const AndroidMobileModal: React.FC<AndroidMobileModalProps> = ({ 
  open, 
  onClose,
  connectionConfig 
}) => {
  return (
    <RemoteModal
      remoteType="android-mobile"
      open={open}
      onClose={onClose}
      connectionConfig={connectionConfig as BaseConnectionConfig}
    />
  );
}; 