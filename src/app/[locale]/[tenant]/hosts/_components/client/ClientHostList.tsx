'use client';

import { Plus, RefreshCw, Grid, List } from 'lucide-react';
import { useState, useCallback, useTransition, useOptimistic } from 'react';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Host } from '../../types';
import { 
  testHostConnection, 
  createHost as createHostAction, 
  deleteHost as deleteHostAction 
} from '@/app/actions/hosts';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

import { ClientConnectionForm, FormData } from './ClientConnectionForm';
import { HostGrid } from '../HostGrid';
import { HostTable } from '../HostTable';

interface ClientHostListProps {
  initialHosts: Host[];
}

// Update the Host type to include animationDelay
type HostWithAnimation = Host & { animationDelay?: number };

export default function ClientHostList({ initialHosts }: ClientHostListProps) {
  // Component state
  const [hosts, setHosts] = useState<HostWithAnimation[]>(initialHosts);
  const [isPending, startTransition] = useTransition();
  const [showAddHost, setShowAddHost] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testingIndex, setTestingIndex] = useState<number>(-1);
  const t = useTranslations('Common');
  
  // Set up optimistic state updates
  const [optimisticHosts, addOptimisticHost] = useOptimistic(
    hosts,
    (state, update: { action: string; host?: Host; id?: string; index?: number }) => {
      if (update.action === 'add' && update.host) {
        return [...state, update.host];
      } else if (update.action === 'delete' && update.id) {
        return state.filter(host => host.id !== update.id);
      } else if (update.action === 'update' && update.host) {
        return state.map(host => 
          host.id === update.host?.id ? { ...update.host, animationDelay: update.index } : host
        );
      }
      return state;
    }
  );
  
  // Form data for adding a host
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    password: '',
  });

  // Handle testing a host connection
  const handleTestConnection = useCallback(async (host: Host, index: number) => {
    try {
      // Optimistic UI update with proper typing and animation delay
      const optimisticHost = { 
        ...host, 
        status: 'testing' as const,
        animationDelay: index 
      };
      
      addOptimisticHost({ action: 'update', host: optimisticHost, index });
      setTestingIndex(index);
      
      const result = await testHostConnection(host.id);
      
      if (result.success) {
        // Update state with new status
        setHosts(prev => 
          prev.map(h => 
            h.id === host.id ? { ...h, status: 'connected' as const } : h
          )
        );
      } else {
        // Update state with failed status
        setHosts(prev => 
          prev.map(h => 
            h.id === host.id ? { ...h, status: 'failed' as const } : h
          )
        );
      }
      
      return result.success;
    } catch (error) {
      console.error('Error testing connection:', error);
      return false;
    }
  }, [addOptimisticHost]);

  // Handle refresh all hosts
  const handleRefreshAll = useCallback(async () => {
    if (isRefreshing) return;

    console.log('[HostContainer] Refreshing all hosts');
    setIsRefreshing(true);

    try {
      // Test hosts sequentially with animation delays
      for (let i = 0; i < hosts.length; i++) {
        await handleTestConnection(hosts[i], i);
        // Delay between hosts for visual feedback
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log('[HostContainer] All hosts tested successfully');
    } catch (error) {
      console.error('[HostContainer] Error refreshing hosts:', error);
    } finally {
      setIsRefreshing(false);
      setTestingIndex(-1);
      console.log('[HostContainer] Host refresh complete');
    }
  }, [isRefreshing, handleTestConnection, hosts]);

  // Handle adding a new host
  const handleSaveHost = useCallback(async () => {
    try {
      setIsSaving(true);
      
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
      
      // Optimistic UI update with temporary ID
      const tempId = `temp-${Date.now()}`;
      const optimisticHost = { 
        ...hostData, 
        id: tempId,
      };
      
      addOptimisticHost({ action: 'add', host: optimisticHost as Host });
      
      // Start server action in a transition
      startTransition(async () => {
        const result = await createHostAction(hostData);
        
        if (result.success && result.data) {
          // Update hosts array with the real data from the server
          setHosts(prev => [
            ...prev.filter(h => h.id !== tempId), // Remove optimistic entry
            result.data as Host // Add the real entry
          ]);
          
          // Close dialog and reset form
          setShowAddHost(false);
          setFormData({
            name: '',
            description: '',
            type: 'ssh',
            ip: '',
            port: '22',
            username: '',
            password: '',
          });
        } else {
          // Remove optimistic entry on failure
          setHosts(prev => prev.filter(h => h.id !== tempId));
        }
      });
    } catch (error) {
      console.error('Error adding host:', error);
    } finally {
      setIsSaving(false);
    }
  }, [formData, addOptimisticHost]);

  // Handle host selection
  const handleSelectHost = useCallback((id: string) => {
    setSelectedHosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Handle deleting a host
  const removeHost = useCallback(async (id: string) => {
    try {
      // Optimistic UI update
      addOptimisticHost({ action: 'delete', id });
      
      // Start server action in a transition
      startTransition(async () => {
        const result = await deleteHostAction(id);
        
        if (result.success) {
          // Update hosts array
          setHosts(prev => prev.filter(h => h.id !== id));
        } else {
          // Revert optimistic update on failure
          setHosts(prev => {
            const host = initialHosts.find(h => h.id === id);
            return host ? [...prev, host] : prev;
          });
        }
      });
    } catch (error) {
      console.error('Error deleting host:', error);
      // Revert optimistic update on error
      setHosts(initialHosts);
    }
  }, [initialHosts, addOptimisticHost]);

  // Empty state for no hosts
  if (optimisticHosts.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div></div>
          <div className="flex items-center space-x-2">
            <div className="border rounded-md p-1 mr-2">
              <Button
                variant="default"
                size="sm"
                className="px-2"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
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
              disabled={isRefreshing || isPending}
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
        
        <Dialog open={showAddHost} onOpenChange={setShowAddHost}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Host</DialogTitle>
            </DialogHeader>
            <ClientConnectionForm
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing || hosts.length === 0}
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-2', {
                'animate-spin': isRefreshing,
              })}
            />
            {t('refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
          >
            {viewMode === 'grid' ? (
              <List className="h-4 w-4" />
            ) : (
              <Grid className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Button onClick={() => setShowAddHost(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('addHost')}
        </Button>
      </div>

      {viewMode === 'grid' ? (
        <HostGrid
          hosts={optimisticHosts as HostWithAnimation[]}
          selectedHosts={selectedHosts}
          selectMode={false}
          onSelect={() => {}}
          onDelete={removeHost}
          onTestConnection={(host) => handleTestConnection(host, testingIndex)}
        />
      ) : (
        <HostTable
          hosts={optimisticHosts as HostWithAnimation[]}
          selectedHosts={selectedHosts}
          selectMode={false}
          onSelect={() => {}}
          onDelete={removeHost}
          onTestConnection={(host) => handleTestConnection(host, testingIndex)}
        />
      )}

      <Dialog open={showAddHost} onOpenChange={setShowAddHost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Host</DialogTitle>
          </DialogHeader>
          <ClientConnectionForm
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