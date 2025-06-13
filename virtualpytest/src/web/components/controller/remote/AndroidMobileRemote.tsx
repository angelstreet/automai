import { Box } from '@mui/material';
import { useState, useRef } from 'react';

import { buildServerUrl } from '../../../utils/frontendUtils';
import { Host } from '../../../types/common/Host_Types';
import { AndroidElement, AndroidApp } from '../../../types/controller/Remote_Types';

import { AndroidMobileCore } from './AndroidMobileControls';
import { AndroidMobileOverlay } from './AndroidMobileOverlay';

interface AndroidMobileRemoteProps {
  host: Host;
  onDisconnectComplete?: () => void;
  sx?: any;
}

export function AndroidMobileRemote({
  host,
  onDisconnectComplete,
  sx = {},
}: AndroidMobileRemoteProps) {
  // Simple state - no complex loading states
  const [isConnected, setIsConnected] = useState(true); // Always connected when shown
  const [androidScreenshot, setAndroidScreenshot] = useState<string | null>(null);
  const [androidElements, setAndroidElements] = useState<AndroidElement[]>([]);
  const [androidApps, setAndroidApps] = useState<AndroidApp[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedElement, setSelectedElement] = useState('');
  const [selectedApp, setSelectedApp] = useState('');

  const screenshotRef = useRef<HTMLImageElement>(null);

  // Direct server route calls - no hooks, no abstractions
  const takeScreenshot = async () => {
    const response = await fetch(buildServerUrl('/server/remote/take-screenshot'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host_name: host.host_name }),
    });
    return response.json();
  };

  const screenshotAndDump = async () => {
    const response = await fetch(buildServerUrl('/server/remote/screenshot-and-dump'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host_name: host.host_name }),
    });
    const result = await response.json();

    if (result.success) {
      if (result.screenshot) {
        setAndroidScreenshot(result.screenshot);
      }
      if (result.elements) {
        setAndroidElements(result.elements);
      }
      setShowOverlay(true);
    }

    return result;
  };

  const getApps = async () => {
    const response = await fetch(buildServerUrl('/server/remote/get-apps'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host_name: host.host_name }),
    });
    const result = await response.json();

    if (result.success && result.apps) {
      setAndroidApps(result.apps);
    }

    return result;
  };

  const clickElement = async (element: AndroidElement) => {
    const response = await fetch(buildServerUrl('/server/remote/click-element'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host_name: host.host_name,
        elementId: element.id.toString(),
      }),
    });
    return response.json();
  };

  const executeCommand = async (command: string, params?: any) => {
    const response = await fetch(buildServerUrl('/server/remote/execute-command'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host_name: host.host_name,
        command,
        params,
      }),
    });
    return response.json();
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setShowOverlay(false);
    setAndroidScreenshot(null);
    setAndroidElements([]);
    setAndroidApps([]);

    if (onDisconnectComplete) {
      onDisconnectComplete();
    }
  };

  const handleOverlayElementClick = async (element: AndroidElement) => {
    await clickElement(element);
    setSelectedElement(element.id.toString());
    // Auto-refresh after click
    setTimeout(() => screenshotAndDump(), 1200);
  };

  const handleRemoteCommand = async (command: string, params?: any) => {
    if (command === 'LAUNCH_APP') {
      await executeCommand('launch_app', { package: params.package });
    } else {
      await executeCommand('press_key', { key: command });
    }
  };

  return (
    <Box sx={{ ...sx, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{ p: 2, flex: 1, overflow: 'auto', maxWidth: '300px', margin: '0 auto', width: '100%' }}
      >
        <AndroidMobileCore
          session={{
            connected: isConnected,
            device_ip: host.host_name,
            connectionInfo: `Connected to ${host.device_name}`,
          }}
          connectionLoading={false}
          connectionError={null}
          dumpError={null}
          androidApps={androidApps}
          androidElements={androidElements}
          isDumpingUI={false}
          selectedApp={selectedApp}
          selectedElement={selectedElement}
          setSelectedApp={setSelectedApp}
          setSelectedElement={setSelectedElement}
          handleGetApps={getApps}
          handleDumpUIWithLoading={screenshotAndDump}
          clearElements={async () => {
            setShowOverlay(false);
          }}
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
            zIndex: 99999999,
            pointerEvents: 'all',
            transformOrigin: 'top left',
            transform: 'scale(0.198, 0.195)',
            background: 'rgba(0,0,0,0.01)',
          }}
        >
          <AndroidMobileOverlay
            elements={androidElements}
            screenshotElement={screenshotRef.current}
            deviceWidth={1080}
            deviceHeight={2340}
            isVisible={showOverlay}
            selectedElementId={selectedElement ? selectedElement : undefined}
            onElementClick={handleOverlayElementClick}
          />
        </div>
      )}
    </Box>
  );
}
