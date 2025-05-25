'use client';

import {
  X,
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
import { Dialog, DialogContent, DialogTitle } from '@/components/shadcn/dialog';
import { Host } from '@/types/component/hostComponentType';

interface UnifiedHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: Host | null;
  title?: string;
  defaultTab?: 'vnc' | 'terminal';
}

export function UnifiedHostModal({
  isOpen,
  onClose,
  host,
  title,
  defaultTab = 'vnc',
}: UnifiedHostModalProps) {
  const [isVncLoading, setIsVncLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'vnc' | 'terminal'>(defaultTab);

  // VNC scaling state
  const [vncScale, setVncScale] = useState(1);
  const [autoFit, setAutoFit] = useState(true);
  const vncContainerRef = useRef<HTMLDivElement>(null);
  const vncIframeRef = useRef<HTMLIFrameElement>(null);

  // Terminal session state
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [isTerminalConnecting, setIsTerminalConnecting] = useState(false);
  const [terminalConnectionError, setTerminalConnectionError] = useState<string | null>(null);

  // Reset state when modal opens/closes or host changes
  useEffect(() => {
    if (!isOpen || !host) {
      setIsVncLoading(true);
      setIsConnected(false);
      setActiveTab(defaultTab);
      setVncScale(1);
      setAutoFit(true);
      // Reset terminal state
      setTerminalSessionId(null);
      setIsTerminalConnecting(false);
      setTerminalConnectionError(null);
    } else {
      setIsConnected(true);
    }
  }, [isOpen, host, defaultTab]);

  // Auto-fit VNC scaling calculation
  const calculateAutoFitScale = useCallback(() => {
    if (!vncContainerRef.current || !autoFit) return;

    const container = vncContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Assuming standard VNC resolution (can be adjusted)
    const vncWidth = 1920; // Default VNC width
    const vncHeight = 1080; // Default VNC height

    const scaleX = containerWidth / vncWidth;
    const scaleY = containerHeight / vncHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

    console.log(`[@component:UnifiedHostModal] Auto-fit scale calculated: ${scale}`);
    setVncScale(scale);
  }, [autoFit]);

  // Recalculate scale when container size changes or tab switches
  useEffect(() => {
    if (activeTab === 'vnc' && autoFit) {
      // Small delay to ensure container is rendered
      const timer = setTimeout(calculateAutoFitScale, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, autoFit, calculateAutoFitScale]);

  // Handle window resize for auto-fit
  useEffect(() => {
    if (autoFit && activeTab === 'vnc') {
      const handleResize = () => calculateAutoFitScale();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [autoFit, activeTab, calculateAutoFitScale]);

  // VNC scaling controls
  const handleZoomIn = () => {
    setAutoFit(false);
    setVncScale((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setAutoFit(false);
    setVncScale((prev) => Math.max(prev - 0.1, 0.3));
  };

  const handleAutoFit = () => {
    setAutoFit(true);
    calculateAutoFitScale();
  };

  // Check if host supports terminal access
  const supportsTerminal = useCallback((hostToCheck: Host | null): boolean => {
    if (!hostToCheck) return false;
    // Check if host type supports SSH or has terminal capabilities
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

  const initializeTerminalSession = useCallback(async () => {
    if (!host) return;

    console.log(
      `[@component:UnifiedHostModal] Initializing terminal session for host: ${host.name}`,
    );
    setIsTerminalConnecting(true);
    setTerminalConnectionError(null);

    try {
      // Import terminal action
      const { initTerminal } = await import('@/app/actions/terminalsAction');

      const result = await initTerminal(host.id);

      if (result.success && result.data) {
        console.log(
          `[@component:UnifiedHostModal] Terminal session initialized: ${result.data.sessionId}`,
        );
        setTerminalSessionId(result.data.sessionId);
      } else {
        console.error(
          `[@component:UnifiedHostModal] Failed to initialize terminal session:`,
          result.error,
        );
        setTerminalConnectionError(result.error || 'Failed to initialize terminal session');
      }
    } catch (error) {
      console.error(`[@component:UnifiedHostModal] Error initializing terminal session:`, error);
      setTerminalConnectionError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsTerminalConnecting(false);
    }
  }, [host]);

  // Initialize terminal session when modal opens if host supports terminal
  useEffect(() => {
    if (isOpen && host && !terminalSessionId && !isTerminalConnecting && supportsTerminal(host)) {
      initializeTerminalSession();
    }
  }, [
    isOpen,
    host,
    terminalSessionId,
    isTerminalConnecting,
    initializeTerminalSession,
    supportsTerminal,
  ]);

  // Determine which tabs to show - moved into useEffect to ensure consistent hook ordering
  const [tabConfig, setTabConfig] = useState({
    hasVnc: false,
    hasTerminal: false,
    showTabs: false,
  });

  useEffect(() => {
    const hasVnc = supportsVnc(host);
    const hasTerminal = supportsTerminal(host);
    const showTabs = hasVnc && hasTerminal;

    setTabConfig({ hasVnc, hasTerminal, showTabs });

    // Auto-select available tab if current tab is not supported
    if (!showTabs && host) {
      if (hasTerminal && !hasVnc) {
        setActiveTab('terminal');
      } else if (hasVnc && !hasTerminal) {
        setActiveTab('vnc');
      }
    }
  }, [host, supportsVnc, supportsTerminal]);

  const handleRetryTerminal = () => {
    setTerminalSessionId(null);
    setTerminalConnectionError(null);
  };

  // Handle VNC iframe load
  const handleVncLoad = () => {
    setIsVncLoading(false);
    // Trigger auto-fit calculation after iframe loads
    if (autoFit) {
      setTimeout(calculateAutoFitScale, 500);
    }
  };

  const handleClose = async () => {
    console.log(`[@component:UnifiedHostModal] Closing modal`);

    // Close terminal session if active
    if (terminalSessionId) {
      try {
        const { closeTerminal } = await import('@/app/actions/terminalsAction');
        await closeTerminal(terminalSessionId);
        console.log(`[@component:UnifiedHostModal] Terminal session closed: ${terminalSessionId}`);
      } catch (error) {
        console.error(`[@component:UnifiedHostModal] Error closing terminal session:`, error);
      }
    }

    onClose();
  };

  // Early return after all hooks are called
  if (!host) return null;

  // Get VNC connection details
  const vncPort = host?.vnc_port;
  const vncPassword = host?.vnc_password;

  // VNC URL format with password param if available
  const vncUrl = vncPort
    ? `https://${host.ip}:${vncPort}/vnc/vnc_lite.html?host=${host.ip}&port=${vncPort}&path=websockify&encrypt=0${vncPassword ? `&password=${vncPassword}` : ''}`
    : null;

  const { hasVnc, hasTerminal, showTabs } = tabConfig;
  const modalTitle = title || `${host.name} - Remote Access`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[98vw] max-w-none sm:max-w-none h-[98vh] p-0 overflow-hidden [&>button]:hidden fixed top-1 left-1/2 transform -translate-x-1/2">
        <div className="flex flex-col h-full">
          {/* Header with Title, Tabs, Controls, and Close Button */}
          <div className="flex items-center justify-between p-3 border-b bg-background shrink-0">
            <div className="flex items-center space-x-3">
              <Monitor className="h-5 w-5" />
              <DialogTitle className="text-lg font-semibold">{modalTitle}</DialogTitle>
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>

            {/* Tab Navigation - only show if both options available */}
            {showTabs && (
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('vnc')}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                      activeTab === 'vnc'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    disabled={!hasVnc}
                  >
                    VNC Display
                  </button>
                  <button
                    onClick={() => setActiveTab('terminal')}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                      activeTab === 'terminal'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    disabled={!hasTerminal}
                  >
                    Terminal
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              {/* VNC Scaling Controls - only show when VNC tab is active */}
              {activeTab === 'vnc' && hasVnc && (
                <div className="flex items-center space-x-1 border-r pr-3 mr-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    disabled={vncScale <= 0.3}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-500 min-w-[3rem] text-center">
                    {Math.round(vncScale * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    title="Zoom In"
                    disabled={vncScale >= 2}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAutoFit}
                    title="Fit to Window"
                    className={autoFit ? 'bg-blue-100 dark:bg-blue-900' : ''}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative">
            {/* VNC Tab */}
            <div className={`h-full absolute inset-0 ${activeTab === 'vnc' ? 'block' : 'hidden'}`}>
              {!hasVnc ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <Monitor className="h-12 w-12 text-gray-400 mx-auto" />
                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">
                      VNC Not Available
                    </h3>
                    <p className="text-gray-500 max-w-md">
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
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span className="mt-2 text-gray-500">Connecting to VNC...</span>
                      </div>
                    </div>
                  )}

                  {/* VNC iframe with scaling */}
                  <div
                    className="h-full w-full flex items-center justify-center"
                    style={{
                      minHeight: '100%',
                      minWidth: '100%',
                    }}
                  >
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
                  <div className="text-center space-y-4">
                    <TerminalIcon className="h-12 w-12 text-gray-400 mx-auto" />
                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">
                      Terminal Not Available
                    </h3>
                    <p className="text-gray-500 max-w-md">
                      This host type ({host.device_type || host.type}) doesn't support terminal
                      access.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full bg-black">
                  {/* Terminal Content */}
                  <div className="h-full">
                    {terminalConnectionError ? (
                      <div className="flex flex-col items-center justify-center h-full text-white p-8">
                        <div className="text-center space-y-4">
                          <WifiOff className="h-12 w-12 text-red-400 mx-auto" />
                          <h3 className="text-lg font-medium text-red-400">Connection Failed</h3>
                          <p className="text-gray-300 max-w-md">{terminalConnectionError}</p>
                          <Button variant="outline" onClick={handleRetryTerminal} className="mt-4">
                            Retry Connection
                          </Button>
                        </div>
                      </div>
                    ) : isTerminalConnecting ? (
                      <div className="flex items-center justify-center h-full text-white">
                        <div className="text-center space-y-4">
                          <TerminalIcon className="h-12 w-12 text-blue-400 mx-auto animate-pulse" />
                          <p className="text-gray-300">Connecting to {host.name}...</p>
                          <div className="flex space-x-1 justify-center">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                              style={{ animationDelay: '0.1s' }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
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
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
