import { useState, useCallback, useEffect } from 'react';
import { AndroidTVSession, ConnectionForm, RemoteConfig } from '../../types/remote/types';
import { RemoteType, BaseConnectionConfig } from '../../types/remote/remoteTypes';
import { getRemoteConfig } from './remoteConfigs';
import { androidTVRemote, androidMobileRemote } from '../../../config/remote';

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

export function useRemoteConnection(remoteType: RemoteType) {
  const [session, setSession] = useState<AndroidTVSession>(initialSession);
  const [connectionForm, setConnectionForm] = useState<ConnectionForm>(initialConnectionForm);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null);
  const [androidScreenshot, setAndroidScreenshot] = useState<string | null>(null);

  // Get device configuration
  const deviceConfig = getRemoteConfig(remoteType);
  
  // Load the remote configuration from JSON based on remote type
  useEffect(() => {
    switch (remoteType) {
      case 'android-tv':
        setRemoteConfig(androidTVRemote as RemoteConfig);
        console.log('[@hook:useRemoteConnection] Loaded Android TV remote configuration from local JSON file');
        break;
      case 'android-mobile':
        setRemoteConfig(androidMobileRemote as RemoteConfig);
        console.log('[@hook:useRemoteConnection] Loaded Android Mobile remote configuration from local JSON file');
        break;
      case 'ir':
      case 'bluetooth':
        // These devices don't use the same remote config structure yet
        console.log(`[@hook:useRemoteConnection] Remote type ${remoteType} uses API-based configuration`);
        break;
      default:
        console.log(`[@hook:useRemoteConnection] Unknown remote type: ${remoteType}`);
    }
  }, [remoteType]);

  const fetchDefaultValues = useCallback(async () => {
    if (!deviceConfig) return;
    
    try {
      const response = await fetch(`http://localhost:5009${deviceConfig.apiEndpoints.defaults}`);
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
  }, [deviceConfig]);

  // Generic function to fetch remote config from backend (optional override)
  const fetchRemoteConfig = useCallback(async () => {
    if (!deviceConfig?.apiEndpoints.config) return;
    
    // We're now using the imported JSON config
    console.log(`[@hook:useRemoteConnection] Using local remote configuration for ${remoteType}`);
    
    // Only fetch from backend if needed for dynamic configurations
    try {
      const response = await fetch(`http://localhost:5009${deviceConfig.apiEndpoints.config}`);
      const result = await response.json();
      
      if (result.success && result.config) {
        // Only update if the backend has different config
        // This ensures we prioritize our local config but can be overridden by backend
        console.log(`[@hook:useRemoteConnection] Updated ${remoteType} config from backend`);
        setRemoteConfig(result.config);
      }
    } catch (error) {
      console.log(`[@hook:useRemoteConnection] Using default ${remoteType} config, backend not available:`, error);
    }
  }, [deviceConfig, remoteType]);

  const handleTakeControl = useCallback(async () => {
    if (!deviceConfig) return;
    
    setConnectionLoading(true);
    setConnectionError(null);

    try {
      console.log('[@hook:useRemoteConnection] Starting take control process with form:', {
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
        console.error('[@hook:useRemoteConnection]', errorMsg);
        setConnectionError(errorMsg);
        return;
      }

      // We don't need to fetch config since we're using the local one
      // Only fetch from backend for updating purposes
      await fetchRemoteConfig();

      console.log('[@hook:useRemoteConnection] Sending take-control request to backend...');
      const response = await fetch(`http://localhost:5009${deviceConfig.apiEndpoints.connect}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionForm),
      });

      const result = await response.json();
      console.log('[@hook:useRemoteConnection] Backend response:', result);

      if (result.success) {
        console.log(`[@hook:useRemoteConnection] Successfully connected to ${deviceConfig.name}`);
        setSession({
          connected: true,
          host_ip: connectionForm.host_ip,
          device_ip: connectionForm.device_ip
        });
        setConnectionError(null);
      } else {
        const errorMsg = result.error || `Failed to connect to ${deviceConfig.name} device`;
        console.error('[@hook:useRemoteConnection] Connection failed:', errorMsg);
        setConnectionError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Connection failed - network or server error';
      console.error('[@hook:useRemoteConnection] Exception during connection:', err);
      setConnectionError(errorMsg);
    } finally {
      setConnectionLoading(false);
    }
  }, [connectionForm, fetchRemoteConfig, deviceConfig]);

  const handleReleaseControl = useCallback(async () => {
    if (!deviceConfig) return;
    
    setConnectionLoading(true);

    try {
      await fetch(`http://localhost:5009${deviceConfig.apiEndpoints.disconnect}`, {
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
  }, [deviceConfig]);

  const handleScreenshot = useCallback(async () => {
    if (!deviceConfig?.apiEndpoints.screenshot) {
      throw new Error('Screenshot not supported for this device type');
    }
    
    try {
      console.log('[@hook:useRemoteConnection] Taking screenshot...');
      const response = await fetch(`http://localhost:5009${deviceConfig.apiEndpoints.screenshot}`, {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        setAndroidScreenshot(result.screenshot);
        console.log('[@hook:useRemoteConnection] Screenshot captured successfully');
      } else {
        const errorMessage = result.error || 'Screenshot failed';
        console.error('[@hook:useRemoteConnection] Screenshot failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('[@hook:useRemoteConnection] Screenshot error:', err);
      throw err; // Re-throw the error so the modal can catch it
    }
  }, [deviceConfig]);

  const handleRemoteCommand = useCallback(async (command: string, params: any = {}) => {
    if (!deviceConfig) return;
    
    try {
      console.log(`[@hook:useRemoteConnection] Sending remote command: ${command}`, params);
      
      // Format the command for the backend API
      // The backend expects: { command: 'press_key', params: { key: 'POWER' } }
      const requestBody = {
        command: 'press_key',
        params: { key: command }
      };
      
      const response = await fetch(`http://localhost:5009${deviceConfig.apiEndpoints.command}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      if (result.success) {
        console.log(`[@hook:useRemoteConnection] Successfully sent command: ${command}`);
      } else {
        console.error(`[@hook:useRemoteConnection] Remote command failed:`, result.error);
      }
    } catch (err: any) {
      console.error(`[@hook:useRemoteConnection] Remote command error:`, err);
    }
  }, [deviceConfig]);

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
    deviceConfig,
  };
} 