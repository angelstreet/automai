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

export function useAndroidMobile(selectedHost: Host | null, deviceId: string | null) {
  console.log(
    '[@hook:useAndroidMobile] Initializing Android mobile hook for device:',
    deviceId,
    'in host:',
    selectedHost?.host_name,
  );

  // Get the specific device from the host
  const device = selectedHost?.devices?.find((d) => d.device_id === deviceId);

  // Just use the selectedHost and device directly - no need for complex memoization
  const stableHostData = useMemo(() => {
    if (!selectedHost || !device) {
      console.log('[@hook:useAndroidMobile] No host or device selected');
      return null;
    }

    return {
      host_name: selectedHost.host_name,
      device_model: device.device_model,
      device_ip: device.device_ip,
      device_name: device.device_name,
      host_url: selectedHost.host_url,
    };
  }, [selectedHost, device]);

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

  // Track host and device changes
  useEffect(() => {
    if (stableHostData) {
      console.log('[@hook:useAndroidMobile] Host and device data changed:', {
        host_name: stableHostData.host_name,
        device_model: stableHostData.device_model,
        device_ip: stableHostData.device_ip,
        timestamp: Date.now(),
      });
    }
  }, [stableHostData]);

  // Action handlers
  const handleTap = useCallback(
    async (x: number, y: number) => {
      if (!stableHostData) {
        console.warn('[@hook:useAndroidMobile] No host data available for tap action');
        return { success: false, error: 'No host data available' };
      }

      console.log(`[@hook:useAndroidMobile] Executing tap at (${x}, ${y})`);
      try {
        const response = await fetch('/server/remote/tap-coordinates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: stableHostData,
            device_id: deviceId,
            x,
            y,
          }),
        });

        const result = await response.json();
        console.log('[@hook:useAndroidMobile] Tap result:', result);
        return result;
      } catch (error) {
        console.error('[@hook:useAndroidMobile] Tap error:', error);
        return { success: false, error: 'Network error' };
      }
    },
    [stableHostData, deviceId],
  );

  const refreshScreenshot = useCallback(async () => {
    if (!stableHostData) {
      console.warn('[@hook:useAndroidMobile] No host data available for screenshot');
      return;
    }

    try {
      const response = await fetch('/server/remote/take-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: stableHostData,
          device_id: deviceId,
        }),
      });

      const result = await response.json();
      if (result.success && result.screenshot) {
        setAndroidScreenshot(result.screenshot);
      }
    } catch (error) {
      console.error('[@hook:useAndroidMobile] Screenshot error:', error);
    }
  }, [stableHostData, deviceId]);

  const refreshElements = useCallback(async () => {
    if (!stableHostData) {
      console.warn('[@hook:useAndroidMobile] No host data available for elements');
      return;
    }

    setIsDumpingUI(true);
    try {
      const response = await fetch('/server/remote/dump-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: stableHostData,
          device_id: deviceId,
        }),
      });

      const result = await response.json();
      if (result.success && result.elements) {
        setAndroidElements(result.elements);
      }
    } catch (error) {
      console.error('[@hook:useAndroidMobile] Elements error:', error);
    } finally {
      setIsDumpingUI(false);
    }
  }, [stableHostData, deviceId]);

  const refreshApps = useCallback(async () => {
    if (!stableHostData) {
      console.warn('[@hook:useAndroidMobile] No host data available for apps');
      return;
    }

    setIsRefreshingApps(true);
    try {
      const response = await fetch('/server/remote/get-apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: stableHostData,
          device_id: deviceId,
        }),
      });

      const result = await response.json();
      if (result.success && result.apps) {
        setAndroidApps(result.apps);
      }
    } catch (error) {
      console.error('[@hook:useAndroidMobile] Apps error:', error);
    } finally {
      setIsRefreshingApps(false);
    }
  }, [stableHostData, deviceId]);

  // Additional methods expected by the component
  const handleDisconnect = useCallback(async () => {
    console.log('[@hook:useAndroidMobile] Disconnecting...');
    setIsDisconnecting(true);
    // Add disconnect logic here if needed
    setIsConnected(false);
    setIsDisconnecting(false);
  }, []);

  const handleOverlayElementClick = useCallback(
    async (element: AndroidElement) => {
      if (!stableHostData) {
        console.warn('[@hook:useAndroidMobile] No host data available for element click');
        return;
      }

      console.log(`[@hook:useAndroidMobile] Element clicked: ${element.id}`);
      try {
        const response = await fetch('/server/remote/execute-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: stableHostData,
            device_id: deviceId,
            command: 'click_element_by_id',
            params: { element_id: element.id },
          }),
        });

        const result = await response.json();
        console.log('[@hook:useAndroidMobile] Element click result:', result);
      } catch (error) {
        console.error('[@hook:useAndroidMobile] Element click error:', error);
      }
    },
    [stableHostData, deviceId],
  );

  const handleRemoteCommand = useCallback(
    async (command: string) => {
      if (!stableHostData) {
        console.warn('[@hook:useAndroidMobile] No host data available for remote command');
        return;
      }

      console.log(`[@hook:useAndroidMobile] Executing remote command: ${command}`);
      try {
        const response = await fetch('/server/remote/execute-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: stableHostData,
            device_id: deviceId,
            command: 'press_key',
            params: { key: command },
          }),
        });

        const result = await response.json();
        console.log('[@hook:useAndroidMobile] Remote command result:', result);
      } catch (error) {
        console.error('[@hook:useAndroidMobile] Remote command error:', error);
      }
    },
    [stableHostData, deviceId],
  );

  const clearElements = useCallback(() => {
    console.log('[@hook:useAndroidMobile] Clearing elements');
    setAndroidElements([]);
    setSelectedElement('');
    setShowOverlay(false);
  }, []);

  const handleGetApps = useCallback(async () => {
    await refreshApps();
  }, [refreshApps]);

  const handleDumpUIWithLoading = useCallback(async () => {
    await refreshElements();
  }, [refreshElements]);

  // Session info
  const session = useMemo(
    () => ({
      connected: isConnected,
      connectionInfo: isConnected ? 'Connected' : 'Disconnected',
    }),
    [isConnected],
  );

  return {
    // Configuration
    layoutConfig,

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

    // Refs
    screenshotRef,

    // Actions
    handleTap,
    refreshScreenshot,
    refreshElements,
    refreshApps,
    handleDisconnect,
    handleOverlayElementClick,
    handleRemoteCommand,
    clearElements,
    handleGetApps,
    handleDumpUIWithLoading,

    // Setters
    setShowOverlay,
    setSelectedElement,
    setSelectedApp,
    setIsConnected,
    setIsDisconnecting,

    // Session info
    session,

    // Host and device data
    hostData: stableHostData,
    deviceData: device,
  };
}
