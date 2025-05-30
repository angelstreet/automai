import React from 'react';
import { RemoteModal } from './RemoteModal';

interface BluetoothRemoteModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional pre-configured connection parameters */
  connectionConfig?: {
    device_address: string;
    device_name: string;
    pairing_pin: string;
  };
}

export const BluetoothRemoteModal: React.FC<BluetoothRemoteModalProps> = ({ 
  open, 
  onClose,
  connectionConfig 
}) => {
  return (
    <RemoteModal
      remoteType="bluetooth"
      open={open}
      onClose={onClose}
      connectionConfig={connectionConfig as any} // Bluetooth has different config structure
    />
  );
}; 