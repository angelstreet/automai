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
  MousePointer,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import {
  AdbKeyType,
  executeAdbKeyCommand,
  AndroidApp,
  AndroidElement,
  getInstalledApps,
  launchApp,
  dumpUIElements,
  clickElement,
} from '@/app/actions/adbActions';

interface RecAndroidPhoneRemoteProps {
  hostId: string;
  deviceId: string;
}

export function RecAndroidPhoneRemote({ hostId, deviceId }: RecAndroidPhoneRemoteProps) {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  // Handle key button press
  const handleKeyPress = async (key: AdbKeyType) => {
    if (isLoading) return;

    setIsLoading(true);
    setLastAction(`Sending ${key}...`);

    try {
      const result = await executeAdbKeyCommand(hostId, deviceId, key);

      if (result.success) {
        setLastAction(`Sent ${key}`);
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
  const handleLoadApps = async () => {
    if (isLoadingApps) return;

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
  };

  // Launch selected app
  const handleLaunchApp = async () => {
    if (!selectedApp || isLoading) return;

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

  // Dump UI elements
  const handleDumpElements = async () => {
    if (isDumpingElements) return;

    setIsDumpingElements(true);
    setElementsStatus('Dumping UI elements...');

    try {
      const result = await dumpUIElements(hostId, deviceId);

      if (result.success) {
        setElements(result.elements);
        setSelectedElement(null);
        setElementsStatus(`Found ${result.totalCount} elements`);
      } else {
        setElementsStatus(`Error: ${result.error}`);
      }
    } catch (error: any) {
      setElementsStatus(`Error: ${error.message}`);
    } finally {
      setIsDumpingElements(false);
    }
  };

  // Click on selected element
  const handleClickElement = async () => {
    if (!selectedElement || isClickingElement) return;

    setIsClickingElement(true);
    setLastAction(`Clicking element...`);

    try {
      const result = await clickElement(hostId, deviceId, selectedElement);

      if (result.success) {
        setLastAction(`Clicked element: ${selectedElement.text || selectedElement.resourceId}`);
      } else {
        setLastAction(`Error clicking element: ${result.error}`);
      }
    } catch (error: any) {
      setLastAction(`Error clicking element: ${error.message}`);
    } finally {
      setIsClickingElement(false);
    }
  };

  // Load apps on component mount
  useEffect(() => {
    handleLoadApps();
  }, [hostId, deviceId]);

  return (
    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-full max-w-xs">
      <h3 className="text-xs font-medium mb-2 text-center">📱 Android Phone Remote</h3>

      {/* Direction pad */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('UP')}
            disabled={isLoading}
            className="w-full p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Up"
          >
            <ArrowUp size={16} />
          </button>
        </div>
        <div className="col-start-1">
          <button
            onClick={() => handleKeyPress('LEFT')}
            disabled={isLoading}
            className="w-full p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Left"
          >
            <ArrowLeft size={16} />
          </button>
        </div>
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('SELECT')}
            disabled={isLoading}
            className="w-full p-1.5 bg-blue-600 text-white rounded flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
            aria-label="Select"
          >
            <span className="text-xs">OK</span>
          </button>
        </div>
        <div className="col-start-3">
          <button
            onClick={() => handleKeyPress('RIGHT')}
            disabled={isLoading}
            className="w-full p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Right"
          >
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('DOWN')}
            disabled={isLoading}
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
          disabled={isLoading}
          className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Back"
        >
          <CornerDownLeft size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('HOME')}
          disabled={isLoading}
          className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Home"
        >
          <Home size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('MENU')}
          disabled={isLoading}
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
          disabled={isLoading}
          className="p-1.5 bg-green-600 text-white rounded flex items-center justify-center hover:bg-green-700 disabled:opacity-50"
          aria-label="Camera"
        >
          <Camera size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('CALL')}
          disabled={isLoading}
          className="p-1.5 bg-green-600 text-white rounded flex items-center justify-center hover:bg-green-700 disabled:opacity-50"
          aria-label="Phone"
        >
          <Phone size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('ENDCALL')}
          disabled={isLoading}
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
          disabled={isLoading}
          className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Volume Down"
        >
          <Volume size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('VOLUME_MUTE')}
          disabled={isLoading}
          className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Volume Mute"
        >
          <Volume1 size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('VOLUME_UP')}
          disabled={isLoading}
          className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Volume Up"
        >
          <Volume2 size={14} />
        </button>
        <button
          onClick={() => handleKeyPress('POWER')}
          disabled={isLoading}
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
          App Launcher
        </h4>
        <div className="space-y-1">
          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
            disabled={isLoadingApps || isLoading}
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
              disabled={isLoadingApps || isLoading}
              className="p-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoadingApps ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={handleLaunchApp}
              disabled={!selectedApp || isLoading}
              className="p-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
            >
              Launch
            </button>
          </div>
          {/* App status within the app section */}
          {appStatus && (
            <div className="text-xs text-center text-gray-500 dark:text-gray-400 py-0.5">
              {appStatus}
            </div>
          )}
        </div>
      </div>

      {/* Separator between App Launcher and UI Elements */}
      <div className="border-t border-gray-300 dark:border-gray-600 my-3"></div>

      {/* Feature 2: UI Element Dump */}
      <div className="mb-3">
        <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
          <Search size={12} />
          UI Elements
        </h4>
        <button
          onClick={handleDumpElements}
          disabled={isDumpingElements || isLoading}
          className="w-full p-1.5 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 disabled:opacity-50 mb-1"
        >
          {isDumpingElements
            ? 'Dumping...'
            : `Dump Elements ${elements.length > 0 ? `(${elements.length})` : ''}`}
        </button>
        {/* Elements status within the elements section */}
        {elementsStatus && (
          <div className="text-xs text-center text-gray-500 dark:text-gray-400 py-0.5 mb-1">
            {elementsStatus}
          </div>
        )}
      </div>

      {/* Feature 3: Element Clicker */}
      {elements.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
            <MousePointer size={12} />
            Click Element
          </h4>
          <div className="space-y-1">
            <select
              value={selectedElement?.id || ''}
              onChange={(e) => {
                const elementId = parseInt(e.target.value);
                const element = elements.find((el) => el.id === elementId);
                setSelectedElement(element || null);
              }}
              disabled={isClickingElement || isLoading}
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
              onClick={handleClickElement}
              disabled={!selectedElement || isClickingElement || isLoading}
              className="w-full p-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:opacity-50"
            >
              {isClickingElement ? 'Clicking...' : 'Click Element'}
            </button>
            {selectedElement && (
              <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                <div className="truncate">
                  <strong>Tag:</strong> {selectedElement.tag}
                </div>
                {selectedElement.contentDesc !== '<no content-desc>' && (
                  <div className="truncate">
                    <strong>Desc:</strong> {selectedElement.contentDesc}
                  </div>
                )}
                {selectedElement.text !== '<no text>' && (
                  <div className="truncate">
                    <strong>Text:</strong> {selectedElement.text}
                  </div>
                )}
                {selectedElement.resourceId !== '<no resource-id>' && (
                  <div className="truncate">
                    <strong>ID:</strong> {selectedElement.resourceId}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last action status */}
      {lastAction && (
        <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          {lastAction}
        </div>
      )}
    </div>
  );
}
