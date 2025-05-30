import React from 'react';
import { RemoteModal } from './RemoteModal';

interface IRRemoteModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional pre-configured connection parameters */
  connectionConfig?: {
    device_path: string;
    protocol: string;
    frequency: string;
  };
}

export const IRRemoteModal: React.FC<IRRemoteModalProps> = ({ 
  open, 
  onClose,
  connectionConfig 
}) => {
  return (
    <RemoteModal
      remoteType="ir"
      open={open}
      onClose={onClose}
      connectionConfig={connectionConfig as any} // IR has different config structure
    />
  );
}; 