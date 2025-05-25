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
  const [isMaximized, setIsMaximized] = useState(false); // New state for maximize mode
  const vncContainerRef = useRef<HTMLDivElement>(null);
  const vncIframeRef = useRef<HTMLIFrameElement>(null);

  // Terminal session state
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [isTerminalConnecting, setIsTerminalConnecting] = useState(false);
  const [terminalConnectionError, setTerminalConnectionError] = useState<string | null>(null);

  // Stable reference to host to prevent TerminalEmulator re-initialization
  const stableHostRef = useRef<Host | null>(null);
  if (host && (!stableHostRef.current || stableHostRef.current.id !== host.id)) {
    stableHostRef.current = host;
  }

  // Stable callback for terminal connection status
  const handleTerminalConnectionStatusChange = useCallback(() => {
    // This is intentionally empty as we don't need to track connection status changes
    // but the TerminalEmulator requires this callback
  }, []);

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
      setIsMaximized(false); // Reset maximize state
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

    console.log(`[@component:EmbeddedHostInterface] Container dimensions: ${containerWidth}x${containerHeight}, maximized: ${isMaximized}`);

    // Assuming standard VNC resolution
    const vncWidth = 1920;
    const vncHeight = 1080;

    const scaleX = containerWidth / vncWidth;
    const scaleY = containerHeight / vncHeight;
    
    let scale;
    if (isMaximized) {
      // In maximized mode, use the smaller scale to fit properly but be more aggressive
      scale = Math.min(scaleX, scaleY) * 1.2; // Use 98% to avoid overflow
      scale = Math.min(scale, 2.0); // Still cap at 200%
    } else {
      // In normal mode, prioritize filling the space to reduce grey areas
      // Use a more aggressive approach to fill both width and height
      scale = Math.max(scaleX, scaleY) * 0.63; // Use the larger scale with 95% to avoid overflow
      scale = Math.min(scale, 1.2); // Cap at 140% to allow more aggressive scaling
    }

    // Ensure minimum scale
    scale = Math.max(scale, 0.2);

    console.log(`[@component:EmbeddedHostInterface] Auto-fit scale calculated: ${scale} (scaleX: ${scaleX.toFixed(3)}, scaleY: ${scaleY.toFixed(3)}, maximized: ${isMaximized})`);
    setVncScale(scale);
  }, [autoFit, isMaximized]);

  // Recalculate scale when container size changes or tab switches
  useEffect(() => {
    if (activeTab === 'vnc' && autoFit && isVisible) {
      const timer = setTimeout(calculateAutoFitScale, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, autoFit, isVisible, isMaximized, calculateAutoFitScale]);

  // Add resize observer for more reliable auto-fit when container size changes
  useEffect(() => {
    if (!vncContainerRef.current || !autoFit || activeTab !== 'vnc') return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        console.log(`[@component:EmbeddedHostInterface] Container resized: ${entry.contentRect.width}x${entry.contentRect.height}`);
        // Debounce the calculation to avoid excessive calls
        setTimeout(calculateAutoFitScale, 100);
      }
    });

    resizeObserver.observe(vncContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [autoFit, activeTab, calculateAutoFitScale]);

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

  // Initialize terminal session when component becomes visible and has terminal support
  useEffect(() => {
    if (isVisible && host && hasTerminal && !terminalSessionId && !isTerminalConnecting) {
      console.log(
        `[@component:EmbeddedHostInterface] Auto-initializing terminal session for host with terminal support`,
      );
      initializeTerminalSession();
    }
  }, [
    isVisible,
    host,
    hasTerminal,
    terminalSessionId,
    isTerminalConnecting,
    initializeTerminalSession,
  ]);

  // VNC scaling controls
  const handleZoomIn = () => {
    setAutoFit(false);
    const maxScale = isMaximized ? 2.0 : 1.2; // Higher max scale in maximized mode
    setVncScale((prev) => Math.min(prev + 0.1, maxScale));
  };

  const handleZoomOut = () => {
    setAutoFit(false);
    setVncScale((prev) => Math.max(prev - 0.1, 0.2)); // Allow smaller minimum scale
  };

  const handleAutoFit = () => {
    setAutoFit(true);
    // Add a small delay to ensure any pending DOM updates are complete
    setTimeout(() => {
      calculateAutoFitScale();
    }, 100);
  };

  const handleMaximize = () => {
    const newMaximized = !isMaximized;
    setIsMaximized(newMaximized);
    
    console.log(`[@component:EmbeddedHostInterface] VNC maximize mode: ${newMaximized}`);
    
    // If auto-fit is enabled, recalculate scale for new mode
    if (autoFit) {
      // Use multiple timeouts to ensure DOM has fully updated
      // First timeout for state update, second for CSS transition completion
      setTimeout(() => {
        setTimeout(() => {
          calculateAutoFitScale();
        }, 350); // Wait for CSS transition (300ms) + buffer
      }, 50);
    }
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
  
  // Enhanced VNC URL with additional parameters for better display
  const vncUrl = vncPort
    ? `https://${host.ip}:${vncPort}/vnc/vnc_lite.html?host=${host.ip}&port=${vncPort}&path=websockify&encrypt=0${vncPassword ? `&password=${vncPassword}` : ''}&resize=off&scaling=true&show_dot=false&bell=false&shared=true&view_only=false&quality=6&compress=2&fit=true&clip=false&local_cursor=true&viewport=true&scale=true`
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
                  disabled={vncScale <= 0.2}
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
                  disabled={vncScale >= (isMaximized ? 2.0 : 1.2)}
                  className="h-6 w-6 p-0"
                >
                  <ZoomIn className="h-2.5 w-2.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoFit}
                  title="Auto Fit"
                  className={`h-6 w-6 p-0 ${autoFit ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
                >
                  <Maximize2 className="h-2.5 w-2.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMaximize}
                  title={isMaximized ? "Normal View" : "Maximize View"}
                  className={`h-6 w-6 p-0 ${isMaximized ? 'bg-green-100 dark:bg-green-900' : ''}`}
                >
                  <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d={isMaximized ? "M9 9h6v6H9z" : "M4 4h16v16H4z"} />
                  </svg>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Content Area - Dynamic height based on maximize mode */}
        <div className={`${isMaximized ? 'h-[500px]' : 'h-80'} overflow-hidden relative border rounded-b-lg transition-all duration-300`}>
          {/* VNC Tab - Always rendered, controlled by visibility */}
          <div
            className="h-full absolute inset-0"
            style={{
              visibility: activeTab === 'vnc' ? 'visible' : 'hidden',
              zIndex: activeTab === 'vnc' ? 10 : 0,
            }}
          >
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

                {/* VNC iframe with enhanced scaling */}
                <div className="h-full w-full flex items-center justify-center overflow-hidden bg-black">
                  <iframe
                    ref={vncIframeRef}
                    src={vncUrl || undefined}
                    className="border-none bg-transparent"
                    style={{
                      transform: `scale(${vncScale})`,
                      transformOrigin: 'center center',
                      width: '1920px',
                      height: '1080px',
                      backgroundColor: 'transparent',
                    }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
                    onLoad={handleVncLoad}
                    title={`VNC Stream - ${host.name}`}
                    allow="fullscreen"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Terminal Tab - Always rendered, controlled by visibility */}
          <div
            className="h-full absolute inset-0"
            style={{
              visibility: activeTab === 'terminal' ? 'visible' : 'hidden',
              zIndex: activeTab === 'terminal' ? 10 : 0,
            }}
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
                ) : terminalSessionId && stableHostRef.current ? (
                  <TerminalEmulator
                    sessionId={terminalSessionId}
                    host={stableHostRef.current}
                    onConnectionStatusChange={handleTerminalConnectionStatusChange}
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