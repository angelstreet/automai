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

import { ClientConnectionForm, FormData } from './ClientConnectionForm';
import { HostGrid } from '../HostGrid';
import { HostTable } from '../HostTable';
import { useToast } from '@/components/shadcn/use-toast';

interface ClientHostListProps {
  initialHosts: Host[];
}

export default function ClientHostList({ initialHosts }: ClientHostListProps) {
  // Component state
  const [hosts, setHosts] = useState<Host[]>(initialHosts);
  const [isPending, startTransition] = useTransition();
  const [showAddHost, setShowAddHost] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  // Set up optimistic state updates
  const [optimisticHosts, addOptimisticHost] = useOptimistic(
    hosts,
    (state, update: { action: string; host?: Host; id?: string }) => {
      if (update.action === 'add' && update.host) {
        return [...state, update.host];
      } else if (update.action === 'delete' && update.id) {
        return state.filter(host => host.id !== update.id);
      } else if (update.action === 'update' && update.host) {
        return state.map(host => 
          host.id === update.host?.id ? update.host : host
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
  const handleTestConnection = useCallback(async (host: Host) => {
    try {
      setIsRefreshing(true);
      
      // Optimistic UI update
      const optimisticHost = { ...host, status: 'testing' };
      addOptimisticHost({ action: 'update', host: optimisticHost });
      
      const result = await testHostConnection(host.id);
      
      if (result.success) {
        // Update state with new status
        setHosts(prev => 
          prev.map(h => 
            h.id === host.id ? { ...h, status: 'connected' } : h
          )
        );
        
        toast({
          title: "Connection successful",
          description: `Connected to ${host.name} successfully`,
        });
      } else {
        // Update state with failed status
        setHosts(prev => 
          prev.map(h => 
            h.id === host.id ? { ...h, status: 'failed' } : h
          )
        );
        
        toast({
          title: "Connection failed",
          description: result.error || "Could not connect to host",
          variant: "destructive",
        });
      }
      
      return result.success;
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Connection error",
        description: String(error) || "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [addOptimisticHost, toast]);

  // Handle refresh all hosts
  const handleRefreshAll = useCallback(async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      
      // Update all hosts to testing state for UI feedback
      const updatedHosts = hosts.map(host => ({ ...host, status: 'testing' }));
      setHosts(updatedHosts);
      
      // Test each host sequentially
      for (const host of hosts) {
        await handleTestConnection(host);
        // Small delay between hosts for visual feedback
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      toast({
        title: "Refresh complete",
        description: `Tested all ${hosts.length} hosts`,
      });
    } catch (error) {
      console.error('Error refreshing hosts:', error);
      toast({
        title: "Refresh failed",
        description: String(error) || "Failed to refresh hosts",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, hosts, handleTestConnection, toast]);

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
          
          toast({
            title: "Host added",
            description: `Added ${result.data.name} successfully`,
          });
        } else {
          // Remove optimistic entry on failure
          setHosts(prev => prev.filter(h => h.id !== tempId));
          
          toast({
            title: "Failed to add host",
            description: result.error || "Could not add host",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error('Error adding host:', error);
      toast({
        title: "Error",
        description: String(error) || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [formData, addOptimisticHost, toast]);

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
          
          toast({
            title: "Host deleted",
            description: "Host was successfully removed",
          });
        } else {
          // Revert optimistic update on failure
          setHosts(prev => {
            const host = initialHosts.find(h => h.id === id);
            return host ? [...prev, host] : prev;
          });
          
          toast({
            title: "Failed to delete host",
            description: result.error || "Could not delete host",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error('Error deleting host:', error);
      // Revert optimistic update on error
      setHosts(initialHosts);
      
      toast({
        title: "Error",
        description: String(error) || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [initialHosts, addOptimisticHost, toast]);

  // Empty state for no hosts
  if (optimisticHosts.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
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

      {viewMode === 'grid' ? (
        <HostGrid
          hosts={optimisticHosts}
          selectedHosts={selectedHosts}
          selectMode={false}
          onSelect={handleSelectHost}
          onDelete={removeHost}
          onTestConnection={handleTestConnection}
        />
      ) : (
        <HostTable 
          hosts={optimisticHosts} 
          onDelete={removeHost} 
          onTestConnection={handleTestConnection} 
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