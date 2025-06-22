import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';
import { AndroidElement, AndroidApp } from '../../types/controller/Remote_Types';

interface AndroidMobileLayoutConfig {
  containerWidth: number;
  containerHeight: number;
  deviceResolution: {
    width: number;
    height: number;
  };
  overlayConfig: {
    defaultPosition: {
      left: string;
      top: string;
    };
    defaultScale: {
      x: number;
      y: number;
    };
  };
  autoDumpDelay: number;
}

export function useAndroidMobile(host: Host) {
  console.log(
    '[@hook:useAndroidMobile] Initializing Android mobile hook for host:',
    host.host_name,
    'Host object reference:',
    host,
  );

  // Memoize the host object to prevent unnecessary callback recreations
  const stableHost = useMemo(() => {
    return {
      host_name: host.host_name,
      device_model: host.device_model,
      device_ip: host.device_ip,
      device_name: host.device_name,
      host_url: host.host_url,
      // Include other essential host properties but exclude volatile ones
      capabilities: host.capabilities,
      controller_configs: host.controller_configs,
      controller_types: host.controller_types,
      available_action_types: host.available_action_types,
      available_verification_types: host.available_verification_types,
    };
  }, [
    host.host_name,
    host.device_model,
    host.device_ip,
    host.device_name,
    host.host_url,
    // Only include stable properties in dependencies
  ]);

  // Configuration
  const layoutConfig: AndroidMobileLayoutConfig = useMemo(
    () => ({
      containerWidth: 300,
      containerHeight: 600,
      deviceResolution: {
        width: 1080,
        height: 2340,
      },
      overlayConfig: {
        defaultPosition: {
          left: '74px',
          top: '186px',
        },
        defaultScale: {
          x: 0.198,
          y: 0.195,
        },
      },
      autoDumpDelay: 1200,
    }),
    [],
  );

  // State management
  const [isConnected, setIsConnected] = useState(true);
  const [androidScreenshot, setAndroidScreenshot] = useState<string | null>(null);
  const [androidElements, setAndroidElements] = useState<AndroidElement[]>([]);
  const [androidApps, setAndroidApps] = useState<AndroidApp[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedElement, setSelectedElement] = useState('');
  const [selectedApp, setSelectedApp] = useState('');
  const [isDumpingUI, setIsDumpingUI] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshingApps, setIsRefreshingApps] = useState(false);

  const screenshotRef = useRef<HTMLImageElement>(null);

  // Track host object changes
  useEffect(() => {
    console.log('[@hook:useAndroidMobile] Host object changed:', {
      host_name: stableHost.host_name,
      device_model: stableHost.device_model,
      device_ip: stableHost.device_ip,
      timestamp: Date.now(),
    });
  }, [stableHost]);

  // API calls
  const dump = useCallback(async () => {
    console.log(
      '[@hook:useAndroidMobile] Starting UI dump (without screenshot) for host:',
      stableHost.host_name,
    );
    setIsDumpingUI(true);

    try {
      const response = await fetch('/server/remote/dump-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: stableHost }),
      });
      const result = await response.json();

      if (result.success) {
        console.log('[@hook:useAndroidMobile] UI dump successful');
        if (result.elements) {
          setAndroidElements(result.elements);
          console.log('[@hook:useAndroidMobile] Found', result.elements.length, 'UI elements');
        }
        setShowOverlay(true);
      } else {
        console.error('[@hook:useAndroidMobile] UI dump failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[@hook:useAndroidMobile] Error during UI dump:', error);
      return { success: false, error: error };
    } finally {
      setIsDumpingUI(false);
    }
  }, [stableHost]);

  const getApps = useCallback(async () => {
    console.log('[@hook:useAndroidMobile] Getting apps for host:', stableHost.host_name);
    setIsRefreshingApps(true);

    try {
      const response = await fetch('/server/remote/get-apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: stableHost }),
      });
      const result = await response.json();

      if (result.success && result.apps) {
        console.log('[@hook:useAndroidMobile] Successfully retrieved', result.apps.length, 'apps');
        setAndroidApps(result.apps);
      } else {
        console.error('[@hook:useAndroidMobile] Failed to get apps:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[@hook:useAndroidMobile] Error getting apps:', error);
      return { success: false, error: error };
    } finally {
      setIsRefreshingApps(false);
    }
  }, [stableHost]);

  const clickElement = useCallback(
    async (element: AndroidElement) => {
      console.log('[@hook:useAndroidMobile] Clicking element:', element.id);

      try {
        const response = await fetch('/server/remote/click-element', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: stableHost,
            elementId: element.id.toString(),
          }),
        });
        const result = await response.json();

        if (result.success) {
          console.log('[@hook:useAndroidMobile] Element click successful');
        } else {
          console.error('[@hook:useAndroidMobile] Element click failed:', result.error);
        }

        return result;
      } catch (error) {
        console.error('[@hook:useAndroidMobile] Error clicking element:', error);
        return { success: false, error: error };
      }
    },
    [stableHost],
  );

  const executeCommand = useCallback(
    async (command: string, params?: any) => {
      console.log('[@hook:useAndroidMobile] Executing command:', command, 'with params:', params);

      try {
        const response = await fetch('/server/remote/execute-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: stableHost,
            command,
            params,
          }),
        });
        const result = await response.json();

        if (result.success) {
          console.log('[@hook:useAndroidMobile] Command executed successfully');
        } else {
          console.error('[@hook:useAndroidMobile] Command execution failed:', result.error);
        }

        return result;
      } catch (error) {
        console.error('[@hook:useAndroidMobile] Error executing command:', error);
        return { success: false, error: error };
      }
    },
    [stableHost],
  );

  // Business logic
  const handleDisconnect = useCallback(async () => {
    console.log('[@hook:useAndroidMobile] Starting disconnect process');
    setIsDisconnecting(true);

    try {
      setIsConnected(false);
      setShowOverlay(false);
      setAndroidScreenshot(null);
      setAndroidElements([]);
      setAndroidApps([]);
      setSelectedElement('');
      setSelectedApp('');

      console.log('[@hook:useAndroidMobile] Disconnect completed successfully');
    } catch (error) {
      console.error('[@hook:useAndroidMobile] Error during disconnect:', error);
    } finally {
      setIsDisconnecting(false);
    }
  }, []);

  const handleOverlayElementClick = useCallback(
    async (element: AndroidElement) => {
      console.log('[@hook:useAndroidMobile] Handling overlay element click:', element.id);

      await clickElement(element);
      setSelectedElement(element.id.toString());

      // Auto-refresh after click
      setTimeout(() => {
        console.log('[@hook:useAndroidMobile] Auto-refreshing UI after element click');
        dump();
      }, layoutConfig.autoDumpDelay);
    },
    [clickElement, dump, layoutConfig.autoDumpDelay],
  );

  const handleRemoteCommand = useCallback(
    async (command: string, params?: any) => {
      console.log('[@hook:useAndroidMobile] Handling remote command:', command);

      if (command === 'LAUNCH_APP') {
        await executeCommand('launch_app', { package: params.package });
      } else {
        await executeCommand('press_key', { key: command });
      }
    },
    [executeCommand],
  );

  const clearElements = useCallback(async () => {
    console.log('[@hook:useAndroidMobile] Clearing UI elements');
    setShowOverlay(false);
    setAndroidElements([]);
    setSelectedElement('');
  }, []);

  const handleGetApps = useCallback(async () => {
    console.log('[@hook:useAndroidMobile] Refreshing apps list');
    await getApps();
  }, [getApps]);

  const handleDumpUIWithLoading = useCallback(async () => {
    console.log('[@hook:useAndroidMobile] Dumping UI with loading state');
    await dump();
  }, [dump]);

  return {
    // State
    isConnected,
    androidScreenshot,
    androidElements,
    androidApps,
    showOverlay,
    selectedElement,
    selectedApp,
    isDumpingUI,
    isDisconnecting,
    isRefreshingApps,
    screenshotRef,

    // Actions
    dump,
    getApps,
    clickElement,
    executeCommand,
    handleDisconnect,
    handleOverlayElementClick,
    handleRemoteCommand,
    clearElements,
    handleGetApps,
    handleDumpUIWithLoading,

    // Setters for UI interactions
    setSelectedElement,
    setSelectedApp,

    // Configuration
    layoutConfig,

    // Session info for backward compatibility
    session: {
      connected: isConnected,
      device_ip: stableHost.host_name,
      connectionInfo: `Connected to ${stableHost.device_name}`,
    },
  };
}
