'use client';

import { X, Terminal as TerminalIcon, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/shadcn/dialog';
import { Host } from '@/types/component/hostComponentType';

import { TerminalEmulator } from './TerminalEmulator';
import { TerminalHeader } from './TerminalHeader';

interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: Host | null;
}

export function TerminalModal({ isOpen, onClose, host }: TerminalModalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Reset state when modal opens/closes or host changes
  useEffect(() => {
    if (!isOpen || !host) {
      setIsConnected(false);
      setIsConnecting(false);
      setSessionId(null);
      setConnectionError(null);
    }
  }, [isOpen, host]);

  // Initialize terminal session when modal opens
  useEffect(() => {
    if (isOpen && host && !sessionId && !isConnecting) {
      initializeSession();
    }
  }, [isOpen, host, sessionId, isConnecting]);

  const initializeSession = async () => {
    if (!host) return;

    console.log(`[@component:TerminalModal] Initializing session for host: ${host.name}`);
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Import terminal action
      const { initTerminal } = await import('@/app/actions/terminalsAction');

      const result = await initTerminal(host.id);

      if (result.success && result.data) {
        console.log(`[@component:TerminalModal] Session initialized: ${result.data.sessionId}`);
        setSessionId(result.data.sessionId);
        setIsConnected(true);
      } else {
        console.error(`[@component:TerminalModal] Failed to initialize session:`, result.error);
        setConnectionError(result.error || 'Failed to initialize terminal session');
      }
    } catch (error) {
      console.error(`[@component:TerminalModal] Error initializing session:`, error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = async () => {
    console.log(`[@component:TerminalModal] Closing terminal modal`);

    // Close session if active
    if (sessionId) {
      try {
        const { closeTerminal } = await import('@/app/actions/terminalsAction');
        await closeTerminal(sessionId);
        console.log(`[@component:TerminalModal] Session closed: ${sessionId}`);
      } catch (error) {
        console.error(`[@component:TerminalModal] Error closing session:`, error);
      }
    }

    onClose();
  };

  const handleRetry = () => {
    setSessionId(null);
    setConnectionError(null);
    setIsConnected(false);
  };

  if (!host) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[90vw] max-w-none sm:max-w-none h-[550px] p-0 overflow-hidden [&>button]:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-1 border-b bg-background">
            <div className="flex items-center space-x-3">
              <TerminalIcon className="h-5 w-5" />
              <DialogTitle className="text-lg font-semibold">Terminal - {host.name}</DialogTitle>
              <div className="flex items-center space-x-2">
                {isConnecting ? (
                  <WifiOff className="h-4 w-4 text-yellow-500 animate-pulse" />
                ) : isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Terminal Header with host info */}
          <TerminalHeader host={host} isConnected={isConnected} isConnecting={isConnecting} />

          {/* Terminal Content */}
          <div className="flex-1 bg-black overflow-hidden">
            {connectionError ? (
              <div className="flex flex-col items-center justify-center h-full text-white p-8">
                <div className="text-center space-y-4">
                  <WifiOff className="h-12 w-12 text-red-400 mx-auto" />
                  <h3 className="text-lg font-medium text-red-400">Connection Failed</h3>
                  <p className="text-gray-300 max-w-md">{connectionError}</p>
                  <Button variant="outline" onClick={handleRetry} className="mt-4">
                    Retry Connection
                  </Button>
                </div>
              </div>
            ) : isConnecting ? (
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
            ) : sessionId ? (
              <TerminalEmulator
                sessionId={sessionId}
                host={host}
                onConnectionStatusChange={setIsConnected}
              />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
