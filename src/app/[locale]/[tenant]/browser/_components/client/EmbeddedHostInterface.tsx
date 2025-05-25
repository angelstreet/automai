'use client';

import {
  Monitor,
  Wifi,
  WifiOff,
  Terminal as TerminalIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { useCallback, useEffect, useState, useRef } from 'react';

import { TerminalEmulator } from '@/app/[locale]/[tenant]/hosts/_components/client/TerminalEmulator';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Host } from '@/types/component/hostComponentType';

interface EmbeddedHostInterfaceProps {
  host: Host | null;
  isVisible: boolean;
}

export default function EmbeddedHostInterface({ host, isVisible }: EmbeddedHostInterfaceProps) {
  const [isVncLoading, setIsVncLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'vnc' | 'terminal'>('vnc');

  // VNC scaling state
  const [vncScale, setVncScale] = useState(0.6); // Start smaller for embedded view
  const [autoFit, setAutoFit] = useState(true);
  const vncContainerRef = useRef<HTMLDivElement>(null);
  const vncIframeRef = useRef<HTMLIFrameElement>(null);

  // Terminal session state
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [isTerminalConnecting, setIsTerminalConnecting] = useState(false);
  const [terminalConnectionError, setTerminalConnectionError] = useState<string | null>(null);

  // Check if host supports terminal access
  const supportsTerminal = useCallback((hostToCheck: Host | null): boolean => {
    if (!hostToCheck) return false;
    return (
      hostToCheck.type === 'ssh' ||
      hostToCheck.device_type === 'server' ||
      hostToCheck.device_type === 'workstation' ||
      hostToCheck.device_type === 'laptop'
    );
  }, []);

  // Check if host supports VNC
  const supportsVnc = useCallback((hostToCheck: Host | null): boolean => {
    if (!hostToCheck) return false;
    return !!hostToCheck.vnc_port;
  }, []);

  // Determine which tabs to show - moved before early return
  const hasVnc = supportsVnc(host);
  const hasTerminal = supportsTerminal(host);
  const showTabs = hasVnc && hasTerminal;

  // Reset state when host changes
  useEffect(() => {
    if (!host) {
      setIsVncLoading(true);
      setIsConnected(false);
      setActiveTab('vnc');
      setVncScale(0.6);
      setAutoFit(true);
      // Reset terminal state
      setTerminalSessionId(null);
      setIsTerminalConnecting(false);
      setTerminalConnectionError(null);
    } else {
      setIsConnected(true);
    }
  }, [host]);

  // Auto-select available tab if current tab is not supported - moved before early return
  useEffect(() => {
    if (!showTabs && host) {
      if (hasTerminal && !hasVnc) {
        setActiveTab('terminal');
      } else if (hasVnc && !hasTerminal) {
        setActiveTab('vnc');
      }
    }
  }, [host, hasVnc, hasTerminal, showTabs]);

  // Auto-fit VNC scaling calculation for compact view
  const calculateAutoFitScale = useCallback(() => {
    if (!vncContainerRef.current || !autoFit) return;

    const container = vncContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Assuming standard VNC resolution
    const vncWidth = 1920;
    const vncHeight = 1080;

    const scaleX = containerWidth / vncWidth;
    const scaleY = containerHeight / vncHeight;
    const scale = Math.min(scaleX, scaleY, 0.8); // Max 80% for embedded view

    console.log(`[@component:EmbeddedHostInterface] Auto-fit scale calculated: ${scale}`);
    setVncScale(scale);
  }, [autoFit]);

  // Recalculate scale when container size changes or tab switches
  useEffect(() => {
    if (activeTab === 'vnc' && autoFit && isVisible) {
      const timer = setTimeout(calculateAutoFitScale, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, autoFit, isVisible, calculateAutoFitScale]);

  const initializeTerminalSession = useCallback(async () => {
    if (!host) return;

    console.log(
      `[@component:EmbeddedHostInterface] Initializing terminal session for host: ${host.name}`,
    );
    setIsTerminalConnecting(true);
    setTerminalConnectionError(null);

    try {
      const { initTerminal } = await import('@/app/actions/terminalsAction');
      const result = await initTerminal(host.id);

      if (result.success && result.data) {
        console.log(
          `[@component:EmbeddedHostInterface] Terminal session initialized: ${result.data.sessionId}`,
        );
        setTerminalSessionId(result.data.sessionId);
      } else {
        console.error(
          `[@component:EmbeddedHostInterface] Failed to initialize terminal session:`,
          result.error,
        );
        setTerminalConnectionError(result.error || 'Failed to initialize terminal session');
      }
    } catch (error) {
      console.error(
        `[@component:EmbeddedHostInterface] Error initializing terminal session:`,
        error,
      );
      setTerminalConnectionError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsTerminalConnecting(false);
    }
  }, [host]);

  // Initialize terminal session when component mounts if host supports terminal
  useEffect(() => {
    if (
      isVisible &&
      host &&
      !terminalSessionId &&
      !isTerminalConnecting &&
      supportsTerminal(host)
    ) {
      initializeTerminalSession();
    }
  }, [
    isVisible,
    host,
    terminalSessionId,
    isTerminalConnecting,
    initializeTerminalSession,
    supportsTerminal,
  ]);

  // VNC scaling controls
  const handleZoomIn = () => {
    setAutoFit(false);
    setVncScale((prev) => Math.min(prev + 0.1, 1.2));
  };

  const handleZoomOut = () => {
    setAutoFit(false);
    setVncScale((prev) => Math.max(prev - 0.1, 0.3));
  };

  const handleAutoFit = () => {
    setAutoFit(true);
    calculateAutoFitScale();
  };

  const handleRetryTerminal = () => {
    setTerminalSessionId(null);
    setTerminalConnectionError(null);
  };

  const handleVncLoad = () => {
    setIsVncLoading(false);
    if (autoFit) {
      setTimeout(calculateAutoFitScale, 500);
    }
  };

  // Early return if not visible or no host - moved after all hooks
  if (!isVisible || !host) {
    return (
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Host Interface
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center space-y-2">
              <Monitor className="h-8 w-8 mx-auto opacity-50" />
              <p className="text-sm">No host connected</p>
              <p className="text-xs">Take control of a host to see the interface</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get VNC connection details
  const vncPort = host?.vnc_port;
  const vncPassword = host?.vnc_password;
  const vncUrl = vncPort
    ? `https://${host.ip}:${vncPort}/vnc/vnc_lite.html?host=${host.ip}&port=${vncPort}&path=websockify&encrypt=0${vncPassword ? `&password=${vncPassword}` : ''}`
    : null;

  return (
    <Card>
      <CardHeader className="py-1.5 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5" />
              {host.name}
              <div className="flex items-center ml-1">
                {isConnected ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
              </div>
            </CardTitle>

            {/* Tab Navigation - inline with header */}
            {showTabs && (
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded p-0.5">
                <button
                  onClick={() => setActiveTab('vnc')}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                    activeTab === 'vnc'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  disabled={!hasVnc}
                >
                  VNC
                </button>
                <button
                  onClick={() => setActiveTab('terminal')}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                    activeTab === 'terminal'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  disabled={!hasTerminal}
                >
                  Terminal
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {/* VNC Scaling Controls - only show when VNC tab is active */}
            {activeTab === 'vnc' && hasVnc && (
              <div className="flex items-center space-x-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  disabled={vncScale <= 0.3}
                  className="h-6 w-6 p-0"
                >
                  <ZoomOut className="h-2.5 w-2.5" />
                </Button>
                <span className="text-xs text-gray-500 min-w-[2rem] text-center">
                  {Math.round(vncScale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  disabled={vncScale >= 1.2}
                  className="h-6 w-6 p-0"
                >
                  <ZoomIn className="h-2.5 w-2.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoFit}
                  title="Fit to Window"
                  className={`h-6 w-6 p-0 ${autoFit ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
                >
                  <Maximize2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Content Area - Compact height */}
        <div className="h-80 overflow-hidden relative border rounded-b-lg">
          {/* VNC Tab */}
          <div className={`h-full absolute inset-0 ${activeTab === 'vnc' ? 'block' : 'hidden'}`}>
            {!hasVnc ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <Monitor className="h-8 w-8 text-gray-400 mx-auto" />
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    VNC Not Available
                  </h3>
                  <p className="text-xs text-gray-500 max-w-xs">
                    This host doesn't have VNC configured.{' '}
                    {hasTerminal && 'You can use the terminal instead.'}
                  </p>
                </div>
              </div>
            ) : (
              <div ref={vncContainerRef} className="h-full w-full overflow-auto bg-gray-900">
                {/* VNC Loading State */}
                {isVncLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                      <span className="mt-2 text-sm text-gray-500">Connecting to VNC...</span>
                    </div>
                  </div>
                )}

                {/* VNC iframe with scaling */}
                <div className="h-full w-full flex items-center justify-center">
                  <iframe
                    ref={vncIframeRef}
                    src={vncUrl || undefined}
                    className="border-none"
                    style={{
                      transform: `scale(${vncScale})`,
                      transformOrigin: 'center center',
                      width: autoFit ? '100%' : `${100 / vncScale}%`,
                      height: autoFit ? '100%' : `${100 / vncScale}%`,
                      minWidth: autoFit ? '1920px' : 'auto',
                      minHeight: autoFit ? '1080px' : 'auto',
                    }}
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    onLoad={handleVncLoad}
                    title={`VNC Stream - ${host.name}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Terminal Tab */}
          <div
            className={`h-full absolute inset-0 ${activeTab === 'terminal' ? 'block' : 'hidden'}`}
          >
            {!hasTerminal ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <TerminalIcon className="h-8 w-8 text-gray-400 mx-auto" />
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Terminal Not Available
                  </h3>
                  <p className="text-xs text-gray-500 max-w-xs">
                    This host type ({host.device_type || host.type}) doesn't support terminal
                    access.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full bg-black">
                {terminalConnectionError ? (
                  <div className="flex flex-col items-center justify-center h-full text-white p-4">
                    <div className="text-center space-y-3">
                      <WifiOff className="h-8 w-8 text-red-400 mx-auto" />
                      <h3 className="text-sm font-medium text-red-400">Connection Failed</h3>
                      <p className="text-xs text-gray-300 max-w-xs">{terminalConnectionError}</p>
                      <Button variant="outline" size="sm" onClick={handleRetryTerminal}>
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : isTerminalConnecting ? (
                  <div className="flex items-center justify-center h-full text-white">
                    <div className="text-center space-y-3">
                      <TerminalIcon className="h-8 w-8 text-blue-400 mx-auto animate-pulse" />
                      <p className="text-sm text-gray-300">Connecting to {host.name}...</p>
                      <div className="flex space-x-1 justify-center">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        ></div>
                        <div
                          className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : terminalSessionId ? (
                  <TerminalEmulator
                    sessionId={terminalSessionId}
                    host={host}
                    onConnectionStatusChange={() => {}}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 