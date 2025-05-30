import { useState, useCallback } from 'react';
import { BluetoothRemoteSession, BluetoothConnectionForm, RemoteConfig } from '../../types/remote/types';

const initialConnectionForm: BluetoothConnectionForm = {
  device_address: '00:00:00:00:00:00',
  device_name: 'TV Remote',
  pairing_pin: '0000'
};

const initialSession: BluetoothRemoteSession = {
  connected: false,
  device_address: '00:00:00:00:00:00',
  device_name: 'Unknown Device'
};

export function useBluetoothRemoteConnection() {
  const [session, setSession] = useState<BluetoothRemoteSession>(initialSession);
  const [connectionForm, setConnectionForm] = useState<BluetoothConnectionForm>(initialConnectionForm);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null);

  const fetchBluetoothConfig = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/bluetooth-remote/config');
      const result = await response.json();
      
      if (result.success && result.config) {
        setRemoteConfig(result.config);
      }
    } catch (error) {
      console.log('Could not load Bluetooth config:', error);
    }
  }, []);

  const handleConnect = useCallback(async () => {
    setConnectionLoading(true);
    setConnectionError(null);

    try {
      // Fetch config first
      await fetchBluetoothConfig();

      const response = await fetch('http://localhost:5009/api/virtualpytest/bluetooth-remote/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionForm),
      });

      const result = await response.json();

      if (result.success) {
        setSession({
          connected: true,
          device_address: connectionForm.device_address,
          device_name: connectionForm.device_name
        });
      } else {
        setConnectionError(result.error || 'Failed to connect to Bluetooth device');
      }
    } catch (err: any) {
      setConnectionError(err.message || 'Bluetooth connection failed');
    } finally {
      setConnectionLoading(false);
    }
  }, [connectionForm, fetchBluetoothConfig]);

  const handleDisconnect = useCallback(async () => {
    setConnectionLoading(true);

    try {
      await fetch('http://localhost:5009/api/virtualpytest/bluetooth-remote/disconnect', {
        method: 'POST',
      });
      
      setSession(initialSession);
      setConnectionError(null);
    } catch (err: any) {
      // Still reset session even if disconnect fails
      setSession(initialSession);
    } finally {
      setConnectionLoading(false);
    }
  }, []);

  const handleCommand = useCallback(async (command: string, params: any = {}) => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/bluetooth-remote/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, params }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('Bluetooth command failed:', result.error);
      }
    } catch (err: any) {
      console.error('Bluetooth command error:', err);
    }
  }, []);

  return {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    remoteConfig,
    handleConnect,
    handleDisconnect,
    handleCommand,
    fetchBluetoothConfig,
  };
} 