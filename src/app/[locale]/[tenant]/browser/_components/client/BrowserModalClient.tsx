'use client';

import { X, Monitor, Wifi, WifiOff, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/shadcn/dialog';
import { Host } from '@/types/component/hostComponentType';

import { endBrowserSession } from '@/app/actions/browserActions';

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

  // Reset state when modal opens/closes or host changes
  useEffect(() => {
    if (!isOpen || !host) {
      setIsVncLoading(true);
      setIsConnected(false);
      setActiveTab('vnc');
    } else {
      setIsConnected(true);
    }
  }, [isOpen, host]);

  // Handle VNC iframe load
  const handleVncLoad = () => {
    setIsVncLoading(false);
  };

  const handleClose = async () => {
    console.log(`[@component:BrowserModalClient] Closing browser modal`);

    // End session if active
    if (sessionId && host) {
      try {
        await endBrowserSession(sessionId, host.id);
        console.log(`[@component:BrowserModalClient] Session ended: ${sessionId}`);
      } catch (error) {
        console.error(`[@component:BrowserModalClient] Error ending session:`, error);
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
          {/* Header */}
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
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Host Info */}
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span>
                  Host: {host.ip}:{host.port || 22}
                </span>
                <span>Session: {sessionId}</span>
              </div>
              <div className="flex items-center space-x-2">
                {vncPort && (
                  <span className="text-green-600 dark:text-green-400">
                    VNC: {host.ip}:{vncPort}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b bg-background">
            <button
              onClick={() => setActiveTab('vnc')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'vnc'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              disabled={!vncUrl}
            >
              VNC Display {!vncUrl && '(Not Available)'}
            </button>
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'terminal'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Terminal
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'vnc' && (
              <div className="h-full relative">
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
                    {/* VNC Loading State */}
                    {isVncLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                          <span className="mt-2 text-gray-500">Connecting to VNC...</span>
                        </div>
                      </div>
                    )}

                    {/* VNC iframe */}
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
            )}

            {activeTab === 'terminal' && (
              <div className="h-full bg-black">
                <BrowserTerminalClient sessionId={sessionId} host={host} />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simple terminal component for browser commands
function BrowserTerminalClient({ sessionId, host }: { sessionId: string; host: Host }) {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const executeCommand = async () => {
    if (!command.trim() || isExecuting) return;

    setIsExecuting(true);
    setOutput((prev) => [...prev, `$ ${command}`]);

    try {
      const { sendTerminalData } = await import('@/app/actions/terminalsAction');
      const result = await sendTerminalData(sessionId, command);

      if (result.success && result.data) {
        if (result.data.stdout) {
          setOutput((prev) => [...prev, result.data.stdout]);
        }
        if (result.data.stderr) {
          setOutput((prev) => [...prev, `ERROR: ${result.data.stderr}`]);
        }
      } else {
        setOutput((prev) => [...prev, `ERROR: ${result.error || 'Command failed'}`]);
      }
    } catch (error) {
      setOutput((prev) => [
        ...prev,
        `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ]);
    } finally {
      setIsExecuting(false);
      setCommand('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    }
  };

  return (
    <div className="h-full flex flex-col p-4 text-white font-mono text-sm">
      <div className="flex-1 overflow-y-auto mb-4">
        <div className="text-green-400 mb-2">
          Connected to {host.name} ({host.ip})
        </div>
        <div className="text-gray-300 mb-4">
          Use this terminal to run browser automation commands like:
          <br />• playwright codegen
          <br />• node browser-script.js
          <br />• python playwright-script.py
        </div>

        {output.map((line, index) => (
          <div key={index} className="mb-1">
            {line}
          </div>
        ))}

        {isExecuting && <div className="text-yellow-400">Executing...</div>}
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-green-400">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isExecuting}
          placeholder="Enter command..."
          className="flex-1 bg-transparent border-none outline-none text-white"
        />
        <button
          onClick={executeCommand}
          disabled={!command.trim() || isExecuting}
          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
        >
          Run
        </button>
      </div>
    </div>
  );
}
