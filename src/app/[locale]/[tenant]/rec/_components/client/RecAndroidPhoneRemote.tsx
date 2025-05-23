'use client';

import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CornerDownLeft,
  Home,
  Menu,
  Volume,
  Volume1,
  Volume2,
  Power,
  RotateCcw,
  Camera,
  Phone,
  Smartphone,
  Search,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

import {
  AdbKeyType,
  executeAdbKeyCommand,
  AndroidApp,
  AndroidElement,
  getInstalledApps,
  launchApp,
  dumpUIElements,
  clickElement,
  connectToHost,
  disconnectFromHost,
  getDeviceResolution,
} from '@/app/actions/adbActions';

interface RecAndroidPhoneRemoteProps {
  hostId: string;
  deviceId: string;
  onElementsUpdate?: (
    elements: AndroidElement[],
    deviceWidth: number,
    deviceHeight: number,
  ) => void;
  onOverlayToggle?: (visible: boolean) => void;
  onElementClickHandler?: (clickHandler: (element: AndroidElement) => void) => void;
}

export function RecAndroidPhoneRemote({
  hostId,
  deviceId,
  onElementsUpdate,
  onOverlayToggle,
  onElementClickHandler,
}: RecAndroidPhoneRemoteProps) {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // New state for the 3 features
  const [apps, setApps] = useState<AndroidApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [appStatus, setAppStatus] = useState<string>('');

  const [elements, setElements] = useState<AndroidElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<AndroidElement | null>(null);
  const [isDumpingElements, setIsDumpingElements] = useState(false);
  const [isClickingElement, setIsClickingElement] = useState(false);
  const [elementsStatus, setElementsStatus] = useState<string>('');
  const [_deviceResolution, setDeviceResolution] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isAutoDumpScheduled, setIsAutoDumpScheduled] = useState(false);

  // Auto-dump timer ref
  const autoDumpTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dump UI elements (not wrapped in useCallback to avoid circular deps)
  const handleDumpElements = async () => {
    if (isDumpingElements || isConnecting) return;

    setIsDumpingElements(true);
    setElementsStatus('Dumping UI elements...');

    try {
      // Get device resolution first
      const resolutionResult = await getDeviceResolution(hostId, deviceId);
      if (!resolutionResult.success || !resolutionResult.width || !resolutionResult.height) {
        setElementsStatus(`Error getting resolution: ${resolutionResult.error}`);
        return;
      }

      setDeviceResolution({ width: resolutionResult.width, height: resolutionResult.height });

      // Then dump UI elements
      const result = await dumpUIElements(hostId, deviceId);

      if (result.success) {
        setElements(result.elements);
        setSelectedElement(null);
        setElementsStatus(`Found ${result.totalCount} elements`);
        setShowOverlay(true);

        // Notify parent component
        onElementsUpdate?.(result.elements, resolutionResult.width, resolutionResult.height);
        onOverlayToggle?.(true);

        // Pass click handler to parent when overlay is shown
        if (onElementClickHandler) {
          onElementClickHandler(handleOverlayElementClick);
        }
      } else {
        setElementsStatus(`Error: ${result.error}`);
      }
    } catch (error: any) {
      setElementsStatus(`Error: ${error.message}`);
    } finally {
      setIsDumpingElements(false);
    }
  };

  // Auto-dump function that triggers after UI interactions
  const scheduleAutoDump = () => {
    // Only auto-dump if overlay is currently visible (user is actively inspecting UI)
    if (!showOverlay) return;

    // Clear any existing timer
    if (autoDumpTimerRef.current) {
      clearTimeout(autoDumpTimerRef.current);
    }

    setIsAutoDumpScheduled(true);

    // Schedule new dump after 2 seconds
    autoDumpTimerRef.current = setTimeout(() => {
      console.log('[@component:RecAndroidPhoneRemote] Auto-dumping UI elements after action');
      setIsAutoDumpScheduled(false);
      handleDumpElements();
    }, 2000);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoDumpTimerRef.current) {
        clearTimeout(autoDumpTimerRef.current);
      }
    };
  }, []);

  // Handle key button press
  const handleKeyPress = async (key: AdbKeyType) => {
    if (isLoading || isConnecting) return;

    setIsLoading(true);
    setLastAction(`Sending ${key}...`);

    try {
      const result = await executeAdbKeyCommand(hostId, deviceId, key);

      if (result.success) {
        setLastAction(`Sent ${key}`);
        // Schedule auto-dump after successful key press
        scheduleAutoDump();
      } else {
        setLastAction(`Error: ${result.error}`);
      }
    } catch (error: any) {
      setLastAction(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load installed apps
  const handleLoadApps = useCallback(async () => {
    if (isLoadingApps || isConnecting) return;

    setIsLoadingApps(true);
    setAppStatus('Loading apps...');

    try {
      const result = await getInstalledApps(hostId, deviceId);

      if (result.success && result.apps) {
        setApps(result.apps);
        setAppStatus(`Found ${result.apps.length} apps`);
      } else {
        setAppStatus(`Error: ${result.error}`);
      }
    } catch (error: any) {
      setAppStatus(`Error: ${error.message}`);
    } finally {
      setIsLoadingApps(false);
    }
  }, [hostId, deviceId, isLoadingApps, isConnecting]);

  // Launch selected app
  const handleLaunchApp = async () => {
    if (!selectedApp || isLoading || isConnecting) return;

    setIsLoading(true);
    setLastAction(`Launching ${selectedApp}...`);

    try {
      const result = await launchApp(hostId, deviceId, selectedApp);

      if (result.success) {
        setLastAction(`Launched ${selectedApp}`);
      } else {
        setLastAction(`Error launching app: ${result.error}`);
      }
    } catch (error: any) {
      setLastAction(`Error launching app: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Click on any element (for overlay clicks)
  const handleElementClick = async (element: AndroidElement) => {
    if (isClickingElement || isConnecting) return;

    setIsClickingElement(true);
    setLastAction(`Clicking element...`);

    try {
      const result = await clickElement(hostId, deviceId, element);

      if (result.success) {
        setLastAction(
          `Clicked element: ${element.text || element.resourceId || element.contentDesc}`,
        );
        // Update selected element in UI for visual feedback
        setSelectedElement(element);
        // Schedule auto-dump after successful element click
        scheduleAutoDump();
      } else {
        setLastAction(`Error clicking element: ${result.error}`);
      }
    } catch (error: any) {
      setLastAction(`Error clicking element: ${error.message}`);
    } finally {
      setIsClickingElement(false);
    }
  };

  // Click on selected element (for dropdown selection)
  const handleClickSelectedElement = async () => {
    if (!selectedElement) return;
    await handleElementClick(selectedElement);
  };

  // Handle element click from overlay
  const handleOverlayElementClick = (element: AndroidElement) => {
    console.log(
      `[@component:RecAndroidPhoneRemote] Received overlay click for element ID ${element.id}`,
    );
    handleElementClick(element);
  };

  // Clear overlay
  const handleClearOverlay = () => {
    // Cancel any pending auto-dump
    if (autoDumpTimerRef.current) {
      clearTimeout(autoDumpTimerRef.current);
      autoDumpTimerRef.current = null;
      setIsAutoDumpScheduled(false);
    }

    setShowOverlay(false);
    onOverlayToggle?.(false);
  };

  // Establish SSH + ADB connection on mount
  useEffect(() => {
    const establishConnection = async () => {
      setIsConnecting(true);
      setConnectionError(null);
      setLastAction('Connecting to device...');

      try {
        const result = await connectToHost(hostId, deviceId);
        if (result.success) {
          setLastAction('Connected successfully');
          setConnectionError(null);
          // Don't auto-load apps - only when user clicks refresh
        } else {
          setConnectionError(result.error || 'Failed to connect');
          setLastAction(`Connection failed: ${result.error}`);
        }
      } catch (error: any) {
        setConnectionError(error.message);
        setLastAction(`Connection error: ${error.message}`);
      } finally {
        setIsConnecting(false);
      }
    };

    establishConnection();

    // Cleanup: disconnect when component unmounts
    return () => {
      disconnectFromHost(hostId).catch((err) => {
        console.error('Failed to disconnect on unmount:', err);
      });
    };
  }, [hostId, deviceId]);

  return (
    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-full max-w-xs overflow-hidden">
      <h3 className="text-xs font-medium mb-2 text-center">📱 Android Phone Remote</h3>

      {/* Connection status */}
      {connectionError && (
        <div className="mb-2 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs text-center">
          {connectionError}
        </div>
      )}

      {/* Direction pad */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('UP')}
            disabled={isLoading || isConnecting}
            className="w-full p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Up"
          >
            <ArrowUp size={16} />
          </button>
        </div>
        <div className="col-start-1">
          <button
            onClick={() => handleKeyPress('LEFT')}
            disabled={isLoading || isConnecting}
            className="w-full p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Left"
          >
            <ArrowLeft size={16} />
          </button>
        </div>
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('SELECT')}
            disabled={isLoading || isConnecting}
            className="w-full p-1.5 bg-blue-600 text-white rounded flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
            aria-label="Select"
          >
            <span className="text-xs">OK</span>
          </button>
        </div>
        <div className="col-start-3">
          <button
            onClick={() => handleKeyPress('RIGHT')}
            disabled={isLoading || isConnecting}
            className="w-full p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Right"
          >
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('DOWN')}
            disabled={isLoading || isConnecting}
            className="w-full p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Down"
          >
            <ArrowDown size={16} />
          </button>
        </div>
      </div>

      {/* Phone-specific buttons */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        <button
          onClick={() => handleKeyPress('BACK')}
          disabled={isLoading || isConnecting}
          className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Back"
        >
          <CornerDownLeft size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('HOME')}
          disabled={isLoading || isConnecting}
          className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Home"
        >
          <Home size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('MENU')}
          disabled={isLoading || isConnecting}
          className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Menu"
        >
          <Menu size={14} />
        </button>
      </div>

      {/* Phone app shortcuts */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        <button
          onClick={() => handleKeyPress('CAMERA')}
          disabled={isLoading || isConnecting}
          className="p-1.5 bg-green-600 text-white rounded flex items-center justify-center hover:bg-green-700 disabled:opacity-50"
          aria-label="Camera"
        >
          <Camera size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('CALL')}
          disabled={isLoading || isConnecting}
          className="p-1.5 bg-green-600 text-white rounded flex items-center justify-center hover:bg-green-700 disabled:opacity-50"
          aria-label="Phone"
        >
          <Phone size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('ENDCALL')}
          disabled={isLoading || isConnecting}
          className="p-1.5 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700 disabled:opacity-50"
          aria-label="End Call"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Volume and power buttons */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        <button
          onClick={() => handleKeyPress('VOLUME_DOWN')}
          disabled={isLoading || isConnecting}
          className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Volume Down"
        >
          <Volume size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('VOLUME_MUTE')}
          disabled={isLoading || isConnecting}
          className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Volume Mute"
        >
          <Volume1 size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('VOLUME_UP')}
          disabled={isLoading || isConnecting}
          className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Volume Up"
        >
          <Volume2 size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('POWER')}
          disabled={isLoading || isConnecting}
          className="p-1.5 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
          aria-label="Power"
        >
          <Power size={14} />
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-300 dark:border-gray-600 my-3"></div>

      {/* Feature 1: App Launcher */}
      <div className="mb-3">
        <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
          <Smartphone size={12} />
          App Launcher {apps.length > 0 && `(${apps.length})`}
        </h4>
        <div className="space-y-1">
          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
            disabled={isLoadingApps || isLoading || isConnecting}
            className="w-full p-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
          >
            <option value="">Select an app...</option>
            {apps.map((app) => (
              <option key={app.packageName} value={app.packageName}>
                {app.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={handleLoadApps}
              disabled={isLoadingApps || isLoading || isConnecting}
              className="p-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoadingApps ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={handleLaunchApp}
              disabled={!selectedApp || isLoading || isConnecting}
              className="p-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
            >
              Launch
            </button>
          </div>
          {/* Only show loading/error status, not success count */}
          {appStatus && !appStatus.startsWith('Found') && (
            <div className="text-xs text-center text-gray-500 dark:text-gray-400 py-0.5">
              {appStatus}
            </div>
          )}
        </div>
      </div>

      {/* Separator between App Launcher and UI Elements */}
      <div className="border-t border-gray-300 dark:border-gray-600 my-3"></div>

      {/* Feature 2: UI Element Dump & Click */}
      <div className="mb-3">
        <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
          <Search size={12} />
          UI Elements {elements.length > 0 && `(${elements.length})`}
        </h4>
        <div className="grid grid-cols-2 gap-1 mb-1">
          <button
            onClick={handleDumpElements}
            disabled={isDumpingElements || isLoading || isConnecting}
            className="p-1.5 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 disabled:opacity-50"
          >
            {isDumpingElements ? 'Dumping...' : 'Dump'}
          </button>
          <button
            onClick={handleClearOverlay}
            disabled={!showOverlay || isLoading || isConnecting}
            className="p-1.5 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
        {/* Only show loading/error status, not success count */}
        {elementsStatus && !elementsStatus.startsWith('Found') && (
          <div className="text-xs text-center text-gray-500 dark:text-gray-400 py-0.5 mb-1">
            {elementsStatus}
          </div>
        )}
        {/* Auto-dump status */}
        {isAutoDumpScheduled && (
          <div className="text-xs text-center text-blue-500 dark:text-blue-400 py-0.5 mb-1">
            Auto-dump in 1.5s...
          </div>
        )}
        {/* Click element dropdown - only show when elements exist */}
        {elements.length > 0 && (
          <div className="space-y-1">
            <select
              value={selectedElement?.id || ''}
              onChange={(e) => {
                const elementId = parseInt(e.target.value);
                const element = elements.find((el) => el.id === elementId);
                setSelectedElement(element || null);
              }}
              disabled={isClickingElement || isLoading || isConnecting}
              className="w-full p-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
            >
              <option value="">Select element to click...</option>
              {elements.map((element) => {
                // Get the most meaningful identifier for display
                const getElementDisplayName = (el: AndroidElement) => {
                  // Priority: content-desc > text > resource-id > class
                  if (el.contentDesc && el.contentDesc !== '<no content-desc>') {
                    return `${el.contentDesc}`;
                  }
                  if (el.text && el.text !== '<no text>') {
                    return `"${el.text}"`;
                  }
                  if (el.resourceId && el.resourceId !== '<no resource-id>') {
                    return `ID: ${el.resourceId}`;
                  }
                  return `${el.tag}`;
                };

                return (
                  <option key={element.id} value={element.id}>
                    #{element.id}: {getElementDisplayName(element)}
                  </option>
                );
              })}
            </select>
            <button
              onClick={handleClickSelectedElement}
              disabled={!selectedElement || isClickingElement || isLoading || isConnecting}
              className="w-full p-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:opacity-50"
            >
              {isClickingElement ? 'Clicking...' : 'Click Element'}
            </button>
          </div>
        )}
      </div>

      {/* Last action status */}
      {lastAction && (
        <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          {lastAction}
        </div>
      )}
    </div>
  );
}
