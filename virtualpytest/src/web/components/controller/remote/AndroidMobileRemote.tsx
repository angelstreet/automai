import { Box, Alert } from '@mui/material';
import { useState, useRef, useEffect, useCallback } from 'react';

import { AndroidElement, AndroidApp } from '../../../types/controller/Remote_Types';

import { AndroidMobileControls } from './AndroidMobileControls';
import { AndroidMobileOverlay } from './AndroidMobileOverlay';

// Configuration will be loaded from useAndroidMobileConfig hook

interface Host {
  host_name: string;
  device_name: string;
  device_model: string;
}

interface AndroidMobileRemoteProps {
  /** Host device to control */
  host: Host;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Callback when connection state changes */
  onConnectionChange?: (connected: boolean) => void;
  /** Callback when disconnect is complete */
  onDisconnectComplete?: () => void;
  /** Custom styling */
  sx?: any;
}

export function AndroidMobileRemote({
  host,
  autoConnect = false,
  onConnectionChange,
  onDisconnectComplete,
  sx = {},
}: AndroidMobileRemoteProps) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Screenshot and UI state
  const [androidScreenshot, setAndroidScreenshot] = useState<string | null>(null);
  const [androidElements, setAndroidElements] = useState<AndroidElement[]>([]);
  const [androidApps, setAndroidApps] = useState<AndroidApp[]>([]);

  // UI state
  const [isDumpingUI, setIsDumpingUI] = useState(false);
  const [dumpError, setDumpError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState('');
  const [selectedElement, setSelectedElement] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [deviceResolution, setDeviceResolution] = useState({ width: 1080, height: 2340 });

  // Auto-dump functionality
  const autoDumpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const screenshotRef = useRef<HTMLImageElement>(null);

  // Load Android Mobile configuration
  const { layoutConfig, loading: configLoading, error: configError } = useAndroidMobileConfig();

  // Early return if configuration is loading or has error
  if (configLoading) {
    return (
      <Box sx={{ ...sx, p: 2, display: 'flex', justifyContent: 'center' }}>
        <Alert severity="info">Loading Android Mobile configuration...</Alert>
      </Box>
    );
  }

  if (configError || !layoutConfig) {
    return (
      <Box sx={{ ...sx, p: 2 }}>
        <Alert severity="error">
          Failed to load Android Mobile configuration:{' '}
          {configError || 'Configuration not available'}
        </Alert>
      </Box>
    );
  }

  // Connection handlers using direct server routes
  const handleConnect = useCallback(async () => {
    if (!host) {
      setConnectionError('No host provided');
      return;
    }

    setConnectionLoading(true);
    setConnectionError(null);

    try {
      console.log(`[@component:AndroidMobileRemote] Connecting to host: ${host.host_name}`);

      // Control is already taken by navigation editor, just set connected state
      setIsConnected(true);
      setConnectionError(null);
      console.log(`[@component:AndroidMobileRemote] Successfully connected to ${host.device_name}`);

      if (onConnectionChange) {
        onConnectionChange(true);
      }
    } catch (error: any) {
      console.error('[@component:AndroidMobileRemote] Connection failed:', error);
      setConnectionError(error.message || 'Connection failed');
      setIsConnected(false);

      if (onConnectionChange) {
        onConnectionChange(false);
      }
    } finally {
      setConnectionLoading(false);
    }
  }, [host, onConnectionChange]);

  // Auto-connect on mount if requested
  useEffect(() => {
    if (autoConnect && host && !isConnected) {
      handleConnect();
    }
  }, [autoConnect, host, isConnected, handleConnect]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoDumpTimerRef.current) {
        clearTimeout(autoDumpTimerRef.current);
      }
    };
  }, []);

  const handleDisconnect = async () => {
    try {
      console.log(`[@component:AndroidMobileRemote] Disconnecting from ${host.host_name}`);

      // Clear overlay and timers
      if (autoDumpTimerRef.current) {
        clearTimeout(autoDumpTimerRef.current);
        autoDumpTimerRef.current = null;
      }

      // Reset all state
      setShowOverlay(false);
      setDumpError(null);
      setAndroidScreenshot(null);
      setAndroidElements([]);
      setAndroidApps([]);
      setIsConnected(false);

      console.log(`[@component:AndroidMobileRemote] Disconnected from ${host.device_name}`);

      if (onConnectionChange) {
        onConnectionChange(false);
      }

      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    } catch (error) {
      console.error('[@component:AndroidMobileRemote] Error during disconnect:', error);

      // Still reset state and call callbacks even if there's an error
      setIsConnected(false);
      if (onConnectionChange) {
        onConnectionChange(false);
      }
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    }
  };

  // Screenshot + UI dump handler using server route
  const handleScreenshotAndDumpUI = async () => {
    if (!host) {
      throw new Error('No host provided for screenshot and dump');
    }

    try {
      console.log(
        `[@component:AndroidMobileRemote] Taking screenshot and dumping UI for ${host.host_name}`,
      );

      const response = await fetch(`/server/remote/screenshot-and-dump`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: host.host_name,
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.screenshot) {
          setAndroidScreenshot(result.screenshot);
        }
        if (result.elements) {
          setAndroidElements(result.elements);
        }
        console.log(
          `[@component:AndroidMobileRemote] Screenshot and UI dump completed, elements found: ${result.elements?.length || 0}`,
        );
      } else {
        throw new Error(result.error || 'Screenshot and dump failed');
      }
    } catch (error: any) {
      console.error('[@component:AndroidMobileRemote] Screenshot and dump error:', error);
      throw error;
    }
  };

  // Get apps handler using server route
  const handleGetApps = async () => {
    if (!host) {
      throw new Error('No host provided for getting apps');
    }

    try {
      console.log(`[@component:AndroidMobileRemote] Getting apps for ${host.host_name}`);

      const response = await fetch(`/server/remote/get-apps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: host.host_name,
        }),
      });

      const result = await response.json();

      if (result.success && result.apps) {
        setAndroidApps(result.apps);
        console.log(`[@component:AndroidMobileRemote] Found ${result.apps.length} apps`);
      } else {
        throw new Error(result.error || 'Failed to get apps');
      }
    } catch (error: any) {
      console.error('[@component:AndroidMobileRemote] Get apps error:', error);
      throw error;
    }
  };

  // Click element handler using server route
  const handleClickElement = async (element: AndroidElement) => {
    if (!host) {
      throw new Error('No host provided for element click');
    }

    try {
      console.log(
        `[@component:AndroidMobileRemote] Clicking element ${element.id} for ${host.host_name}`,
      );

      const response = await fetch(`/server/remote/click-element`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: host.host_name,
          elementId: element.id.toString(),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Element click failed');
      }

      console.log(`[@component:AndroidMobileRemote] Element ${element.id} clicked successfully`);
    } catch (error: any) {
      console.error('[@component:AndroidMobileRemote] Element click error:', error);
      throw error;
    }
  };

  // Remote command handler using server route
  const handleRemoteCommand = async (command: string) => {
    if (!host) {
      throw new Error('No host provided for remote command');
    }

    try {
      console.log(
        `[@component:AndroidMobileRemote] Executing remote command for ${host.host_name}: ${command}`,
      );

      const response = await fetch(`/server/remote/execute-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: host.host_name,
          command: command,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Remote command failed');
      }

      console.log(`[@component:AndroidMobileRemote] Remote command executed successfully`);
    } catch (error: any) {
      console.error('[@component:AndroidMobileRemote] Remote command error:', error);
      throw error;
    }
  };

  // Auto-dump function that triggers after UI interactions
  const scheduleAutoDump = () => {
    if (!showOverlay) return;

    if (autoDumpTimerRef.current) {
      clearTimeout(autoDumpTimerRef.current);
    }

    autoDumpTimerRef.current = setTimeout(() => {
      console.log('[@component:AndroidMobileRemote] Auto-dumping UI elements after action');
      handleDumpUIWithLoading();
    }, layoutConfig?.autoDumpDelay || 1200);
  };

  // Enhanced dump UI handler with loading state
  const handleDumpUIWithLoading = async () => {
    setIsDumpingUI(true);
    setDumpError(null);
    try {
      await handleScreenshotAndDumpUI();
      console.log(
        '[@component:AndroidMobileRemote] Screenshot and UI dump completed, elements found:',
        androidElements.length,
      );
      setShowOverlay(true);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to take screenshot and dump UI';
      setDumpError(errorMessage);
      console.error('[@component:AndroidMobileRemote] Screenshot and UI dump failed:', error);
    } finally {
      setIsDumpingUI(false);
    }
  };

  // Handle element click from overlay
  const handleOverlayElementClick = async (element: AndroidElement) => {
    console.log(
      `[@component:AndroidMobileRemote] Received overlay click for element ID ${element.id}`,
    );

    try {
      await handleClickElement(element);
      setSelectedElement(element.id.toString());
      scheduleAutoDump();
    } catch (error: any) {
      console.error('[@component:AndroidMobileRemote] Element click failed:', error);
      setDumpError(`Element click failed: ${error.message}`);
    }
  };

  // Create a function to only hide the overlay without clearing elements
  const handleClearOverlay = () => {
    console.log(
      '[@component:AndroidMobileRemote] Clearing overlay only, preserving element selection',
    );
    setShowOverlay(false);
    // Note: We're NOT calling clearElements() here so the dropdown selection is preserved
  };

  // Update device resolution when screenshot is available
  useEffect(() => {
    if (androidScreenshot && screenshotRef.current && layoutConfig) {
      setDeviceResolution(layoutConfig.deviceResolution);
    }
  }, [androidScreenshot, layoutConfig]);

  // Early return if no host provided
  if (!host) {
    return (
      <Box sx={{ ...sx, p: 2 }}>
        <Alert severity="error">No host device provided. Please select a host to control.</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        ...sx,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Box
        sx={{
          p: 2,
          flex: 1,
          overflow: 'auto',
          // Compact-specific styling - maxWidth and centered
          maxWidth: `${layoutConfig.containerWidth}px`,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <AndroidMobileControls
          session={{
            connected: isConnected,
            device_ip: host.host_name,
            connectionInfo: `Connected to ${host.device_name}`,
          }}
          connectionLoading={connectionLoading}
          connectionError={connectionError}
          dumpError={dumpError}
          androidApps={androidApps}
          androidElements={androidElements}
          isDumpingUI={isDumpingUI}
          selectedApp={selectedApp}
          selectedElement={selectedElement}
          setSelectedApp={setSelectedApp}
          setSelectedElement={setSelectedElement}
          handleGetApps={handleGetApps}
          handleDumpUIWithLoading={handleDumpUIWithLoading}
          clearElements={handleClearOverlay}
          handleRemoteCommand={handleRemoteCommand}
          handleOverlayElementClick={handleOverlayElementClick}
          onDisconnect={handleDisconnect}
          handleReleaseControl={handleDisconnect}
        />
      </Box>

      {/* AndroidMobileOverlay - positioned outside */}
      {showOverlay && androidElements.length > 0 && (
        <div
          style={{
            position: 'fixed',
            left: '74px',
            top: '186px',
            zIndex: 99999999, // Much higher z-index to ensure it's on top of everything
            pointerEvents: 'all',
            transformOrigin: 'top left',
            transform: 'scale(0.198, 0.195)', // Separate scaleX and scaleY values

            background: 'rgba(0,0,0,0.01)', // Add a barely visible background to help with layer creation
          }}
        >
          <AndroidMobileOverlay
            elements={androidElements}
            screenshotElement={screenshotRef.current}
            deviceWidth={deviceResolution.width}
            deviceHeight={deviceResolution.height}
            isVisible={showOverlay}
            selectedElementId={selectedElement ? selectedElement : undefined}
            onElementClick={handleOverlayElementClick}
          />
        </div>
      )}
    </Box>
  );
}
