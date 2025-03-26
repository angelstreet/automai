'use client';

import { Plus, RefreshCw, Grid, List } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { clearRequestCache } from '@/hooks/useRequestProtection';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Host } from '../types';
import { useHost, useUser } from '@/context';
import { addHost as addHostAction, testHostConnection } from '../actions';

import { ConnectionForm, FormData } from './ConnectionForm';
import { HostGrid } from './HostGrid';
import { HostTable } from './HostTable';

export default function HostContainer() {
  // Track render count for debugging
  const renderCount = useRef(0);
  const isInitialized = useRef(false);

  // Get contexts first - all hooks must be called in the same order every render
  const userContext = useUser();
  const hostContext = useHost();

  // Add better logging to diagnose context issues
  useEffect(() => {
    console.log('[HostContainer] Initial context check:', {
      hasUserContext: !!userContext,
      hasHostContext: !!hostContext,
      isHostContextLoading: hostContext?.loading,
      hostCount: hostContext?.hosts?.length || 0,
    });
  }, [userContext, hostContext]);

  // Group all state declarations after context hooks
  const [showAddHost, setShowAddHost] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [selectMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    password: '',
  });

  // Add logging for component mount
  useEffect(() => {
    renderCount.current++;
    console.log(`[HostContainer] mounted (render #${renderCount.current})`);

    return () => {
      console.log('[HostContainer] unmounted');
    };
  }, []);

  // Add safety check for null context during initial render
  if (!hostContext) {
    console.log('[HostContainer] Host context not yet available, showing loading state');
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="h-8 w-8 animate-spin mb-4 border-t-2 border-b-2 border-primary rounded-full"></div>
        <p className="text-muted-foreground">Initializing host service...</p>
      </div>
    );
  }

  // Extract methods from context with safe fallbacks
  const { hosts = [], loading = false, error = null, fetchHosts = async () => {} } = hostContext;

  // Memoize user data to prevent dependency loop
  const userData = userContext?.user;

  // Set initial loading state based on persisted data
  useEffect(() => {
    // If we have hosts data immediately, don't show loading at all
    if (hosts.length > 0) {
      setIsInitialLoading(false);
    }
  }, []); // Run only once on mount

  // Add logging to track when host data changes
  useEffect(() => {
    if (hosts?.length > 0) {
      console.log('[HostContainer] Hosts data updated', {
        hostCount: hosts?.length || 0,
        loading,
        error,
        renderCount: renderCount.current,
      });
      // When hosts data arrives, immediately stop loading
      setIsInitialLoading(false);
    }
  }, [hosts, loading, error]);

  // Use direct SWR pattern for initial data fetching
  useEffect(() => {
    // Only fetch if we don't have hosts and fetchHosts is available
    if (fetchHosts && (!hosts || hosts.length === 0)) {
      console.log('[HostContainer] No hosts found, fetching data with SWR');
      
      // Only show loading if we don't have hosts yet
      setIsInitialLoading(true);
      
      // Set a timeout to stop loading after max 1 second
      const timeoutId = setTimeout(() => {
        setIsInitialLoading(false);
      }, 1000);
      
      // Fetch hosts data via SWR context
      fetchHosts()
        .catch(error => {
          console.error('[HostContainer] Error fetching hosts:', error);
        })
        .finally(() => {
          clearTimeout(timeoutId);
          setIsInitialLoading(false);
          isInitialized.current = true;
        });
        
      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      isInitialized.current = true;
      console.log('[HostContainer] Hosts already loaded:', hosts?.length);
    }
  }, []); // Empty dependency array - only runs once on mount

  // Create a memoized test connection handler
  const handleTestConnection = useCallback(
    async (host: Host) => {
      console.log('[HostList] Test connection triggered for host:', host.id);

      if (!testHostConnection) {
        console.error('[HostList] testConnection not available from context');
        return false;
      }

      try {
        setIsRefreshing(true);

        // The context's testConnection function will handle the animation state
        const result = await testHostConnection(host.id);
        console.log('[HostList] Test connection result:', result);

        // Refresh the hosts list to get updated statuses
        if (fetchHosts) {
          await fetchHosts();
        }

        return result;
      } catch (error) {
        console.error('[HostList] Test connection error:', error);
        return false;
      } finally {
        setIsRefreshing(false);
      }
    },
    [testHostConnection, fetchHosts],
  );

  // Handle refresh all hosts - pass user data from context
  const handleRefreshAll = useCallback(async () => {
    if (isRefreshing) return;

    console.log('[HostContainer] Refreshing all hosts');
    setIsRefreshing(true);

    try {
      // Simple approach: just loop through all hosts and call the individual refresh
      for (const host of hosts) {
        await handleTestConnection(host);
        // Small delay between hosts to improve visual feedback
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      console.log('[HostContainer] All hosts tested successfully');
    } catch (error) {
      console.error('[HostContainer] Error refreshing hosts:', error);
    } finally {
      setIsRefreshing(false);
      console.log('[HostContainer] Host refresh complete');
    }
  }, [isRefreshing, handleTestConnection, hosts]);

  // Handle add host form submission with user data
  const handleSaveHost = useCallback(async () => {
    console.log('[HostContainer] Saving new host', formData.name);
    setIsSaving(true);
    try {
      const hostData = {
        name: formData.name,
        description: formData.description,
        type: formData.type as 'ssh' | 'docker' | 'portainer',
        ip: formData.ip,
        port: parseInt(formData.port),
        user: formData.username,
        password: formData.password,
        status: 'connected' as const,
        created_at: new Date(),
        updated_at: new Date(),
        is_windows: false,
      };

      // Call the server action directly, without user data
      const result = await addHostAction(hostData);

      if (result.success) {
        // Close dialog
        setShowAddHost(false);

        // Reset form
        setFormData({
          name: '',
          description: '',
          type: 'ssh',
          ip: '',
          port: '22',
          username: '',
          password: '',
        });

        // Clear the request cache before fetching new hosts
        clearRequestCache('fetchHosts');

        // Refresh the hosts list using direct SWR pattern
        if (fetchHosts) {
          await fetchHosts().catch(error => {
            console.error('[HostContainer] Error fetching hosts after adding new host:', error);
          });
        }
      } else {
        console.error('[HostContainer] Error adding host:', result.error);
      }
    } catch (error) {
      console.error('[HostContainer] Error adding host:', error);
    } finally {
      setIsSaving(false);
    }
  }, [formData, fetchHosts]);

  // Handle host selection
  const handleSelectHost = useCallback((id: string) => {
    console.log('[DEBUG] HostContainer: host selection changed', id);
    setSelectedHosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Implement a proper removeHost function that calls the server action directly
  const removeHost = useCallback(
    async (id: string) => {
      try {
        console.log('[HostContainer] Attempting to delete host ID:', id);

        // Import the deleteHost action
        const { deleteHost } = await import('../actions');

        // Call the server action directly instead of the context function
        const result = await deleteHost(id);

        if (result.success) {
          console.log('[HostContainer] Host deleted successfully');

          // Clear the request cache before fetching new hosts
          clearRequestCache('fetchHosts');

          // Refresh hosts list after deletion
          fetchHosts && fetchHosts();
        } else {
          console.error('[HostContainer] Failed to delete host:', result.error);
        }
      } catch (error) {
        console.error('[HostContainer] Error deleting host:', error);
      }
    },
    [fetchHosts],
  );

  // Debug rendering - only log if state changes
  useEffect(() => {
    console.log('[DEBUG] HostContainer rendering', {
      hostCount: hosts?.length || 0,
      loading,
      viewMode,
    });
  }, [hosts?.length, loading, viewMode]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <div className="border rounded-md p-1 mr-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="px-2"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="px-2"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleRefreshAll}
            variant="outline"
            size="sm"
            disabled={isRefreshing || loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddHost(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Host
          </Button>
        </div>
      </div>

      {/* Show loading only if we have no hosts and are in loading state */}
      {(isInitialLoading || loading) && hosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-12 w-12 animate-spin mb-4 border-t-2 border-b-2 border-primary rounded-full"></div>
          <p className="text-lg font-medium text-muted-foreground">Loading hosts...</p>
        </div>
      ) : hosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-lg border border-dashed">
          <div className="mb-4 p-4 rounded-full bg-muted/30">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mb-2 text-lg font-medium">No hosts found</p>
          <p className="text-muted-foreground mb-4">Add your first host to get started</p>
          <Button onClick={() => setShowAddHost(true)} className="mt-2">
            Add Host
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <HostGrid
          hosts={hosts}
          selectedHosts={selectedHosts}
          selectMode={selectMode}
          onSelect={handleSelectHost}
          onDelete={removeHost}
          onTestConnection={handleTestConnection}
        />
      ) : (
        <HostTable hosts={hosts} onDelete={removeHost} onTestConnection={handleTestConnection} />
      )}

      <Dialog open={showAddHost} onOpenChange={setShowAddHost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Host</DialogTitle>
          </DialogHeader>
          <ConnectionForm
            formData={formData}
            onChange={setFormData}
            onSubmit={handleSaveHost}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
