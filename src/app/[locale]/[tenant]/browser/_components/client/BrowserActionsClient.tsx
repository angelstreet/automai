'use client';

import { Lock, Monitor, Play, Square, Loader2 } from 'lucide-react';
import { useState } from 'react';

import {
  startBrowserSession,
  forceTakeControlBrowserHost,
  endBrowserSession,
} from '@/app/actions/browserActions';
import { Button } from '@/components/shadcn/button';
import { useToast } from '@/components/shadcn/use-toast';
import { useBrowserAutomation } from '@/context';
import { Host } from '@/types/component/hostComponentType';
import { User } from '@/types/service/userServiceType';

interface BrowserActionsClientProps {
  initialHosts: Host[];
  currentUser: User;
}

export function BrowserActionsClient({ initialHosts, currentUser }: BrowserActionsClientProps) {
  const { toast } = useToast();
  const {
    isInitialized,
    setIsInitialized,
    setStartTime,
    activeHost,
    setActiveHost,
    sessionId,
    setSessionId,
  } = useBrowserAutomation();

  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Browser automation state
  const [isInitializing, setIsInitializing] = useState(false);

  // Host reservation state - tracks if current user has reserved a host
  const [hasReservedHost, setHasReservedHost] = useState(false);

  // Filter to only show Linux and Windows hosts
  const browserHosts = initialHosts.filter(
    (host) => host.device_type === 'linux' || host.device_type === 'windows',
  );

  const handleHostChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    console.log(`[@component:BrowserActionsClient] Host selection changed to: ${newValue}`);
    setSelectedHostId(newValue);
  };

  // Initialize browser automation
  const handleInitializeAutomation = async () => {
    if (!hasReservedHost) {
      toast({
        title: 'Error',
        description: 'Please take control of a host first before starting automation.',
        variant: 'destructive',
      });
      return;
    }

    setIsInitializing(true);

    toast({
      title: 'Browser Automation',
      description: 'Initializing browser automation system...',
    });

    // Simulate initialization process
    setTimeout(() => {
      const startTime = new Date().toLocaleString();
      setIsInitialized(true);
      setStartTime(startTime);
      setIsInitializing(false);

      toast({
        title: 'Success',
        description: 'Browser automation initialized successfully!',
      });
    }, 2000);
  };

  // Stop browser automation
  const handleStopAutomation = async () => {
    toast({
      title: 'Browser Automation',
      description: 'Stopping browser automation system...',
    });

    // Simulate cleanup process
    setTimeout(() => {
      setIsInitialized(false);
      setStartTime(null);

      toast({
        title: 'Success',
        description: 'Browser automation stopped successfully!',
      });
    }, 1000);
  };

  const handleTakeControl = async () => {
    if (!selectedHostId) {
      console.warn(`[@component:BrowserActionsClient] No host selected for take control`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[@component:BrowserActionsClient] Taking control of host: ${selectedHostId}`);

      const selectedHost = browserHosts.find((host) => host.id === selectedHostId);
      const isOccupied = selectedHost?.reserved_by && selectedHost.reserved_by !== currentUser.id;

      // If host is occupied, force take control
      if (isOccupied) {
        const forceResult = await forceTakeControlBrowserHost(selectedHostId);
        if (!forceResult.success) {
          setError(forceResult.error || 'Failed to force take control');
          return;
        }
      }

      // Start session
      const result = await startBrowserSession(selectedHostId);

      if (result.success && result.data) {
        console.log(`[@component:BrowserActionsClient] Session started successfully`);
        if (result.data.host && result.data.sessionId) {
          setActiveHost(result.data.host);
          setSessionId(result.data.sessionId);
          setHasReservedHost(true); // Enable automation controls

          toast({
            title: 'Success',
            description: `Connected to ${result.data.host.name}`,
          });
        }
      } else {
        setError(result.error || 'Failed to start browser session');
      }
    } catch (error: any) {
      console.error(`[@component:BrowserActionsClient] Error taking control:`, error);
      setError(error.message || 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReleaseControl = async () => {
    console.log(`[@component:BrowserActionsClient] Releasing host control`);

    // End browser session if active
    if (sessionId && activeHost) {
      try {
        await endBrowserSession(sessionId, activeHost.id);
        console.log(`[@component:BrowserActionsClient] Browser session ended: ${sessionId}`);
        setHasReservedHost(false); // Disable automation controls

        // Also stop automation if it was running
        if (isInitialized) {
          setIsInitialized(false);
          setStartTime(null);
        }

        toast({
          title: 'Success',
          description: 'Host control released',
        });
      } catch (error) {
        console.error(`[@component:BrowserActionsClient] Error ending browser session:`, error);
      }
    }

    setActiveHost(null);
    setSessionId(null);
  };

  const selectedHost = browserHosts.find((host) => host.id === selectedHostId);
  const isHostLocked = selectedHost?.reserved_by && selectedHost.reserved_by !== currentUser.id;
  const isButtonDisabled = !selectedHostId || isLoading;

  if (browserHosts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Monitor className="h-4 w-4" />
        No Linux/Windows hosts available
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4">
        {/* Browser Automation Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleInitializeAutomation}
            disabled={!hasReservedHost || isInitializing || isInitialized}
            size="sm"
            className="h-8 gap-1 w-24"
            variant={isInitialized ? 'secondary' : 'default'}
            title={!hasReservedHost ? 'Take control of a host first' : ''}
          >
            {isInitializing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isInitializing ? 'Init...' : 'Start'}
          </Button>

          <Button
            onClick={handleStopAutomation}
            disabled={!hasReservedHost || !isInitialized || isInitializing}
            size="sm"
            variant="destructive"
            className="h-8 gap-1 w-20"
            title={!hasReservedHost ? 'Take control of a host first' : ''}
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Host Selection and Control */}
        <div className="flex items-center gap-2">
          {/* Host Selection Dropdown */}
          <div className="relative">
            <select
              value={selectedHostId}
              onChange={handleHostChange}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 w-52 cursor-pointer [&>option]:bg-white [&>option]:dark:bg-gray-700 [&>option]:text-black [&>option]:dark:text-white"
              style={{
                position: 'relative',
                zIndex: 10,
              }}
            >
              <option value="">Select host...</option>
              {browserHosts.map((host) => {
                const isLocked = host.reserved_by && host.reserved_by !== currentUser.id;

                return (
                  <option key={host.id} value={host.id}>
                    {host.name} ({host.device_type}){isLocked ? ' (Locked)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Lock Icon for Locked Hosts */}
          {isHostLocked && <Lock className="h-4 w-4 text-red-500" />}

          {/* Take Control / Release Control Button */}
          {!hasReservedHost ? (
            <Button
              size="sm"
              onClick={handleTakeControl}
              disabled={isButtonDisabled}
              className="h-8 gap-1 w-32"
            >
              <Monitor className="h-4 w-4" />
              {isLoading ? 'Taking...' : 'Take Control'}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleReleaseControl}
              variant="outline"
              className="h-8 gap-1 w-32"
            >
              <Monitor className="h-4 w-4" />
              Release
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed top-4 right-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4">
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
