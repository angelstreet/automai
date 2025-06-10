import { useState, useCallback, useEffect } from 'react';
import { RemoteSession, ConnectionForm, RemoteConfig, AndroidElement, AndroidApp } from '../../types/remote/types';
import { RemoteType, BaseConnectionConfig } from '../../types/remote/remoteTypes';
import { getRemoteConfig } from './remoteConfigs';
import { androidTVRemote, androidMobileRemote } from '../../../config/remote';
import { useRegistration } from '../../contexts/RegistrationContext';
import { RemoteControllerProxy } from '../../controllers/RemoteControllerProxy';

// Simplified connection form - no SSH fields needed with abstract controller
const initialConnectionForm: ConnectionForm = {
  device_ip: '',
  device_port: '5555'
};

// Generic session for all remote types
const initialSession: RemoteSession = {
  connected: false,
  connectionInfo: ''
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
  const [session, setSession] = useState<RemoteSession>(initialSession);
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

  const handleTakeControl = useCallback(async () => {
    if (!deviceConfig || !selectedHost) {
      console.error('[@hook:useRemoteConnection] No device config or selected host available');
      return;
    }
    
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

      console.log('[@hook:useRemoteConnection] Using remote controller proxy for connection...');
      
      // Get remote controller proxy from selectedHost
      const remoteController = selectedHost.controllerProxies?.remote;
      
      if (!remoteController) {
        throw new Error('Remote controller proxy not available. Host may not have remote capabilities or proxy creation failed.');
      }

      console.log('[@hook:useRemoteConnection] Remote controller proxy found, checking status...');
      
      // Check current status using controller proxy
      const statusResult = await remoteController.get_status();
      
      if (statusResult.success) {
        console.log(`[@hook:useRemoteConnection] Successfully connected to ${deviceConfig.name}`);
        setSession({
          connected: true,
          connectionInfo: connectionForm.device_ip || 'Connected via proxy'
        });
        setConnectionError(null);

        // Remote is autonomous - no need to call showRemote
        console.log('[@hook:useRemoteConnection] Remote is autonomous and ready');
      } else {
        const errorMsg = statusResult.error || `Failed to connect to ${deviceConfig.name} device`;
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
  }, [connectionForm, deviceConfig, selectedHost]);

  const handleReleaseControl = useCallback(async () => {
    if (!deviceConfig || !selectedHost) {
      console.error('[@hook:useRemoteConnection] No device config or selected host available');
      return;
    }
    
    setConnectionLoading(true);
    setConnectionError(null); // Clear any connection errors

    try {
      console.log('[@hook:useRemoteConnection] Releasing control...');
      
      // Get remote controller proxy from selectedHost
      const remoteController = selectedHost.controllerProxies?.remote;
      
      if (remoteController) {
        console.log('[@hook:useRemoteConnection] Using remote controller proxy for disconnect...');
        
        // Use controller proxy to disconnect
        try {
          const disconnectResult = await remoteController.get_status(); // Check status to verify connection state
          console.log('[@hook:useRemoteConnection] Remote controller status checked before disconnect');
        } catch (error) {
          console.log('[@hook:useRemoteConnection] Remote controller already disconnected or unavailable');
        }
      } else {
        console.log('[@hook:useRemoteConnection] No remote controller proxy available');
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
  }, [deviceConfig, selectedHost]);

  const handleScreenshot = useCallback(async () => {
    if (!selectedHost) {
      throw new Error('No host selected for screenshot operation');
    }
    
    // Get remote controller proxy from selectedHost
    const remoteController = selectedHost.controllerProxies?.remote;
    
    if (!remoteController) {
      throw new Error('Remote controller proxy not available. Screenshot not supported for this device type.');
    }
    
    try {
      console.log('[@hook:useRemoteConnection] Taking screenshot using remote controller proxy...');
      
      // Use remote controller proxy to take screenshot
      const screenshotPath = await remoteController.take_screenshot();
      
      if (screenshotPath) {
        setAndroidScreenshot(screenshotPath);
        console.log('[@hook:useRemoteConnection] Screenshot captured successfully via proxy');
      } else {
        const errorMessage = 'Screenshot failed - no path returned';
        console.error('[@hook:useRemoteConnection] Screenshot failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('[@hook:useRemoteConnection] Screenshot error:', err);
      throw err; // Re-throw the error so the modal can catch it
    }
  }, [selectedHost]);

  // Android Mobile specific: Screenshot + UI dump
  const handleScreenshotAndDumpUI = useCallback(async () => {
    if (!selectedHost) {
      throw new Error('No host selected for UI dump operation');
    }
    
    // Get remote controller proxy from selectedHost
    const remoteController = selectedHost.controllerProxies?.remote;
    
    if (!remoteController) {
      throw new Error('Remote controller proxy not available. UI dump not supported for this device type.');
    }
    
    try {
      console.log('[@hook:useRemoteConnection] Taking screenshot and dumping UI elements using remote controller proxy...');
      
      // Use remote controller proxy to take screenshot and dump UI
      const result = await remoteController.screenshot_and_dump_ui();
      
      if (result.success) {
        if (result.screenshot) {
          setAndroidScreenshot(result.screenshot);
        }
        if (result.elements) {
          setAndroidElements(result.elements as any); // Temporary cast to resolve type differences
          console.log(`[@hook:useRemoteConnection] Found ${result.elements.length} UI elements`);
        }
        console.log('[@hook:useRemoteConnection] Screenshot and UI dump completed successfully via proxy');
      } else {
        const errorMessage = result.error || 'Screenshot and UI dump failed';
        console.error('[@hook:useRemoteConnection] Screenshot and UI dump failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('[@hook:useRemoteConnection] Screenshot and UI dump error:', err);
      throw err;
    }
  }, [selectedHost]);

  // Android Mobile specific: Get apps list
  const handleGetApps = useCallback(async () => {
    if (!selectedHost) {
      throw new Error('No host selected for apps operation');
    }
    
    // Get remote controller proxy from selectedHost
    const remoteController = selectedHost.controllerProxies?.remote;
    
    if (!remoteController) {
      throw new Error('Remote controller proxy not available. App listing not supported for this device type.');
    }
    
    try {
      console.log('[@hook:useRemoteConnection] Getting installed apps using remote controller proxy...');
      
      // Use remote controller proxy to get installed apps
      const apps = await remoteController.get_installed_apps();
      
      if (apps && apps.length > 0) {
        setAndroidApps(apps as any); // Temporary cast to resolve type differences
        console.log(`[@hook:useRemoteConnection] Found ${apps.length} installed apps via proxy`);
      } else {
        console.log('[@hook:useRemoteConnection] No apps found or apps list is empty');
        setAndroidApps([]);
      }
    } catch (err: any) {
      console.error('[@hook:useRemoteConnection] Get apps error:', err);
      throw err;
    }
  }, [selectedHost]);

  // Android Mobile specific: Click UI element
  const handleClickElement = useCallback(async (element: AndroidElement) => {
    if (!selectedHost) {
      throw new Error('No host selected for element click operation');
    }
    
    // Get remote controller proxy from selectedHost
    const remoteController = selectedHost.controllerProxies?.remote;
    
    if (!remoteController) {
      throw new Error('Remote controller proxy not available. Element clicking not supported for this device type.');
    }
    
    try {
      console.log(`[@hook:useRemoteConnection] Clicking element using remote controller proxy: ${element.id}`);
      
      // Use remote controller proxy to click element
      const result = await remoteController.click_element(element.id);
      
      if (result.success) {
        console.log(`[@hook:useRemoteConnection] Successfully clicked element via proxy: ${element.id}`);
      } else {
        const errorMessage = result.error || 'Element click failed';
        console.error('[@hook:useRemoteConnection] Element click failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('[@hook:useRemoteConnection] Element click error:', err);
      throw err;
    }
  }, [selectedHost]);

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
    
    // Get remote controller proxy from selectedHost
    const remoteController = selectedHost.controllerProxies?.remote;
    
    if (!remoteController) {
      console.error('[@hook:useRemoteConnection] Remote controller proxy not available');
      return;
    }
    
    try {
      console.log(`[@hook:useRemoteConnection] Sending remote command via proxy: ${command}`, params);
      
      // Handle special Android mobile commands
      if (remoteType === 'android-mobile' && command === 'LAUNCH_APP') {
        const result = await remoteController.launch_app(params.package);
        
        if (result.success) {
          console.log(`[@hook:useRemoteConnection] Successfully launched app via proxy: ${params.package}`);
        } else {
          console.error(`[@hook:useRemoteConnection] App launch failed via proxy:`, result.error);
        }
        return;
      }
      
      // For regular key press commands, use press_key method
      const result = await remoteController.press_key(command);
      
      if (result.success) {
        console.log(`[@hook:useRemoteConnection] Successfully sent command via proxy: ${command}`);
      } else {
        console.error(`[@hook:useRemoteConnection] Remote command failed via proxy:`, result.error);
      }
    } catch (err: any) {
      console.error(`[@hook:useRemoteConnection] Remote command error:`, err);
    }
  }, [deviceConfig, remoteType, selectedHost]);

  // Abstract remote controller methods - Frontend state management only
  const showRemote = useCallback(async () => {
    console.log(`[@hook:useRemoteConnection] Showing ${remoteType} remote (frontend state only)`);
    setRemoteState(prev => ({ ...prev, isLoading: false, error: null }));
    
    // No server call needed - frontend handles remote UI display
    console.log(`[@hook:useRemoteConnection] Remote ${remoteType} shown successfully (frontend)`);
  }, [remoteType]);

  const hideRemote = useCallback(async () => {
    console.log(`[@hook:useRemoteConnection] Hiding ${remoteType} remote and releasing control`);
    setRemoteState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // First release control on the backend to avoid conflicts
      await handleReleaseControl();
      
      // Then update frontend state
      setRemoteState(prev => ({ ...prev, isLoading: false, error: null }));
      
      console.log(`[@hook:useRemoteConnection] Remote ${remoteType} hidden and control released successfully`);
    } catch (error: any) {
      console.error(`[@hook:useRemoteConnection] Error hiding remote ${remoteType}:`, error);
      setRemoteState(prev => ({ ...prev, isLoading: false, error: error.message }));
      // Don't throw - let the component handle the error state
    }
  }, [remoteType, handleReleaseControl]);

  const sendCommand = useCallback(async (command: string, params?: any) => {
    if (!selectedHost) {
      console.error('[@hook:useRemoteConnection] No host selected for command');
      setRemoteState(prev => ({ ...prev, error: 'No host selected' }));
      return;
    }

    console.log(`[@hook:useRemoteConnection] Sending command via proxy: ${command}`, params);
    setRemoteState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get remote controller proxy from selectedHost
      const remoteController = selectedHost.controllerProxies?.remote;
      
      if (!remoteController) {
        throw new Error('Remote controller proxy not available');
      }

      // Use the remote controller proxy to send the command
      const result = await remoteController.send_command(command, params || {});
      
      if (!result.success) {
        throw new Error(result.error || 'Command failed');
      }

      console.log(`[@hook:useRemoteConnection] Command ${command} sent successfully via proxy`);
    } catch (error: any) {
      console.error(`[@hook:useRemoteConnection] Command ${command} failed:`, error);
      setRemoteState(prev => ({ ...prev, error: error.message }));
    } finally {
      setRemoteState(prev => ({ ...prev, isLoading: false }));
    }
  }, [selectedHost]);

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