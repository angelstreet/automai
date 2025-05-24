'use client';

import { X, Monitor, Wifi, WifiOff, Terminal as TerminalIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { TerminalEmulator } from '@/app/[locale]/[tenant]/hosts/_components/client/TerminalEmulator';
import { endBrowserSession } from '@/app/actions/browserActions';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/shadcn/dialog';
import { Host } from '@/types/component/hostComponentType';

interface BrowserModalClientProps {
  isOpen: boolean;
  onClose: () => void;
  host: Host | null;
  sessionId: string | null;
}

export function BrowserModalClient({ isOpen, onClose, host, sessionId }: BrowserModalClientProps) {
  const [isVncLoading, setIsVncLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'vnc' | 'terminal'>('vnc');

  // Terminal session state (separate from browser session)
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [isTerminalConnecting, setIsTerminalConnecting] = useState(false);
  const [terminalConnectionError, setTerminalConnectionError] = useState<string | null>(null);

  // Reset state when modal opens/closes or host changes
  useEffect(() => {
    if (!isOpen || !host) {
      setIsVncLoading(true);
      setIsConnected(false);
      setActiveTab('vnc');
      // Reset terminal state
      setTerminalSessionId(null);
      setIsTerminalConnecting(false);
      setTerminalConnectionError(null);
    } else {
      setIsConnected(true);
    }
  }, [isOpen, host]);

  // Check if host supports terminal access
  const supportsTerminal = (host: Host): boolean => {
    // Check if host type supports SSH or has terminal capabilities
    return (
      host.type === 'ssh' ||
      host.device_type === 'server' ||
      host.device_type === 'workstation' ||
      host.device_type === 'laptop'
    );
  };

  const initializeTerminalSession = useCallback(async () => {
    if (!host) return;

    console.log(
      `[@component:BrowserModalClient] Initializing terminal session for host: ${host.name}`,
    );
    setIsTerminalConnecting(true);
    setTerminalConnectionError(null);

    try {
      // Import terminal action
      const { initTerminal } = await import('@/app/actions/terminalsAction');

      const result = await initTerminal(host.id);

      if (result.success && result.data) {
        console.log(
          `[@component:BrowserModalClient] Terminal session initialized: ${result.data.sessionId}`,
        );
        setTerminalSessionId(result.data.sessionId);

        // Automatically send commands to get a clean prompt
        setTimeout(async () => {
          try {
            const { sendTerminalData } = await import('@/app/actions/terminalsAction');

            // Send enter to establish initial prompt
            await sendTerminalData(result.data.sessionId, '');
            console.log(`[@component:BrowserModalClient] Sent initial enter command`);

            // Wait a bit, then clear the screen
            setTimeout(async () => {
              try {
                await sendTerminalData(result.data.sessionId, 'clear');
                console.log(`[@component:BrowserModalClient] Sent clear command`);

                // Wait a bit more, then send another enter to get fresh prompt
                setTimeout(async () => {
                  try {
                    await sendTerminalData(result.data.sessionId, '');
                    console.log(
                      `[@component:BrowserModalClient] Sent final enter for fresh prompt`,
                    );
                  } catch (error) {
                    console.error(
                      `[@component:BrowserModalClient] Error sending final command:`,
                      error,
                    );
                  }
                }, 500);
              } catch (error) {
                console.error(
                  `[@component:BrowserModalClient] Error sending clear command:`,
                  error,
                );
              }
            }, 500);
          } catch (error) {
            console.error(`[@component:BrowserModalClient] Error sending initial commands:`, error);
          }
        }, 2000); // Increased initial wait time to 2 seconds
      } else {
        console.error(
          `[@component:BrowserModalClient] Failed to initialize terminal session:`,
          result.error,
        );
        setTerminalConnectionError(result.error || 'Failed to initialize terminal session');
      }
    } catch (error) {
      console.error(`[@component:BrowserModalClient] Error initializing terminal session:`, error);
      setTerminalConnectionError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsTerminalConnecting(false);
    }
  }, [host]);

  // Initialize terminal session when switching to terminal tab
  useEffect(() => {
    if (
      isOpen &&
      host &&
      activeTab === 'terminal' &&
      !terminalSessionId &&
      !isTerminalConnecting &&
      supportsTerminal(host)
    ) {
      initializeTerminalSession();
    }
  }, [isOpen, host, activeTab, terminalSessionId, isTerminalConnecting, initializeTerminalSession]);

  const handleRetryTerminal = () => {
    setTerminalSessionId(null);
    setTerminalConnectionError(null);
  };

  // Handle VNC iframe load
  const handleVncLoad = () => {
    setIsVncLoading(false);
  };

  const handleClose = async () => {
    console.log(`[@component:BrowserModalClient] Closing browser modal`);

    // End browser session if active
    if (sessionId && host) {
      try {
        await endBrowserSession(sessionId, host.id);
        console.log(`[@component:BrowserModalClient] Browser session ended: ${sessionId}`);
      } catch (error) {
        console.error(`[@component:BrowserModalClient] Error ending browser session:`, error);
      }
    }

    // Close terminal session if active
    if (terminalSessionId) {
      try {
        const { closeTerminal } = await import('@/app/actions/terminalsAction');
        await closeTerminal(terminalSessionId);
        console.log(
          `[@component:BrowserModalClient] Terminal session closed: ${terminalSessionId}`,
        );
      } catch (error) {
        console.error(`[@component:BrowserModalClient] Error closing terminal session:`, error);
      }
    }

    onClose();
  };

  if (!host || !sessionId) return null;

  // Get VNC connection details
  const vncPort = host?.vnc_port;
  const vncPassword = host?.vnc_password;

  // VNC URL format with password param if available
  const vncUrl = vncPort
    ? `https://${host.ip}:${vncPort}/vnc/vnc_lite.html?host=${host.ip}&port=${vncPort}&path=websockify&encrypt=0${vncPassword ? `&password=${vncPassword}` : ''}`
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[95vw] max-w-none sm:max-w-none h-[90vh] p-0 overflow-hidden [&>button]:hidden">
        <div className="flex flex-col h-full">
          {/* Header with Title, Tabs, and Close Button */}
          <div className="flex items-center justify-between p-3 border-b bg-background">
            <div className="flex items-center space-x-3">
              <Monitor className="h-5 w-5" />
              <DialogTitle className="text-lg font-semibold">
                Browser Automation - {host.name}
              </DialogTitle>
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>

            {/* Tab Navigation - centered */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('vnc')}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                    activeTab === 'vnc'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  disabled={!vncUrl}
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
                  disabled={!supportsTerminal(host)}
                >
                  Terminal
                </button>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content Area - Both tabs stay mounted, just hidden/shown */}
          <div className="flex-1 overflow-hidden relative">
            {/* VNC Tab */}
            <div className={`h-full absolute inset-0 ${activeTab === 'vnc' ? 'block' : 'hidden'}`}>
              {!vncUrl ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <Monitor className="h-12 w-12 text-gray-400 mx-auto" />
                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">
                      VNC Not Available
                    </h3>
                    <p className="text-gray-500 max-w-md">
                      This host doesn't have VNC configured. You can still use the terminal to run
                      browser automation scripts.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* VNC Loading State - only show when actually loading */}
                  {isVncLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span className="mt-2 text-gray-500">Connecting to VNC...</span>
                      </div>
                    </div>
                  )}

                  {/* VNC iframe - always mounted */}
                  <iframe
                    src={vncUrl}
                    className="w-full h-full"
                    style={{
                      border: 'none',
                      display: 'block',
                    }}
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    onLoad={handleVncLoad}
                    title={`VNC Stream - ${host.name}`}
                  />
                </>
              )}
            </div>

            {/* Terminal Tab */}
            <div
              className={`h-full absolute inset-0 ${activeTab === 'terminal' ? 'block' : 'hidden'}`}
            >
              {!supportsTerminal(host) ? (
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
