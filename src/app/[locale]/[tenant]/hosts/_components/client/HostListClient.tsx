'use client';

import { Server, PlusCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/shadcn/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useHost } from '@/hooks/useHost';
import { useHostViewStore } from '@/store/hostViewStore';
import { Host } from '@/types/component/hostComponentType';

import { HostGridClient } from './HostGridClient';
import { HostTableClient } from './HostTableClient';
import { HostsEvents } from './HostsEventListener';

interface HostListClientProps {
  initialHosts: Host[];
}

/**
 * Client component for displaying and managing hosts
 * Supports both grid and table views with React Query for state management
 */
export { HostListClient as default, HostListClient };

function HostListClient({ initialHosts }: HostListClientProps) {
  // Initialize React Query with initial data from server
  const {
    hosts: queryHosts,
    deleteHost: deleteHostMutation,
    testConnection: testConnectionMutation,
  } = useHost();

  // Get view mode from Zustand store
  const { viewMode } = useHostViewStore();

  // Use state for hosts with initialHosts as initial value
  // This will be updated by React Query when data is fetched
  const [hosts, setHosts] = useState<Host[]>(initialHosts);
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());

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

        // Force the status to 'testing' to ensure animation is visible
        // Use a separate setState call to ensure it gets processed
        setHosts((prevHosts) =>
          prevHosts.map((h) => (h.id === host.id ? { ...h, status: 'testing' } : h)),
        );

        // Small delay to ensure the testing state is visually apparent
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Call the mutation
        const result = await testConnectionMutation(host.id);
        console.log(
          `[@component:HostListClient] Test connection result for host ${host.id}:`,
          result,
        );

        // Small delay before updating final status to ensure animation is visible
        await new Promise((resolve) => setTimeout(resolve, 100));

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

      // Update all hosts to 'testing' status first for visible animation
      setHosts((prevHosts) =>
        prevHosts.map((h) => (hostIds.includes(h.id) ? { ...h, status: 'testing' } : h)),
      );

      // Add small delay to ensure the status updates are rendered
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Start tests with staggered delays for better visual feedback
      hostIds.forEach((hostId, index) => {
        const host = hosts.find((h) => h.id === hostId);
        if (host) {
          // Add staggered delay between each test (100ms per host)
          setTimeout(() => {
            console.log(
              `[@component:HostListClient] Starting test for host ${index + 1}/${hostIds.length}: ${hostId}`,
            );
            handleTestConnection(host);
          }, index * 100);
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

  // Empty state for no hosts
  if (hosts.length === 0) {
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

  // Client-side only view component rendering to prevent hydration issues
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Render the appropriate view based on viewMode
  return (
    <div className="space-y-4 p-4">
      {!isClient ? (
        // Server-side placeholder with minimal content to avoid hydration mismatch
        <div className="min-h-[200px] rounded-md border p-4 animate-pulse bg-muted/10"></div>
      ) : viewMode === 'grid' ? (
        <HostGridClient
          hosts={hosts}
          selectedHosts={selectedHosts}
          selectMode={false}
          onSelect={handleSelectHost}
          onDelete={handleDeleteHost}
          onTestConnection={handleTestConnection}
        />
      ) : (
        <HostTableClient
          hosts={hosts}
          selectedHosts={selectedHosts}
          selectMode={false}
          onSelect={handleSelectHost}
          onDelete={handleDeleteHost}
          onTestConnection={handleTestConnection}
        />
      )}
    </div>
  );
}
