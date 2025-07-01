import { useState, useCallback, useEffect } from 'react';

import { appiumRemoteConfig } from '../../config/remote/appiumRemote';
import { Host } from '../../types/common/Host_Types';
import { AppiumElement, AppiumApp, AppiumSession } from '../../types/controller/Remote_Types';

interface UseAppiumRemoteReturn {
  // State
  appiumElements: AppiumElement[];
  appiumApps: AppiumApp[];
  showOverlay: boolean;
  selectedElement: string;
  selectedApp: string;
  isDumpingUI: boolean;
  isDisconnecting: boolean;
  isRefreshingApps: boolean;
  detectedPlatform: string | null;

  // Actions
  handleDisconnect: () => Promise<void>;
  handleOverlayElementClick: (element: AppiumElement) => void;
  handleRemoteCommand: (command: string, params?: any) => Promise<void>;
  clearElements: () => void;
  handleGetApps: () => Promise<void>;
  handleDumpUIWithLoading: () => Promise<void>;

  // Setters
  setSelectedElement: (elementId: string) => void;
  setSelectedApp: (appIdentifier: string) => void;
  setShowOverlay: (show: boolean) => void;

  // Configuration
  layoutConfig: typeof appiumRemoteConfig;

  // Session info
  session: AppiumSession;
}

export const useAppiumRemote = (host: Host, deviceId?: string): UseAppiumRemoteReturn => {
  // State management
  const [appiumElements, setAppiumElements] = useState<AppiumElement[]>([]);
  const [appiumApps, setAppiumApps] = useState<AppiumApp[]>([]);
  const [showOverlay, setShowOverlay] = useState(true);
  const [selectedElement, setSelectedElement] = useState('');
  const [selectedApp, setSelectedApp] = useState('');
  const [isDumpingUI, setIsDumpingUI] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshingApps, setIsRefreshingApps] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);

  // Session state - internal connection management
  const [session, setSession] = useState<AppiumSession>({
    connected: false,
    connectionInfo: '',
    deviceInfo: undefined,
    appiumConnected: false,
    sessionId: undefined,
  });

  console.log(
    '[@hook:useAppiumRemote] Hook initialized for host:',
    host?.host_name,
    'deviceId:',
    deviceId,
  );

  const handleDisconnect = useCallback(async () => {
    console.log(
      '[@hook:useAppiumRemote] Remote disconnect requested - this should be handled by parent component',
    );
    // Don't actually disconnect here - let the parent component handle it
    // Just clear local state
    setAppiumElements([]);
    setAppiumApps([]);
    setSelectedElement('');
    setSelectedApp('');
  }, []);

  const handleRemoteCommand = useCallback(
    async (command: string, params: any = {}) => {
      if (!session.connected) {
        console.warn('[@hook:useAppiumRemote] Cannot execute command - not connected');
        return;
      }

      try {
        console.log(`[@hook:useAppiumRemote] Executing command: ${command}`, params);

        const requestBody: any = {
          host: host,
          command: command,
          params: params,
        };

        if (deviceId) {
          requestBody.device_id = deviceId;
        }

        const response = await fetch('/server/remote/executeCommand', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (result.success) {
          console.log(`[@hook:useAppiumRemote] Command ${command} executed successfully`);
        } else {
          console.error(`[@hook:useAppiumRemote] Command ${command} failed:`, result.error);
        }
      } catch (error) {
        console.error(`[@hook:useAppiumRemote] Command ${command} error:`, error);
      }
    },
    [host, deviceId, session.connected],
  );

  const handleDumpUIWithLoading = useCallback(async () => {
    if (!session.connected) {
      console.warn('[@hook:useAppiumRemote] Cannot dump UI - not connected');
      return;
    }

    try {
      console.log('[@hook:useAppiumRemote] Dumping UI elements with loading state');
      setIsDumpingUI(true);

      const requestBody: any = {
        host: host,
      };

      if (deviceId) {
        requestBody.device_id = deviceId;
      }

      const response = await fetch('/server/remote/screenshotAndDump', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success && result.elements) {
        console.log(
          `[@hook:useAppiumRemote] Successfully dumped ${result.elements.length} UI elements`,
        );
        setAppiumElements(result.elements);
        setShowOverlay(true);
      } else {
        console.error('[@hook:useAppiumRemote] UI dump failed:', result.error);
        setAppiumElements([]);
      }
    } catch (error) {
      console.error('[@hook:useAppiumRemote] UI dump error:', error);
      setAppiumElements([]);
    } finally {
      setIsDumpingUI(false);
    }
  }, [host, deviceId, session.connected]);

  const handleGetApps = useCallback(async () => {
    if (!session.connected) {
      console.warn('[@hook:useAppiumRemote] Cannot get apps - not connected');
      return;
    }

    try {
      console.log('[@hook:useAppiumRemote] Getting installed apps');
      setIsRefreshingApps(true);

      // For now, use platform-specific common apps from config
      // In a real implementation, this would call the server to get actual installed apps
      const platformConfig = appiumRemoteConfig.deviceCapabilities[detectedPlatform || 'android'];
      if (platformConfig) {
        const apps: AppiumApp[] = platformConfig.commonApps.map((app) => ({
          identifier: app.identifier,
          label: app.label,
          version: '',
          platform: detectedPlatform || 'unknown',
        }));

        console.log(
          `[@hook:useAppiumRemote] Loaded ${apps.length} common apps for ${detectedPlatform}`,
        );
        setAppiumApps(apps);
      } else {
        console.warn(
          `[@hook:useAppiumRemote] No app configuration found for platform: ${detectedPlatform}`,
        );
        setAppiumApps([]);
      }
    } catch (error) {
      console.error('[@hook:useAppiumRemote] Get apps error:', error);
      setAppiumApps([]);
    } finally {
      setIsRefreshingApps(false);
    }
  }, [host, session.connected, detectedPlatform]);

  const handleOverlayElementClick = useCallback(
    async (element: AppiumElement) => {
      if (!session.connected) {
        console.warn('[@hook:useAppiumRemote] Cannot click element - not connected');
        return;
      }

      try {
        console.log(`[@hook:useAppiumRemote] Clicking overlay element: ${element.id}`);

        const requestBody: any = {
          host: host,
          command: 'click_element',
          params: {
            element_id: element.id,
          },
        };

        if (deviceId) {
          requestBody.device_id = deviceId;
        }

        const response = await fetch('/server/remote/executeCommand', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (result.success) {
          console.log('[@hook:useAppiumRemote] Element click successful');
          // Optionally refresh UI elements after click
          setTimeout(() => {
            handleDumpUIWithLoading();
          }, 1000);
        } else {
          console.error('[@hook:useAppiumRemote] Element click failed:', result.error);
        }
      } catch (error) {
        console.error('[@hook:useAppiumRemote] Element click error:', error);
      }
    },
    [host, deviceId, session.connected, handleDumpUIWithLoading],
  );

  const clearElements = useCallback(() => {
    console.log('[@hook:useAppiumRemote] Clearing UI elements');
    setAppiumElements([]);
    setSelectedElement('');
    setShowOverlay(false);
  }, []);

  return {
    // State
    appiumElements,
    appiumApps,
    showOverlay,
    selectedElement,
    selectedApp,
    isDumpingUI,
    isDisconnecting,
    isRefreshingApps,
    detectedPlatform,

    // Actions
    handleDisconnect,
    handleOverlayElementClick,
    handleRemoteCommand,
    clearElements,
    handleGetApps,
    handleDumpUIWithLoading,

    // Setters
    setSelectedElement,
    setSelectedApp,
    setShowOverlay,

    // Configuration
    layoutConfig: appiumRemoteConfig,

    // Session info
    session,
  };
};
