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
    '[@hook:useAndroidMobile] Hook called for device:',
    deviceId,
    'host:',
    selectedHost?.host_name,
  );

  // Simple validation - no complex memoization
  if (!selectedHost || !deviceId) {
    console.warn('[@hook:useAndroidMobile] Missing host or deviceId');
  }

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

  // State management - initialize with default connection state
  const [isConnected_internal, setIsConnected] = useState(false);
  const [androidScreenshot, setAndroidScreenshot] = useState<string | null>(null);
  const [androidElements, setAndroidElements] = useState<AndroidElement[]>([]);
  const [androidApps, setAndroidApps] = useState<AndroidApp[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedElement, setSelectedElement] = useState('');
  const [selectedApp, setSelectedApp] = useState('');
  const [isDumpingUI, setIsDumpingUI] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshingApps, setIsRefreshingApps] = useState(false);

  // Auto-connect when host and deviceId are available
  useEffect(() => {
    if (selectedHost && deviceId) {
      console.log('[@hook:useAndroidMobile] Auto-connecting with host and device');
      setIsConnected(true);
    } else {
      console.log('[@hook:useAndroidMobile] No host or device, disconnecting');
      setIsConnected(false);
    }
  }, [selectedHost, deviceId]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('[@hook:useAndroidMobile] androidElements state changed:', {
      count: androidElements.length,
      elements: androidElements.slice(0, 3).map((el) => ({
        id: el.id,
        contentDesc: el.contentDesc,
        text: el.text,
      })),
      timestamp: new Date().toISOString(),
    });
  }, [androidElements]);

  const screenshotRef = useRef<HTMLImageElement>(null);

  // Debug hook lifecycle
  useEffect(() => {
    console.log(
      '[@hook:useAndroidMobile] Hook mounted for device:',
      deviceId,
      'host:',
      selectedHost?.host_name,
    );
    return () => {
      console.log('[@hook:useAndroidMobile] Hook unmounting for device:', deviceId);
    };
  }, []); // Empty dependency array to only run on mount/unmount

  // Action handlers
  const handleTap = useCallback(
    async (x: number, y: number) => {
      if (!selectedHost) {
        console.warn('[@hook:useAndroidMobile] No host data available for tap action');
        return { success: false, error: 'No host data available' };
      }

      console.log(`[@hook:useAndroidMobile] Executing tap at (${x}, ${y})`);
      try {
        const response = await fetch('/server/remote/tapCoordinates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: selectedHost,
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
    [selectedHost, deviceId],
  );

  const refreshScreenshot = useCallback(async () => {
    if (!selectedHost) {
      console.warn('[@hook:useAndroidMobile] No host data available for screenshot');
      return;
    }

    try {
      const response = await fetch('/server/remote/takeScreenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: selectedHost,
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
  }, [selectedHost, deviceId]);

  const refreshElements = useCallback(async () => {
    if (!selectedHost) {
      console.warn('[@hook:useAndroidMobile] No host data available for elements');
      return;
    }

    setIsDumpingUI(true);
    try {
      const response = await fetch('/server/remote/dumpUi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: selectedHost,
          device_id: deviceId,
        }),
      });

      const result = await response.json();
      if (result.success && result.elements) {
        console.log(
          '[@hook:useAndroidMobile] Setting elements:',
          result.elements.length,
          'elements',
        );
        setAndroidElements(result.elements);
      } else {
        console.warn('[@hook:useAndroidMobile] No elements in response:', result);
      }
    } catch (error) {
      console.error('[@hook:useAndroidMobile] Elements error:', error);
    } finally {
      setIsDumpingUI(false);
    }
  }, [selectedHost, deviceId]);

  const refreshApps = useCallback(async () => {
    if (!selectedHost) {
      console.warn('[@hook:useAndroidMobile] No host data available for apps');
      return;
    }

    setIsRefreshingApps(true);
    try {
      const response = await fetch('/server/remote/getApps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: selectedHost,
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
  }, [selectedHost, deviceId]);

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
      if (!selectedHost) {
        console.warn('[@hook:useAndroidMobile] No host data available for element click');
        return;
      }

      console.log(`[@hook:useAndroidMobile] Element clicked: ${element.id}`);
      try {
        const response = await fetch('/server/remote/executeCommand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: selectedHost,
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
    [selectedHost, deviceId],
  );

  const handleRemoteCommand = useCallback(
    async (command: string, params?: any) => {
      if (!selectedHost) {
        console.warn('[@hook:useAndroidMobile] No host data available for remote command');
        return;
      }

      console.log(`[@hook:useAndroidMobile] Executing remote command: ${command}`, params);
      try {
        let requestBody;

        if (command === 'LAUNCH_APP' && params?.package) {
          requestBody = {
            host: selectedHost,
            device_id: deviceId,
            command: 'launch_app',
            params: { package: params.package },
          };
        } else {
          requestBody = {
            host: selectedHost,
            device_id: deviceId,
            command: 'press_key',
            params: { key: command },
          };
        }

        const response = await fetch('/server/remote/executeCommand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();
        console.log('[@hook:useAndroidMobile] Remote command result:', result);
      } catch (error) {
        console.error('[@hook:useAndroidMobile] Remote command error:', error);
      }
    },
    [selectedHost, deviceId],
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
      connected: isConnected_internal,
      connectionInfo: isConnected_internal ? 'Connected' : 'Disconnected',
    }),
    [isConnected_internal],
  );

  return {
    // Configuration
    layoutConfig,

    // State
    isConnected: isConnected_internal,
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
    hostData: selectedHost,
    deviceData: selectedHost?.devices?.find((d) => d.device_id === deviceId),
  };
}
