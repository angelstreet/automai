import { useState, useCallback, useEffect } from 'react';
import { AndroidTVSession, ConnectionForm, RemoteConfig } from '../../types/remote/types';
import { androidTVRemote } from '../../../config/remote';

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
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(androidTVRemote as RemoteConfig);
  const [androidScreenshot, setAndroidScreenshot] = useState<string | null>(null);

  // Load the remote configuration from JSON
  useEffect(() => {
    // We already imported the config, but log for clarity
    console.log('[@hook:useAndroidTVConnection] Loaded remote configuration from local JSON file');
  }, []);

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

  // Kept for backward compatibility, now it just uses the local JSON
  const fetchAndroidTVConfig = useCallback(async () => {
    // We're now using the imported JSON config
    console.log('[@hook:useAndroidTVConnection] Using local remote configuration');
    
    // Only fetch from backend if needed for dynamic configurations
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-tv/config');
      const result = await response.json();
      
      if (result.success && result.config) {
        // Only update if the backend has different config
        // This ensures we prioritize our local config but can be overridden by backend
        console.log('[@hook:useAndroidTVConnection] Updated config from backend');
        setRemoteConfig(result.config);
      }
    } catch (error) {
      console.log('[@hook:useAndroidTVConnection] Using default config, backend not available:', error);
    }
  }, []);

  const handleTakeControl = useCallback(async () => {
    setConnectionLoading(true);
    setConnectionError(null);

    try {
      console.log('[@hook:useAndroidTVConnection] Starting take control process with form:', {
        host_ip: connectionForm.host_ip,
        device_ip: connectionForm.device_ip,
        host_username: connectionForm.host_username,
        host_port: connectionForm.host_port,
        device_port: connectionForm.device_port,
        // Don't log password for security
      });

      // Validate required fields
      const requiredFields = ['host_ip', 'host_username', 'host_password', 'device_ip'];
      const missingFields = requiredFields.filter(field => !connectionForm[field]);
      
      if (missingFields.length > 0) {
        const errorMsg = `Missing required connection fields: ${missingFields.join(', ')}`;
        console.error('[@hook:useAndroidTVConnection]', errorMsg);
        setConnectionError(errorMsg);
        return;
      }

      // We don't need to fetch config since we're using the local one
      // Only fetch from backend for updating purposes
      await fetchAndroidTVConfig();

      console.log('[@hook:useAndroidTVConnection] Sending take-control request to backend...');
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-tv/take-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionForm),
      });

      const result = await response.json();
      console.log('[@hook:useAndroidTVConnection] Backend response:', result);

      if (result.success) {
        console.log('[@hook:useAndroidTVConnection] Successfully connected to Android TV');
        setSession({
          connected: true,
          host_ip: connectionForm.host_ip,
          device_ip: connectionForm.device_ip
        });
        setConnectionError(null);
      } else {
        const errorMsg = result.error || 'Failed to connect to Android TV device';
        console.error('[@hook:useAndroidTVConnection] Connection failed:', errorMsg);
        setConnectionError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Connection failed - network or server error';
      console.error('[@hook:useAndroidTVConnection] Exception during connection:', err);
      setConnectionError(errorMsg);
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