import { useState, useCallback } from 'react';
import { AndroidMobileSession, ConnectionForm, RemoteConfig, AndroidElement, AndroidApp } from '../../types/remote/types';

const initialConnectionForm: ConnectionForm = {
  host_ip: '',
  host_username: '',
  host_password: '',
  host_port: '22',
  device_ip: '',
  device_port: '5555'
};

const initialSession: AndroidMobileSession = {
  connected: false,
  host_ip: '',
  device_ip: ''
};

export function useAndroidMobileConnection() {
  const [session, setSession] = useState<AndroidMobileSession>(initialSession);
  const [connectionForm, setConnectionForm] = useState<ConnectionForm>(initialConnectionForm);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null);
  
  // Android Mobile specific state
  const [androidElements, setAndroidElements] = useState<AndroidElement[]>([]);
  const [androidApps, setAndroidApps] = useState<AndroidApp[]>([]);
  const [androidScreenshot, setAndroidScreenshot] = useState<string | null>(null);

  const fetchDefaultValues = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-mobile/defaults');
      const result = await response.json();
      
      if (result.success && result.defaults) {
        setConnectionForm(prev => ({
          ...prev,
          ...result.defaults
        }));
      }
    } catch (error) {
      console.log('Could not load Android Mobile default values:', error);
    }
  }, []);

  const fetchAndroidMobileConfig = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-mobile/config');
      const result = await response.json();
      
      if (result.success && result.config) {
        setRemoteConfig(result.config);
      }
    } catch (error) {
      console.log('Could not load Android Mobile config:', error);
    }
  }, []);

  const handleConnect = useCallback(async () => {
    setConnectionLoading(true);
    setConnectionError(null);

    try {
      // Fetch config first
      await fetchAndroidMobileConfig();

      const response = await fetch('http://localhost:5009/api/virtualpytest/android-mobile/take-control', {
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
  }, [connectionForm, fetchAndroidMobileConfig]);

  const handleDisconnect = useCallback(async () => {
    setConnectionLoading(true);

    try {
      await fetch('http://localhost:5009/api/virtualpytest/android-mobile/release-control', {
        method: 'POST',
      });
      
      setSession(initialSession);
      setConnectionError(null);
      setAndroidElements([]);
      setAndroidApps([]);
      setAndroidScreenshot(null);
    } catch (err: any) {
      // Still reset session even if disconnect fails
      setSession(initialSession);
    } finally {
      setConnectionLoading(false);
    }
  }, []);

  const handleCommand = useCallback(async (command: string, params: any = {}) => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-mobile/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, params }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('Android Mobile command failed:', result.error);
      }
    } catch (err: any) {
      console.error('Android Mobile command error:', err);
    }
  }, []);

  const handleDumpUI = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-mobile/dump-ui', {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        setAndroidElements(result.elements);
        console.log(`[@hook:useAndroidMobileConnection] Dumped ${result.totalCount} UI elements`);
        
        // If no elements found after filtering, it means the screen has no interactive elements
        if (result.elements.length === 0) {
          throw new Error('No interactive UI elements found on the current screen. The screen might be empty or contain only non-interactive elements.');
        }
      } else {
        const errorMessage = result.error || 'UI dump failed';
        console.error('[@hook:useAndroidMobileConnection] UI dump failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('[@hook:useAndroidMobileConnection] UI dump error:', err);
      throw err; // Re-throw the error so the modal can catch it
    }
  }, []);

  const handleClickElement = useCallback(async (element: AndroidElement) => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-mobile/click-element', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ element }),
      });

      const result = await response.json();
      if (!result.success) {
        const errorMessage = result.error || 'Element click failed';
        console.error('[@hook:useAndroidMobileConnection] Element click failed:', errorMessage);
        throw new Error(errorMessage);
      }
      console.log('[@hook:useAndroidMobileConnection] Element clicked successfully:', element.id);
    } catch (err: any) {
      console.error('[@hook:useAndroidMobileConnection] Element click error:', err);
      throw err; // Re-throw the error so the modal can catch it
    }
  }, []);

  const handleGetApps = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-mobile/get-apps', {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        setAndroidApps(result.apps);
        console.log(`[@hook:useAndroidMobileConnection] Found ${result.apps.length} installed apps`);
      } else {
        const errorMessage = result.error || 'Get apps failed';
        console.error('[@hook:useAndroidMobileConnection] Get apps failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('[@hook:useAndroidMobileConnection] Get apps error:', err);
      throw err; // Re-throw the error so the modal can catch it
    }
  }, []);

  const handleScreenshot = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-mobile/screenshot', {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        setAndroidScreenshot(result.screenshot);
        console.log('[@hook:useAndroidMobileConnection] Screenshot captured successfully');
      } else {
        const errorMessage = result.error || 'Screenshot failed';
        console.error('[@hook:useAndroidMobileConnection] Screenshot failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('[@hook:useAndroidMobileConnection] Screenshot error:', err);
      throw err; // Re-throw the error so the modal can catch it
    }
  }, []);

  const handleScreenshotAndDumpUI = useCallback(async () => {
    try {
      // First take a screenshot
      console.log('[@hook:useAndroidMobileConnection] Taking screenshot before UI dump...');
      await handleScreenshot();
      console.log('[@hook:useAndroidMobileConnection] Screenshot captured successfully');
      
      // Then dump UI elements
      console.log('[@hook:useAndroidMobileConnection] Now dumping UI elements...');
      await handleDumpUI();
      
      console.log('[@hook:useAndroidMobileConnection] Screenshot and UI dump completed successfully');
    } catch (err: any) {
      console.error('[@hook:useAndroidMobileConnection] Screenshot and UI dump error:', err);
      throw err; // Re-throw the error so the modal can catch it
    }
  }, [handleScreenshot, handleDumpUI]);

  const clearElements = useCallback(() => {
    setAndroidElements([]);
  }, []);

  return {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    remoteConfig,
    androidElements,
    androidApps,
    androidScreenshot,
    handleConnect,
    handleDisconnect,
    handleCommand,
    handleDumpUI,
    handleClickElement,
    handleGetApps,
    handleScreenshot,
    handleScreenshotAndDumpUI,
    clearElements,
    fetchDefaultValues,
  };
} 