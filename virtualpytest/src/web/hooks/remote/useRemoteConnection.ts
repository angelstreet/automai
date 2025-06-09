import { useState, useCallback, useEffect } from 'react';
import { AndroidTVSession, ConnectionForm, RemoteConfig, AndroidElement, AndroidApp } from '../../types/remote/types';
import { RemoteType, BaseConnectionConfig } from '../../types/remote/remoteTypes';
import { getRemoteConfig } from './remoteConfigs';
import { androidTVRemote, androidMobileRemote } from '../../../config/remote';
import { useRegistration } from '../../contexts/RegistrationContext';

// Simplified connection form - no SSH fields needed with abstract controller
const initialConnectionForm: ConnectionForm = {
  device_ip: '',
  device_port: '5555'
};

// Simplified session - no SSH fields needed
const initialSession: AndroidTVSession = {
  connected: false,
  device_ip: ''
};

interface RemoteState {
  isLoading: boolean;
  error: string | null;
}

const initialState: RemoteState = {
  isLoading: false,
  error: null,
};

export function useRemoteConnection(remoteType: RemoteType) {
  const { buildServerUrl, buildHostUrl, selectedHost } = useRegistration();
  
  // Original interface state
  const [session, setSession] = useState<AndroidTVSession>(initialSession);
  const [connectionForm, setConnectionForm] = useState<ConnectionForm>(initialConnectionForm);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null);
  const [androidScreenshot, setAndroidScreenshot] = useState<string | null>(null);

  // Android Mobile specific state
  const [androidElements, setAndroidElements] = useState<AndroidElement[]>([]);
  const [androidApps, setAndroidApps] = useState<AndroidApp[]>([]);

  // Simple state management for abstract controller
  const [remoteState, setRemoteState] = useState<RemoteState>(initialState);

  // Get device configuration
  const deviceConfig = getRemoteConfig(remoteType);
  
  // Debug logging for device configuration
  useEffect(() => {
    console.log(`[@hook:useRemoteConnection] Device config for ${remoteType}:`, deviceConfig);
    console.log(`[@hook:useRemoteConnection] Selected host:`, selectedHost);
    if (!deviceConfig) {
      console.error(`[@hook:useRemoteConnection] No device configuration found for remote type: ${remoteType}`);
    } else {
      console.log(`[@hook:useRemoteConnection] Device config endpoints:`, deviceConfig.serverEndpoints);
    }
  }, [remoteType, deviceConfig, selectedHost]);

  // Load the remote configuration from JSON based on remote type
  useEffect(() => {
    switch (remoteType) {
      case 'android-tv':
        setRemoteConfig(androidTVRemote as RemoteConfig);
        console.log('[@hook:useRemoteConnection] Loaded Android TV remote configuration from local JSON file');
        break;
      case 'android-mobile':
        console.log('[@hook:useRemoteConnection] androidMobileRemote import:', androidMobileRemote);
        setRemoteConfig(androidMobileRemote as RemoteConfig);
        console.log('[@hook:useRemoteConnection] Loaded Android Mobile remote configuration from local JSON file');
        console.log('[@hook:useRemoteConnection] Android Mobile config structure:', {
          name: androidMobileRemote?.remote_info?.name,
          type: androidMobileRemote?.remote_info?.type,
          buttonCount: Object.keys(androidMobileRemote?.button_layout || {}).length
        });
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
    if (!deviceConfig?.serverEndpoints?.defaults) return;
    
    try {
      const response = await fetch(`http://localhost:5009${deviceConfig.serverEndpoints.defaults}`);
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
    if (!deviceConfig?.serverEndpoints?.config) return;
    
    // We're now using the imported JSON config
    console.log(`[@hook:useRemoteConnection] Using local remote configuration for ${remoteType}`);
    
    // Only fetch from backend if needed for dynamic configurations
    try {
      const response = await fetch(`http://localhost:5009${deviceConfig.serverEndpoints.config}`);
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
      console.log('[@hook:useRemoteConnection] Starting take control process with form:', connectionForm);

      // Simplified validation - only device_ip needed (if any)
      if (connectionForm.device_ip && !connectionForm.device_ip.trim()) {
        const errorMsg = 'Device IP is required';
        console.error('[@hook:useRemoteConnection]', errorMsg);
        setConnectionError(errorMsg);
        return;
      }

      // We don't need to fetch config since we're using the local one
      // Only fetch from backend for updating purposes
      await fetchRemoteConfig();

      console.log('[@hook:useRemoteConnection] Sending take-control request to backend...');
      
      // Use abstract controller endpoint
      const endpoint = deviceConfig.serverEndpoints.connect;
      if (!endpoint) {
        throw new Error('No connection endpoint available');
      }

      const response = await fetch(`http://localhost:5009${endpoint}`, {
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
          device_ip: connectionForm.device_ip
        });
        setConnectionError(null);

        // Also show remote via abstract controller
        await showRemote();
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
    setConnectionError(null); // Clear any connection errors

    try {
      console.log('[@hook:useRemoteConnection] Releasing control...');
      
      // Hide remote via abstract controller first
      await hideRemote();
      
      // Use abstract controller endpoint
      const endpoint = deviceConfig.serverEndpoints.disconnect;
      if (endpoint) {
        await fetch(`http://localhost:5009${endpoint}`, {
          method: 'POST',
        });
      }
      
      console.log('[@hook:useRemoteConnection] Control released successfully');
    } catch (err: any) {
      console.error('[@hook:useRemoteConnection] Release control error:', err);
      // Continue with reset even if release fails
    } finally {
      // Always reset session state and clear data (even if backend call fails)
      setSession(initialSession); // This sets connected: false
      setAndroidScreenshot(null);
      setAndroidElements([]);
      setAndroidApps([]);
      setConnectionLoading(false);
      console.log('[@hook:useRemoteConnection] Session state reset, connect button should be re-enabled');
    }
  }, [deviceConfig]);

  const handleScreenshot = useCallback(async () => {
    const endpoint = deviceConfig?.serverEndpoints.screenshot;
    if (!endpoint) {
      throw new Error('Screenshot not supported for this device type');
    }
    
    try {
      console.log('[@hook:useRemoteConnection] Taking screenshot...');
      const response = await fetch(`http://localhost:5009${endpoint}`, {
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

  // Android Mobile specific: Screenshot + UI dump
  const handleScreenshotAndDumpUI = useCallback(async () => {
    const endpoint = deviceConfig?.serverEndpoints.dumpUI;
    if (!endpoint) {
      throw new Error('UI dump not supported for this device type');
    }
    
    if (!selectedHost) {
      throw new Error('No host selected for UI dump');
    }
    
    try {
      console.log('[@hook:useRemoteConnection] Taking screenshot and dumping UI elements...');
      
      // Use host URL directly instead of hardcoded localhost
      const hostUrl = buildHostUrl(selectedHost.id, endpoint);
      const response = await fetch(hostUrl, {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        if (result.screenshot) {
          setAndroidScreenshot(result.screenshot);
        }
        if (result.elements) {
          setAndroidElements(result.elements);
          console.log(`[@hook:useRemoteConnection] Found ${result.elements.length} UI elements`);
        }
        console.log('[@hook:useRemoteConnection] Screenshot and UI dump completed successfully');
      } else {
        const errorMessage = result.error || 'Screenshot and UI dump failed';
        console.error('[@hook:useRemoteConnection] Screenshot and UI dump failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('[@hook:useRemoteConnection] Screenshot and UI dump error:', err);
      throw err;
    }
  }, [deviceConfig, selectedHost, buildHostUrl]);

  // Android Mobile specific: Get apps list
  const handleGetApps = useCallback(async () => {
    const endpoint = deviceConfig?.serverEndpoints.getApps;
    if (!endpoint) {
      throw new Error('App listing not supported for this device type');
    }
    
    if (!selectedHost) {
      throw new Error('No host selected for getting apps');
    }
    
    try {
      console.log('[@hook:useRemoteConnection] Getting installed apps...');
      
      // Use host URL directly instead of hardcoded localhost
      const hostUrl = buildHostUrl(selectedHost.id, endpoint);
      const response = await fetch(hostUrl, {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success && result.apps) {
        setAndroidApps(result.apps);
        console.log(`[@hook:useRemoteConnection] Found ${result.apps.length} installed apps`);
      } else {
        const errorMessage = result.error || 'Failed to get apps list';
        console.error('[@hook:useRemoteConnection] Get apps failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('[@hook:useRemoteConnection] Get apps error:', err);
      throw err;
    }
  }, [deviceConfig, selectedHost, buildHostUrl]);

  // Android Mobile specific: Click UI element
  const handleClickElement = useCallback(async (element: AndroidElement) => {
    const endpoint = deviceConfig?.serverEndpoints.clickElement;
    if (!endpoint) {
      throw new Error('Element clicking not supported for this device type');
    }
    
    if (!selectedHost) {
      throw new Error('No host selected for element clicking');
    }
    
    try {
      console.log(`[@hook:useRemoteConnection] Clicking element: ${element.id}`);
      
      // Use host URL directly instead of hardcoded localhost
      const hostUrl = buildHostUrl(selectedHost.id, endpoint);
      const response = await fetch(hostUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ elementId: element.id }),
      });

      const result = await response.json();
      if (result.success) {
        console.log(`[@hook:useRemoteConnection] Successfully clicked element: ${element.id}`);
      } else {
        const errorMessage = result.error || 'Element click failed';
        console.error('[@hook:useRemoteConnection] Element click failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('[@hook:useRemoteConnection] Element click error:', err);
      throw err;
    }
  }, [deviceConfig, selectedHost, buildHostUrl]);

  // Clear UI elements
  const clearElements = useCallback(() => {
    console.log('[@hook:useRemoteConnection] Clearing UI elements');
    setAndroidElements([]);
  }, []);

  const handleRemoteCommand = useCallback(async (command: string, params: any = {}) => {
    if (!deviceConfig || !selectedHost) {
      console.error('[@hook:useRemoteConnection] No device config or selected host available');
      return;
    }
    
    try {
      console.log(`[@hook:useRemoteConnection] Sending remote command: ${command}`, params);
      
      // Use abstract controller endpoint
      const endpoint = deviceConfig.serverEndpoints.command;
      if (!endpoint) {
        throw new Error('Command endpoint not available');
      }
      
      // Handle special Android mobile commands
      if (remoteType === 'android-mobile' && command === 'LAUNCH_APP') {
        const requestBody = {
          command: 'launch_app',
          params: { package: params.package }
        };
        
        // Use host URL directly instead of hardcoded localhost
        const hostUrl = buildHostUrl(selectedHost.id, endpoint);
        const response = await fetch(hostUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();
        if (result.success) {
          console.log(`[@hook:useRemoteConnection] Successfully launched app: ${params.package}`);
        } else {
          console.error(`[@hook:useRemoteConnection] App launch failed:`, result.error);
        }
        return;
      }
      
      // Format the command for the backend API
      // The backend expects: { command: 'press_key', params: { key: 'POWER' } }
      const requestBody = {
        command: 'press_key',
        params: { key: command }
      };
      
      // Use host URL directly instead of hardcoded localhost
      const hostUrl = buildHostUrl(selectedHost.id, endpoint);
      const response = await fetch(hostUrl, {
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
  }, [deviceConfig, remoteType, selectedHost, buildHostUrl]);

  // Abstract remote controller methods - Frontend state management only
  const showRemote = useCallback(async () => {
    console.log(`[@hook:useRemoteConnection] Showing ${remoteType} remote (frontend state only)`);
    setRemoteState(prev => ({ ...prev, isLoading: false, error: null }));
    
    // No server call needed - frontend handles remote UI display
    console.log(`[@hook:useRemoteConnection] Remote ${remoteType} shown successfully (frontend)`);
  }, [remoteType]);

  const hideRemote = useCallback(async () => {
    console.log(`[@hook:useRemoteConnection] Hiding ${remoteType} remote (frontend state only)`);
    setRemoteState(prev => ({ ...prev, isLoading: false, error: null }));
    
    // No server call needed - frontend handles remote UI display
    console.log(`[@hook:useRemoteConnection] Remote ${remoteType} hidden successfully (frontend)`);
  }, [remoteType]);

  const sendCommand = useCallback(async (command: string, params?: any) => {
    console.log(`[@hook:useRemoteConnection] Sending command: ${command}`, params);
    setRemoteState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (!selectedHost) {
        throw new Error('No host selected for remote command');
      }

      // Format action object as expected by the host
      const action = {
        command,
        params: params || {},
      };

      // Call host directly using /host/execute-action
      const hostUrl = buildHostUrl(selectedHost.id, '/host/execute-action');
      console.log(`[@hook:useRemoteConnection] Calling host directly: ${hostUrl}`);

      const response = await fetch(hostUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Command failed');
      }

      console.log(`[@hook:useRemoteConnection] Command ${command} sent successfully to host`);
    } catch (error: any) {
      console.error(`[@hook:useRemoteConnection] Command ${command} failed:`, error);
      setRemoteState(prev => ({ ...prev, error: error.message }));
    } finally {
      setRemoteState(prev => ({ ...prev, isLoading: false }));
    }
  }, [buildHostUrl, selectedHost]);

  // Convenience methods for common commands
  const pressKey = useCallback(async (key: string) => {
    await sendCommand('press_key', { key });
  }, [sendCommand]);

  const navigate = useCallback(async (direction: 'up' | 'down' | 'left' | 'right') => {
    const keyMap = {
      up: 'DPAD_UP',
      down: 'DPAD_DOWN', 
      left: 'DPAD_LEFT',
      right: 'DPAD_RIGHT'
    };
    await pressKey(keyMap[direction]);
  }, [pressKey]);

  const select = useCallback(async () => {
    await pressKey('DPAD_CENTER');
  }, [pressKey]);

  const back = useCallback(async () => {
    await pressKey('BACK');
  }, [pressKey]);

  const home = useCallback(async () => {
    await pressKey('HOME');
  }, [pressKey]);

  return {
    // Original interface
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    remoteConfig,
    androidScreenshot,
    
    // Android Mobile specific
    androidElements,
    androidApps,
    
    // Generic methods
    handleTakeControl,
    handleReleaseControl,
    handleScreenshot,
    handleRemoteCommand,
    fetchDefaultValues,
    
    // Android Mobile specific methods
    handleScreenshotAndDumpUI,
    handleGetApps,
    handleClickElement,
    clearElements,
    
    deviceConfig,

    // Abstract remote controller methods (for backward compatibility)
    isLoading: remoteState.isLoading,
    error: remoteState.error,
    showRemote,
    hideRemote,
    sendCommand,
    pressKey,
    navigate,
    select,
    back,
    home,
  };
}