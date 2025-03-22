'use client';

import { Plus, RefreshCw, Grid, List } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Host } from '../types';
import { useHost, useUser } from '@/context';

import { ConnectionForm, FormData } from './ConnectionForm';
import { HostGrid } from './HostGrid';
import { HostTable } from './HostTable';

export default function HostContainer() {
  // Track render count for debugging
  const renderCount = useRef(0);
  const isInitialized = useRef(false);
  
  // Add logging for component mount
  useEffect(() => {
    renderCount.current++;
    console.log(`[HostContainer] mounted (render #${renderCount.current})`);
    
    return () => {
      console.log('[HostContainer] unmounted');
    };
  }, []);
  
  // Get user data from context
  const userContext = useUser();
  
  // Log user context on each render and when it changes
  useEffect(() => {
    if (!userContext) return;
    
    console.log('[HostContainer] User context state:', {
      hasUser: !!userContext?.user,
      isLoading: userContext?.loading,
      hasError: !!userContext?.error,
      userData: userContext?.user ? {
        id: userContext.user.id,
        role: userContext.user.role,
        tenant: userContext.user.tenant_id
      } : null,
      renderCount: renderCount.current
    });
  }, [userContext]);
  
  const [showAddHost, setShowAddHost] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [selectMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    password: '',
  });

  // Use the centralized context with proper hooks
  const hostContext = useHost();

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

  const {
    hosts,
    loading,
    error,
    fetchHosts,
    addHost,
    removeHost,
    testConnection,
    testAllConnections,
  } = hostContext;

  // Memoize user data to prevent dependency loop
  const userData = userContext?.user;

  // Add logging to track when host data changes
  useEffect(() => {
    console.log('[HostContainer] Hosts data updated', { 
      hostCount: hosts?.length || 0,
      loading,
      error,
      renderCount: renderCount.current
    });
  }, [hosts, loading, error]);

  // Fetch hosts on initial mount
  useEffect(() => {
    if ((!hosts || hosts.length === 0) && !loading) {
      console.log('[HostContainer] Initial mount - fetching hosts data');
      fetchHosts && fetchHosts();
    }
  }, [hosts, loading, fetchHosts]);

  // Handle refresh all hosts - pass user data from context
  const handleRefreshAll = useCallback(async () => {
    if (isRefreshing) return;
    
    console.log('[HostContainer] Refreshing all hosts');
    setIsRefreshing(true);
    try {
      // Pass user data to prevent redundant auth
      if (userData) {
        await testAllConnections(userData);
      } else {
        await testAllConnections();
      }
    } finally {
      setIsRefreshing(false);
      console.log('[HostContainer] Host refresh complete');
    }
  }, [isRefreshing, testAllConnections, userData]);

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
        status: 'connected',
        created_at: new Date(),
      };
    
      // Pass user data to prevent redundant auth
      if (userData) {
        await addHost(hostData, userData);
      } else {
        await addHost(hostData);
      }
      
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
    } catch (error) {
      console.error('[HostContainer] Error adding host:', error);
    } finally {
      setIsSaving(false);
    }
  }, [addHost, formData, userData]);

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

  // Add logging for each render
  console.log('[DEBUG] HostContainer rendering', { 
    hostCount: hosts?.length || 0, 
    loading, 
    viewMode 
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Hosts</h1>
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
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddHost(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Host
          </Button>
        </div>
      </div>

      {loading && hosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <RefreshCw className="h-8 w-8 animate-spin mb-4" />
          <p className="text-muted-foreground">Loading hosts...</p>
        </div>
      ) : !loading && hosts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No hosts found</p>
          <Button onClick={() => setShowAddHost(true)} className="mt-4">
            Add your first host
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <HostGrid
          hosts={hosts}
          selectedHosts={selectedHosts}
          selectMode={selectMode}
          onSelect={handleSelectHost}
          onDelete={removeHost}
          onTestConnection={(host: Host) => testConnection(host.id)}
        />
      ) : (
        <HostTable
          hosts={hosts}
          onDelete={removeHost}
          onTestConnection={(host: Host) => testConnection(host.id)}
        />
      )}

      <Dialog open={showAddHost} onOpenChange={setShowAddHost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Host</DialogTitle>
          </DialogHeader>
          <ConnectionForm 
            formData={formData} 
            onChange={setFormData} 
            onSave={handleSaveHost}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
