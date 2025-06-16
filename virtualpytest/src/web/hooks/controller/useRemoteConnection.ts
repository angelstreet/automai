import { useState, useCallback, useEffect } from 'react';

import { useRegistration } from '../../contexts/RegistrationContext';
import {
  RemoteSession,
  ConnectionForm,
  RemoteConfig,
  AndroidElement,
  AndroidApp,
  RemoteType,
} from '../../types/controller/Remote_Types';

import { getRemoteConfig } from './useRemoteConfigs';

// Simplified connection form - no SSH fields needed with abstract controller
const initialConnectionForm: ConnectionForm = {
  device_ip: '',
  device_port: '5555',
};

// Generic session for all remote types
const initialSession: RemoteSession = {
  connected: false,
  connectionInfo: '',
};

export function useRemoteConnection(remoteType: RemoteType) {
  const { selectedHost } = useRegistration();

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

  // Get device configuration
  const deviceConfig = getRemoteConfig(remoteType);

  // Debug logging for device configuration
  useEffect(() => {
    console.log(`[@hook:useRemoteConnection] Device config for ${remoteType}:`, deviceConfig);
    console.log(`[@hook:useRemoteConnection] Selected host:`, selectedHost);
    if (!deviceConfig) {
      console.error(
        `[@hook:useRemoteConnection] No device configuration found for remote type: ${remoteType}`,
      );
    } else {
      console.log(
        `[@hook:useRemoteConnection] Device config endpoints:`,
        deviceConfig.serverEndpoints,
      );
    }
  }, [remoteType, deviceConfig, selectedHost]);

  // Load the remote configuration based on device config
  useEffect(() => {
    if (deviceConfig) {
      // Create a basic RemoteConfig from the deviceConfig
      const basicRemoteConfig: RemoteConfig = {
        type: deviceConfig.type,
        name: deviceConfig.name,
        icon: deviceConfig.icon,
        hasScreenshot: deviceConfig.hasScreenshot,
        hasOverlay: deviceConfig.hasOverlay,
        serverEndpoints: deviceConfig.serverEndpoints,
      };

      setRemoteConfig(basicRemoteConfig);
      console.log(
        `[@hook:useRemoteConnection] Loaded ${deviceConfig.name} remote configuration from device config`,
      );
    } else {
      console.log(
        `[@hook:useRemoteConnection] No device configuration available for remote type: ${remoteType}`,
      );
      setRemoteConfig(null);
    }
  }, [deviceConfig, remoteType]);

  const handleTakeControl = useCallback(async () => {
    if (!deviceConfig || !selectedHost) {
      console.error('[@hook:useRemoteConnection] No device config or selected host available');
      return;
    }

    setConnectionLoading(true);
    setConnectionError(null);

    try {
      console.log(
        '[@hook:useRemoteConnection] Starting take control process for:',
        selectedHost.host_name,
      );

      // Simplified validation - device_ip is optional now
      if (connectionForm.device_ip && !connectionForm.device_ip.trim()) {
        const errorMsg = 'Device IP is required';
        console.error('[@hook:useRemoteConnection]', errorMsg);
        setConnectionError(errorMsg);
        return;
      }

      console.log('[@hook:useRemoteConnection] Control already taken by navigation editor');

      // Control is already taken by navigation editor, just set connected state
      console.log(`[@hook:useRemoteConnection] Successfully connected to ${deviceConfig.name}`);
      setSession({
        connected: true,
        connectionInfo: connectionForm.device_ip || 'Connected via navigation editor',
      });
      setConnectionError(null);
      console.log('[@hook:useRemoteConnection] Remote is ready');
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
    setConnectionError(null);

    try {
      console.log('[@hook:useRemoteConnection] Releasing control...');

      // Control is managed by navigation editor, no status check needed
      console.log('[@hook:useRemoteConnection] Control released by navigation editor');

      console.log('[@hook:useRemoteConnection] Control released successfully');
    } catch (err: any) {
      console.error('[@hook:useRemoteConnection] Release control error:', err);
    } finally {
      // Always reset session state and clear data
      setSession(initialSession);
      setAndroidScreenshot(null);
      setAndroidElements([]);
      setAndroidApps([]);
      setConnectionLoading(false);
      console.log(
        '[@hook:useRemoteConnection] Session state reset, connect button should be re-enabled',
      );
    }
  }, [deviceConfig, selectedHost]);

  const handleScreenshot = useCallback(async () => {
    if (!selectedHost) {
      throw new Error('No host selected for screenshot operation');
    }

    try {
      console.log('[@hook:useRemoteConnection] Taking screenshot using server route...');

      // Use direct server route call instead of proxy
      const response = await fetch(`/server/remote/take-screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: selectedHost.host_name,
        }),
      });

      const result = await response.json();

      if (result.success && result.screenshot) {
        setAndroidScreenshot(result.screenshot);
        console.log('[@hook:useRemoteConnection] Screenshot captured successfully');
      } else {
        const errorMessage = result.error || 'Screenshot failed - no data returned';
        console.error('[@hook:useRemoteConnection] Screenshot failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('[@hook:useRemoteConnection] Screenshot error:', err);
      throw err;
    }
  }, [selectedHost]);

  // Android Mobile specific: Screenshot + UI dump
  const handleScreenshotAndDumpUI = useCallback(async () => {
    if (!selectedHost) {
      throw new Error('No host selected for UI dump operation');
    }

    try {
      console.log(
        '[@hook:useRemoteConnection] Taking screenshot and dumping UI elements using server route...',
      );

      // Use direct server route call instead of proxy
      const response = await fetch(`/server/remote/screenshot-and-dump`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: selectedHost.host_name,
        }),
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
  }, [selectedHost]);

  // Android Mobile specific: Get apps list
  const handleGetApps = useCallback(async () => {
    if (!selectedHost) {
      throw new Error('No host selected for apps operation');
    }

    try {
      console.log('[@hook:useRemoteConnection] Getting installed apps using server route...');

      // Use direct server route call instead of proxy
      const response = await fetch(`/server/remote/get-apps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: selectedHost.host_name,
        }),
      });

      const result = await response.json();

      if (result.success && result.apps) {
        setAndroidApps(result.apps);
        console.log(`[@hook:useRemoteConnection] Found ${result.apps.length} installed apps`);
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
  const handleClickElement = useCallback(
    async (element: AndroidElement) => {
      if (!selectedHost) {
        throw new Error('No host selected for element click operation');
      }

      try {
        console.log(
          `[@hook:useRemoteConnection] Clicking element using server route: ${element.id}`,
        );

        // Use direct server route call instead of proxy
        const response = await fetch(`/server/remote/click-element`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host_name: selectedHost.host_name,
            elementId: element.id,
          }),
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
    },
    [selectedHost],
  );

  // Clear UI elements
  const clearElements = useCallback(() => {
    console.log('[@hook:useRemoteConnection] Clearing UI elements');
    setAndroidElements([]);
  }, []);

  const handleRemoteCommand = useCallback(
    async (command: string, params: any = {}) => {
      if (!deviceConfig || !selectedHost) {
        console.error('[@hook:useRemoteConnection] No device config or selected host available');
        return;
      }

      try {
        console.log(`[@hook:useRemoteConnection] Sending remote command: ${command}`, params);

        // Handle special Android mobile commands
        if (remoteType === 'android-mobile' && command === 'LAUNCH_APP') {
          const response = await fetch(`/server/remote/execute-command`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              host_name: selectedHost.host_name,
              command: 'launch_app',
              params: { package: params.package },
            }),
          });

          const result = await response.json();

          if (result.success) {
            console.log(`[@hook:useRemoteConnection] Successfully launched app: ${params.package}`);
          } else {
            console.error(`[@hook:useRemoteConnection] App launch failed:`, result.error);
          }
          return;
        }

        // For regular key press commands
        const response = await fetch(`/server/remote/execute-command`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host_name: selectedHost.host_name,
            command: 'press_key',
            params: { key: command },
          }),
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
    },
    [deviceConfig, remoteType, selectedHost],
  );

  return {
    // Interface
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    remoteConfig,
    androidScreenshot,

    // Android Mobile specific state
    androidElements,
    androidApps,

    // Core methods
    handleTakeControl,
    handleReleaseControl,
    handleScreenshot,
    handleRemoteCommand,

    // Android Mobile specific methods
    handleScreenshotAndDumpUI,
    handleGetApps,
    handleClickElement,
    clearElements,

    // Device configuration
    deviceConfig,
  };
}
