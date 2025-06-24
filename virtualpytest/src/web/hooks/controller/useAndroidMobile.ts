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

  // Memoize the host and device data to prevent unnecessary callback recreations
  const stableHostData = useMemo(() => {
    if (!selectedHost || !device) {
      console.log('[@hook:useAndroidMobile] No host or device selected');
      return null;
    }

    return {
      host_name: selectedHost.host_name,
      device_model: device.model,
      device_ip: device.device_ip,
      device_name: device.name,
      host_url: selectedHost.host_url,
      // Include other essential host properties but exclude volatile ones
      capabilities: selectedHost.capabilities,
      controller_configs: selectedHost.controller_configs,
      controller_types: selectedHost.controller_types,
      available_action_types: device.available_action_types,
      available_verification_types: device.available_verification_types,
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
        const response = await fetch('/server/remote/tap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host_name: stableHostData.host_name,
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
      const response = await fetch('/server/android/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_name: stableHostData.host_name,
          device_id: deviceId,
        }),
      });

      const result = await response.json();
      if (result.success && result.screenshot_path) {
        setAndroidScreenshot(result.screenshot_path);
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
      const response = await fetch('/server/android/elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_name: stableHostData.host_name,
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
      const response = await fetch('/server/android/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_name: stableHostData.host_name,
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

    // Setters
    setShowOverlay,
    setSelectedElement,
    setSelectedApp,
    setIsConnected,
    setIsDisconnecting,

    // Host and device data
    hostData: stableHostData,
    deviceData: device,
  };
}
