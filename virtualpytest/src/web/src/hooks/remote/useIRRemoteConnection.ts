import { useState, useCallback } from 'react';
import { IRRemoteSession, IRConnectionForm, RemoteConfig } from '../../types/remote/types';

const initialConnectionForm: IRConnectionForm = {
  device_path: '/dev/lirc0',
  protocol: 'NEC',
  frequency: '38000'
};

const initialSession: IRRemoteSession = {
  connected: false,
  device_path: '/dev/lirc0',
  protocol: 'NEC'
};

export function useIRRemoteConnection() {
  const [session, setSession] = useState<IRRemoteSession>(initialSession);
  const [connectionForm, setConnectionForm] = useState<IRConnectionForm>(initialConnectionForm);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null);

  const fetchIrRemoteConfig = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/ir-remote/config');
      const result = await response.json();
      
      if (result.success && result.config) {
        setRemoteConfig(result.config);
      }
    } catch (error) {
      console.log('Could not load IR remote config:', error);
    }
  }, []);

  const handleConnect = useCallback(async () => {
    setConnectionLoading(true);
    setConnectionError(null);

    try {
      // Fetch config first
      await fetchIrRemoteConfig();

      const response = await fetch('http://localhost:5009/api/virtualpytest/ir-remote/connect', {
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
          device_path: connectionForm.device_path,
          protocol: connectionForm.protocol
        });
      } else {
        setConnectionError(result.error || 'Failed to connect to IR device');
      }
    } catch (err: any) {
      setConnectionError(err.message || 'IR connection failed');
    } finally {
      setConnectionLoading(false);
    }
  }, [connectionForm, fetchIrRemoteConfig]);

  const handleDisconnect = useCallback(async () => {
    setConnectionLoading(true);

    try {
      await fetch('http://localhost:5009/api/virtualpytest/ir-remote/disconnect', {
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
      const response = await fetch('http://localhost:5009/api/virtualpytest/ir-remote/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, params }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('IR command failed:', result.error);
      }
    } catch (err: any) {
      console.error('IR command error:', err);
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
    fetchIrRemoteConfig,
  };
} 