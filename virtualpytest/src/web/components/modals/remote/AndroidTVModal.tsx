import React from 'react';
import { RemoteModal } from './RemoteModal';
import { BaseConnectionConfig } from '../../../types/remote/remoteTypes';

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
    <RemoteModal
      remoteType="android-tv"
      open={open}
      onClose={onClose}
      connectionConfig={connectionConfig as BaseConnectionConfig}
    />
  );
}; 