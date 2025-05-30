import { useState, useCallback } from 'react';
import { AndroidTVSession, ConnectionForm, RemoteConfig } from '../../types/remote/types';

const initialConnectionForm: ConnectionForm = {
  host_ip: '',
  host_username: '',
  host_password: '',
  host_port: '22',
  device_ip: '',
  device_port: '5555'
};

const initialSession: AndroidTVSession = {
  connected: false,
  host_ip: '',
  device_ip: ''
};

export function useAndroidTVConnection() {
  const [session, setSession] = useState<AndroidTVSession>(initialSession);
  const [connectionForm, setConnectionForm] = useState<ConnectionForm>(initialConnectionForm);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null);
  const [androidScreenshot, setAndroidScreenshot] = useState<string | null>(null);

  const fetchDefaultValues = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-tv/defaults');
      const result = await response.json();
      
      if (result.success && result.defaults) {
        setConnectionForm(prev => ({
          ...prev,
          ...result.defaults
        }));
      }
    } catch (error) {
      console.log('Could not load default values:', error);
    }
  }, []);

  const fetchAndroidTVConfig = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-tv/config');
      const result = await response.json();
      
      if (result.success && result.config) {
        setRemoteConfig(result.config);
      }
    } catch (error) {
      console.log('Could not load Android TV config:', error);
    }
  }, []);

  const handleTakeControl = useCallback(async () => {
    setConnectionLoading(true);
    setConnectionError(null);

    try {
      // Fetch config first
      await fetchAndroidTVConfig();

      const response = await fetch('http://localhost:5009/api/virtualpytest/android-tv/take-control', {
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
          host_ip: connectionForm.host_ip,
          device_ip: connectionForm.device_ip
        });
      } else {
        setConnectionError(result.error || 'Failed to connect');
      }
    } catch (err: any) {
      setConnectionError(err.message || 'Connection failed');
    } finally {
      setConnectionLoading(false);
    }
  }, [connectionForm, fetchAndroidTVConfig]);

  const handleReleaseControl = useCallback(async () => {
    setConnectionLoading(true);

    try {
      await fetch('http://localhost:5009/api/virtualpytest/android-tv/release-control', {
        method: 'POST',
      });
      
      setSession(initialSession);
      setConnectionError(null);
      setAndroidScreenshot(null);
    } catch (err: any) {
      // Still reset session even if release fails
      setSession(initialSession);
    } finally {
      setConnectionLoading(false);
    }
  }, []);

  const handleScreenshot = useCallback(async () => {
    try {
      console.log('[@hook:useAndroidTVConnection] Taking screenshot...');
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-tv/screenshot', {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        setAndroidScreenshot(result.screenshot);
        console.log('[@hook:useAndroidTVConnection] Screenshot captured successfully');
      } else {
        const errorMessage = result.error || 'Screenshot failed';
        console.error('[@hook:useAndroidTVConnection] Screenshot failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('[@hook:useAndroidTVConnection] Screenshot error:', err);
      throw err; // Re-throw the error so the modal can catch it
    }
  }, []);

  const handleRemoteCommand = useCallback(async (command: string, params: any = {}) => {
    try {
      console.log(`[@hook:useAndroidTVConnection] Sending remote command: ${command}`, params);
      
      // Format the command for the backend API
      // The backend expects: { command: 'press_key', params: { key: 'POWER' } }
      const requestBody = {
        command: 'press_key',
        params: { key: command }
      };
      
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-tv/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      if (result.success) {
        console.log(`[@hook:useAndroidTVConnection] Successfully sent command: ${command}`);
      } else {
        console.error(`[@hook:useAndroidTVConnection] Remote command failed:`, result.error);
      }
    } catch (err: any) {
      console.error(`[@hook:useAndroidTVConnection] Remote command error:`, err);
    }
  }, []);

  return {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    remoteConfig,
    androidScreenshot,
    handleTakeControl,
    handleReleaseControl,
    handleScreenshot,
    handleRemoteCommand,
    fetchDefaultValues,
  };
} 