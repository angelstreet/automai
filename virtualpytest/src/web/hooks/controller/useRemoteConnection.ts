import { useState, useCallback, useEffect } from 'react';

import {
  RemoteSession,
  ConnectionForm,
  RemoteConfig,
  AndroidElement,
  AndroidApp,
  RemoteType,
} from '../../types/controller/Remote_Types';
import { useDeviceControl } from '../useDeviceControl';
import { useHostManager } from '../useHostManager';

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
  const [error, setError] = useState<string | null>(null);

  // Get selected host from host manager context
  const { selectedHost } = useHostManager();

  // NEW: Use device control hook (replaces all duplicate control logic)
  const { isControlActive, isControlLoading, controlError, handleToggleControl, clearError } =
    useDeviceControl({
      host: selectedHost,
      sessionId: 'remote-connection-session',
      autoCleanup: true, // Auto-release on unmount
    });

  // Original interface state
  const [session, setSession] = useState<RemoteSession>(initialSession);
  const [connectionForm, setConnectionForm] = useState<ConnectionForm>(initialConnectionForm);
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
      // Create a basic RemoteConfig from the deviceConfig, mapping endpoint names
      const basicRemoteConfig: RemoteConfig = {
        type: deviceConfig.type,
        name: deviceConfig.name,
        icon: deviceConfig.icon,
        hasScreenshot: deviceConfig.hasScreenshot,
        hasOverlay: deviceConfig.hasOverlay,
        serverEndpoints: {
          takeScreenshot: deviceConfig.serverEndpoints.screenshot || '',
          screenshotAndDump: deviceConfig.serverEndpoints.screenshotAndDump || '',
          getApps: deviceConfig.serverEndpoints.getApps || '',
          clickElement: deviceConfig.serverEndpoints.clickElement || '',
          tapElement: deviceConfig.serverEndpoints.tapElement || '',
          executeCommand:
            deviceConfig.serverEndpoints.executeCommand || deviceConfig.serverEndpoints.command,
          getStatus: deviceConfig.serverEndpoints.getStatus || '',
        },
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

  // Sync session state with device control state
  useEffect(() => {
    if (isControlActive) {
      setSession({
        connected: true,
        connectionInfo: connectionForm.device_ip || 'Connected via device control',
      });
    } else {
      setSession(initialSession);
      setAndroidScreenshot(null);
      setAndroidElements([]);
      setAndroidApps([]);
    }
  }, [isControlActive, connectionForm.device_ip]);

  // Show control errors
  useEffect(() => {
    if (controlError) {
      setError(controlError);
      clearError();
    }
  }, [controlError, clearError]);

  // NEW: Simplified control handlers using useDeviceControl
  const handleTakeControl = useCallback(async () => {
    setError(null);
    await handleToggleControl();
  }, [handleToggleControl]);

  const handleReleaseControl = useCallback(async () => {
    setError(null);
    await handleToggleControl();
  }, [handleToggleControl]);

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
          host: selectedHost,
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
          `[@hook:useRemoteConnection] Clicking element using execute-command: ${element.id}`,
        );

        // Use the unified execute-command route
        const response = await fetch(`/server/remote/execute-command`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host_name: selectedHost.host_name,
            command: 'click_element',
            params: {
              element_id: element.id,
            },
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
              host: selectedHost,
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
            host: selectedHost,
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
    isLoading: isControlLoading,
    error,
    remoteConfig,
    androidScreenshot,

    // Android Mobile specific state
    androidElements,
    androidApps,

    // Core methods (now using useDeviceControl)
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
