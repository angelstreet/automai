import { useState, useCallback, useEffect } from 'react';
import { AppiumElement, AppiumApp, AppiumSession } from '../../types/controller/Remote_Types';
import { Host } from '../../types/common/Host_Types';
import { appiumRemoteConfig } from '../../config/remote/appiumRemote';

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

export const useAppiumRemote = (host: Host): UseAppiumRemoteReturn => {
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

  // Session state
  const [session, setSession] = useState<AppiumSession>({
    connected: false,
    connectionInfo: '',
    deviceInfo: undefined,
    appiumConnected: false,
    sessionId: undefined,
  });

  console.log('[@hook:useAppiumRemote] Hook initialized for host:', host?.host_name);

  // Auto-connect when component mounts
  useEffect(() => {
    if (!session.connected && !session.connectionInfo?.includes('connecting')) {
      handleConnect();
    }
  }, [host]);

  const handleConnect = useCallback(async () => {
    try {
      console.log('[@hook:useAppiumRemote] Attempting to connect to Appium device');

      setSession((prev) => ({
        ...prev,
        connectionInfo: 'Connecting to Appium device...',
        connected: false,
      }));

      // Build connection parameters from host configuration
      const connectionParams = {
        host: host,
        device_udid: host.device_udid || '',
        platform_name: host.platform_name || 'Android',
        platform_version: host.platform_version || '',
        appium_url: host.appium_url || 'http://localhost:4723',
        automation_name: host.automation_name || '',
        app_package: host.app_package || '',
        app_activity: host.app_activity || '',
        bundle_id: host.bundle_id || '',
      };

      console.log('[@hook:useAppiumRemote] Connection params:', connectionParams);

      // Call server endpoint to establish Appium connection
      const response = await fetch('/server/control/take-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionParams),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[@hook:useAppiumRemote] Successfully connected to Appium device');

        setSession({
          connected: true,
          connectionInfo: 'Connected',
          deviceInfo: {
            platform: result.platform || connectionParams.platform_name,
            platformVersion: result.platformVersion || connectionParams.platform_version,
            deviceName: result.deviceName || host.host_name,
            udid: result.udid || connectionParams.device_udid,
            automationName: result.automationName || connectionParams.automation_name,
          },
          appiumConnected: true,
          sessionId: result.sessionId,
        });

        // Set detected platform
        setDetectedPlatform(result.platform || connectionParams.platform_name.toLowerCase());

        // Auto-load apps for supported platforms
        if (
          ['ios', 'android'].includes(
            (result.platform || connectionParams.platform_name).toLowerCase(),
          )
        ) {
          await handleGetApps();
        }
      } else {
        console.error('[@hook:useAppiumRemote] Connection failed:', result.error);
        setSession((prev) => ({
          ...prev,
          connectionInfo: `Connection failed: ${result.error}`,
          connected: false,
        }));
      }
    } catch (error) {
      console.error('[@hook:useAppiumRemote] Connection error:', error);
      setSession((prev) => ({
        ...prev,
        connectionInfo: `Connection error: ${error}`,
        connected: false,
      }));
    }
  }, [host]);

  const handleDisconnect = useCallback(async () => {
    try {
      console.log('[@hook:useAppiumRemote] Disconnecting from Appium device');
      setIsDisconnecting(true);

      const response = await fetch('/server/control/release-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ host: host }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[@hook:useAppiumRemote] Successfully disconnected');
        setSession({
          connected: false,
          connectionInfo: '',
          deviceInfo: undefined,
          appiumConnected: false,
          sessionId: undefined,
        });

        // Clear state
        setAppiumElements([]);
        setAppiumApps([]);
        setSelectedElement('');
        setSelectedApp('');
        setDetectedPlatform(null);
      } else {
        console.error('[@hook:useAppiumRemote] Disconnect failed:', result.error);
      }
    } catch (error) {
      console.error('[@hook:useAppiumRemote] Disconnect error:', error);
    } finally {
      setIsDisconnecting(false);
    }
  }, [host]);

  const handleRemoteCommand = useCallback(
    async (command: string, params: any = {}) => {
      if (!session.connected) {
        console.warn('[@hook:useAppiumRemote] Cannot execute command - not connected');
        return;
      }

      try {
        console.log(`[@hook:useAppiumRemote] Executing command: ${command}`, params);

        const response = await fetch('/server/remote/execute-command', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: host,
            command: command,
            params: params,
          }),
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
    [host, session.connected],
  );

  const handleDumpUIWithLoading = useCallback(async () => {
    if (!session.connected) {
      console.warn('[@hook:useAppiumRemote] Cannot dump UI - not connected');
      return;
    }

    try {
      console.log('[@hook:useAppiumRemote] Dumping UI elements with loading state');
      setIsDumpingUI(true);

      const response = await fetch('/server/remote/screenshot-and-dump', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ host: host }),
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
  }, [host, session.connected]);

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

        const response = await fetch('/server/remote/click-element', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: host,
            element: element,
          }),
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
    [host, session.connected, handleDumpUIWithLoading],
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
