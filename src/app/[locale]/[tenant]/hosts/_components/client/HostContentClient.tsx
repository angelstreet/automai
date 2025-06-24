'use client';

import { Server, PlusCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { getActiveWorkspace } from '@/app/actions/workspaceAction';
import { Button } from '@/components/shadcn/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useHost } from '@/hooks/useHost';
import { Host } from '@/types/component/hostComponentType';

import HostEventListener, { HostsEvents } from './HostEventListener';
import { HostGridClient } from './HostGridClient';
import { HostTableClient } from './HostTableClient';
import { TerminalContainer } from './TerminalContainer';

interface HostContentClientProps {
  initialHosts: Host[];
  viewMode: 'grid' | 'table';
}

/**
 * Client component for displaying and managing hosts
 * Supports both grid and table views with React Query for state management
 */
export default function HostContentClient({ initialHosts, viewMode }: HostContentClientProps) {
  // Initialize React Query with initial data from server
  const {
    hosts: queryHosts,
    deleteHost: deleteHostMutation,
    testConnection: testConnectionMutation,
  } = useHost();

  // Use state for hosts with initialHosts as initial value
  // This will be updated by React Query when data is fetched
  const [hosts, setHosts] = useState<Host[]>(initialHosts);
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());

  // Workspace filtering
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);
  const [filteredHosts, setFilteredHosts] = useState<Host[]>(initialHosts);

  // Client-side only view component rendering to prevent hydration issues
  const [isClient, setIsClient] = useState(false);

  // Log when viewMode changes
  useEffect(() => {
    console.log(`[@component:HostListClient] View mode changed to: ${viewMode}`);
  }, [viewMode]);

  // Update hosts when query data changes
  useEffect(() => {
    if (queryHosts && queryHosts.length > 0) {
      setHosts(queryHosts);
    }
  }, [queryHosts]);

  // Fetch active workspace and related hosts
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        // Get active workspace
        const workspaceResult = await getActiveWorkspace();
        if (workspaceResult.success) {
          setActiveWorkspace(workspaceResult.data || null);
        }
      } catch (error) {
        console.error('[@component:HostContentClient] Error fetching workspace data:', error);
      }
    };

    fetchWorkspaceData();

    // Listen for workspace change events
    const handleWorkspaceChange = () => {
      console.log('[@component:HostContentClient] Workspace change detected, refreshing data');
      fetchWorkspaceData();
    };

    // Add event listener for workspace changes
    window.addEventListener(HostsEvents.WORKSPACE_CHANGED, handleWorkspaceChange);

    // Cleanup function
    return () => {
      window.removeEventListener(HostsEvents.WORKSPACE_CHANGED, handleWorkspaceChange);
    };
  }, []);

  // Filter hosts whenever hosts or active workspace changes
  useEffect(() => {
    const filterByWorkspace = async () => {
      if (activeWorkspace) {
        console.log(
          '[@component:HostContentClient] Filtering by active workspace:',
          activeWorkspace,
        );

        // Filter hosts using the workspaces array that comes directly from the database
        const filtered = hosts.filter((host) => {
          const hostWorkspaces = (host as any).workspaces || [];
          return hostWorkspaces.includes(activeWorkspace);
        });

        setFilteredHosts(filtered);
        console.log(
          `[@component:HostContentClient] Filtered to ${filtered.length} hosts in workspace using direct workspace data`,
        );
      } else {
        // If no active workspace, show all hosts
        setFilteredHosts(hosts);
        console.log(
          `[@component:HostContentClient] No active workspace, showing all ${hosts.length} hosts`,
        );
      }
    };

    filterByWorkspace();
  }, [hosts, activeWorkspace]);

  // Create helper functions to handle test start/complete
  const handleTestStarted = useCallback((hostId: string) => {
    console.log(`[@component:HostListClient] Dispatching HOST_TESTING_START for host ${hostId}`);
    window.dispatchEvent(
      new CustomEvent(HostsEvents.HOST_TESTING_START, {
        detail: { hostId },
      }),
    );
  }, []);

  const handleTestCompleted = useCallback((hostId: string) => {
    console.log(`[@component:HostListClient] Dispatching HOST_TESTING_COMPLETE for host ${hostId}`);
    window.dispatchEvent(
      new CustomEvent(HostsEvents.HOST_TESTING_COMPLETE, {
        detail: { hostId },
      }),
    );
  }, []);

  // Handle connection test for a host
  const handleTestConnection = useCallback(
    async (host: Host): Promise<boolean> => {
      try {
        console.log(
          `[@component:HostListClient] Testing connection for host: ${host.name} (${host.id})`,
        );

        // Dispatch event for test start
        handleTestStarted(host.id);

        // Set status to testing only if it's not already set
        // This handles individual card refresh without interfering with batch testing
        setHosts((prevHosts) =>
          prevHosts.map((h) => {
            if (h.id === host.id && h.status !== 'testing') {
              return { ...h, status: 'testing' };
            }
            return h;
          }),
        );

        // Call the mutation - no initial delay for better responsiveness
        const result = await testConnectionMutation(host.id);
        console.log(
          `[@component:HostListClient] Test connection result for host ${host.id}:`,
          result,
        );

        // Minimal delay before updating final status to prevent flickering
        await new Promise((resolve) => setTimeout(resolve, 30));

        // Update the UI based on result
        setHosts((prevHosts) =>
          prevHosts.map((h) =>
            h.id === host.id ? { ...h, status: result.success ? 'connected' : 'failed' } : h,
          ),
        );

        // Dispatch event for test completion
        handleTestCompleted(host.id);

        return result.success;
      } catch (error) {
        console.error(
          `[@component:HostListClient] Error testing connection for host ${host.id}:`,
          error,
        );

        // Update the host status to failed
        setHosts((prevHosts) =>
          prevHosts.map((h) => (h.id === host.id ? { ...h, status: 'failed' } : h)),
        );

        // Still dispatch completion event on error
        handleTestCompleted(host.id);

        return false;
      }
    },
    [testConnectionMutation, setHosts, handleTestStarted, handleTestCompleted],
  );

  // Test all hosts
  const testAllHosts = useCallback(
    async (hostIds: string[]) => {
      console.log(`[@component:HostListClient] Testing all hosts: ${hostIds.length} hosts`);

      // Update all hosts to 'testing' status first for visible animation - immediate visual feedback
      setHosts((prevHosts) =>
        prevHosts.map((h) => (hostIds.includes(h.id) ? { ...h, status: 'testing' } : h)),
      );

      // For better UX, start several tests immediately, then stagger the rest
      hostIds.forEach((hostId, index) => {
        const host = hosts.find((h) => h.id === hostId);
        if (host) {
          // Start first 3 tests immediately for better responsiveness
          const delay = index < 3 ? 0 : index * 100;
          setTimeout(() => {
            console.log(
              `[@component:HostListClient] Starting test for host ${index + 1}/${hostIds.length}: ${hostId}`,
            );
            handleTestConnection(host);
          }, delay);
        }
      });
    },
    [hosts, handleTestConnection],
  );

  // Listen for TEST_ALL_HOSTS event
  useEffect(() => {
    const handleTestAllHosts = (event: CustomEvent) => {
      console.log('[@component:HostListClient] Received TEST_ALL_HOSTS event', event);
      if (event.detail && event.detail.hostIds) {
        testAllHosts(event.detail.hostIds);
      }
    };

    window.addEventListener(HostsEvents.TEST_ALL_HOSTS, handleTestAllHosts as EventListener);

    return () => {
      window.removeEventListener(HostsEvents.TEST_ALL_HOSTS, handleTestAllHosts as EventListener);
    };
  }, [testAllHosts]);

  // Handle host selection
  const handleSelectHost = (host: Host | string) => {
    const hostId = typeof host === 'string' ? host : host.id;
    const newSelectedHosts = new Set(selectedHosts);

    if (newSelectedHosts.has(hostId)) {
      newSelectedHosts.delete(hostId);
    } else {
      newSelectedHosts.add(hostId);
    }

    setSelectedHosts(newSelectedHosts);
  };

  // Handle host deletion
  const handleDeleteHost = async (host: Host | string) => {
    const hostId = typeof host === 'string' ? host : host.id;

    try {
      const result = await deleteHostMutation(hostId);

      if (result.success) {
        // Remove from local state immediately for better UX
        setHosts((prevHosts) => prevHosts.filter((h) => h.id !== hostId));

        // Remove from selection if selected
        if (selectedHosts.has(hostId)) {
          const newSelectedHosts = new Set(selectedHosts);
          newSelectedHosts.delete(hostId);
          setSelectedHosts(newSelectedHosts);
        }
      }
    } catch (error) {
      console.error('[@client:hosts:HostListClient] Error deleting host:', error);
    }
  };

  // Debug log to show what hosts are being rendered
  useEffect(() => {
    console.log(
      `[@component:HostContentClient] Rendering with ${filteredHosts.length} filtered hosts (out of ${hosts.length} total hosts)`,
    );
    console.log(`[@component:HostContentClient] Active workspace: ${activeWorkspace || 'none'}`);
  }, [filteredHosts, hosts, activeWorkspace]);

  // Set isClient to true on client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Empty state for no hosts
  if (filteredHosts.length === 0 && hosts.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Server className="h-10 w-10" />}
          title="No hosts found"
          description="Add your first host to get started"
          action={
            <Button
              onClick={() => window.dispatchEvent(new Event(HostsEvents.OPEN_HOST_DIALOG))}
              size="sm"
              className="gap-1"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Host</span>
            </Button>
          }
        />
      </div>
    );
  }

  // Show empty state if workspace filter returns no results
  if (filteredHosts.length === 0 && hosts.length > 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Server className="h-10 w-10" />}
          title="No hosts in current workspace"
          description="Add hosts to this workspace or switch workspaces"
          action={
            <Button
              onClick={() => window.dispatchEvent(new Event(HostsEvents.OPEN_HOST_DIALOG))}
              size="sm"
              className="gap-1"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Host</span>
            </Button>
          }
        />
      </div>
    );
  }

  // Render the view based on current state and view mode
  return (
    <>
      <HostEventListener />
      <TerminalContainer />
      <div className="space-y-4 p-4">
        {!isClient ? (
          // Server-side placeholder with minimal content to avoid hydration mismatch
          <div className="min-h-[200px] rounded-md border p-4 animate-pulse bg-muted/10"></div>
        ) : viewMode === 'grid' ? (
          <HostGridClient
            hosts={filteredHosts}
            selectedHosts={selectedHosts}
            selectMode={false}
            onSelect={handleSelectHost}
            onDelete={handleDeleteHost}
            onTestConnection={handleTestConnection}
            activeWorkspace={activeWorkspace}
          />
        ) : (
          <HostTableClient
            hosts={filteredHosts}
            selectedHosts={selectedHosts}
            selectMode={false}
            onSelect={handleSelectHost}
            onDelete={handleDeleteHost}
            onTestConnection={handleTestConnection}
            activeWorkspace={activeWorkspace}
          />
        )}
      </div>
    </>
  );
}
