'use client';

import { Plus, RefreshCw, Grid, List } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { hostsApi } from '@/lib/api/hosts';
import { Host } from '@/types/hosts';

import { ConnectForm, FormData } from './ConnectForm';
import { HostGrid } from './HostGrid';
import { HostTable } from './HostTable';

export default function HostContainer() {
  const { locale = 'en', tenant = 'default' } = useParams();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingHosts, setTestingHosts] = useState<Record<string, boolean>>({});
  const [showAddHost, setShowAddHost] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [selectMode] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    password: '',
  });
  const router = useRouter();
  const [isTestingAll, setIsTestingAll] = useState(false);

  const fetchHosts = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching hosts...');
      const fetchedHosts = await hostsApi.getHosts();
      console.log('Hosts fetched successfully:', fetchedHosts);

      // Process hosts for UI display
      const processedHosts = fetchedHosts.map((host: Host) => ({ 
        ...host, 
        // Ensure status is set
        status: host.status || 'pending',
        // For UI display: use existing lastConnected or set to createdAt date
        lastConnected: host.lastConnected || host.createdAt
      }));
      
      setHosts(processedHosts);

      return processedHosts;
    } catch (error) {
      console.error('Error fetching hosts:',error);
      toast.error('Failed to fetch hosts');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Test a single host connection
  const testHostConnection = async (host: Host, silent: boolean = false) => {
    if (!silent) {
      setTestingHosts((prev) => ({ ...prev, [host.id]: true }));
    }

    try {
      console.log(`Testing connection for host ${host.name}...`);
      const result = await hostsApi.testConnection({
        type: host.type,
        ip: host.ip,
        port: host.port,
        username: host.user,
        hostId: host.id,
      });

      setHosts((prevHosts) =>
        prevHosts.map((h) =>
          h.id === host.id
            ? {
                ...h,
                status: result.success ? 'connected' : 'failed',
                errorMessage: result.success ? null : result.message || 'Unknown error',
                lastConnected: result.success ? new Date() : h.lastConnected,
              }
            : h,
        ),
      );

      if (!silent) {
        if (result.success) {
          toast.success(`Connection to ${host.name} successful`);
        } else {
          toast.error(`Connection to ${host.name} failed: ${result.message || 'Unknown error'}`);
        }
      }

      setTestingHosts((prev) => ({ ...prev, [host.id]: false }));

      return result;
    } catch (error) {
      console.error(`Error testing connection for host ${host.name}:`,error);

      setHosts((prevHosts) =>
        prevHosts.map((h) =>
          h.id === host.id
            ? {
                ...h,
                status: 'failed',
                errorMessage: 'Connection test failed',
              }
            : h,
        ),
      );

      if (!silent) {
        toast.error(`Failed to test connection to ${host.name}`);
      }

      setTestingHosts((prev) => ({ ...prev, [host.id]: false }));

      return { success: false, message: 'Connection test failed' };
    }
  };

  // Test all connections one by one
  const testAllHostsSequentially = async (hostsToTest?: Host[]) => {
    setIsTestingAll(true);
    const currentHosts = hostsToTest || [...hosts];
    for (const host of currentHosts) {
      await testHostConnection(host, true);
    }
    setIsTestingAll(false);
  };

  useEffect(() => {
    let isMounted = true;

    const loadHostsAndTest = async () => {
      const fetchedHosts = await fetchHosts();

      // Only proceed if component is still mounted
      if (!isMounted) return;

      if (fetchedHosts.length > 0) {
        // Test all fetched hosts
        await testAllHostsSequentially(fetchedHosts);
      }
    };

    loadHostsAndTest();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Only depend on locale

  const handleDelete = async (id: string) => {
    // Store the host being deleted in case we need to restore it
    const hostToDelete = hosts.find(host => host.id === id);
    
    // Optimistically update UI first
    setHosts((currentHosts) => currentHosts.filter((host) => host.id !== id));
    
    // Show optimistic toast
    toast.success('Host deleted');
    
    try {
      // Then perform the actual deletion in the background
      await hostsApi.deleteHost(id);
    } catch (error) {
      // If deletion fails, restore the host and show error
      console.error('Error deleting host:', error);
      if (hostToDelete) {
        setHosts(currentHosts => [...currentHosts, hostToDelete]);
      }
      toast.error('Failed to delete host. The host has been restored.');
    }
  };

  const handleTestConnection = async (host: Host) => {
    console.log('Testing connection for host:', { id: host.id, name: host.name });
    await testHostConnection(host);
  };

  const handleSaveHost = async () => {
    try {
      const newHost = await hostsApi.createHost({
        name: formData.name,
        description: formData.description,
        type: formData.type,
        ip: formData.ip,
        port: parseInt(formData.port),
        user: formData.username,
        password: formData.password,
        status: 'connected',
      });

      setShowAddHost(false);
      
      // Add lastConnected field for UI display purposes
      const hostWithLastConnected = {
        ...newHost,
        lastConnected: new Date()
      };
      
      setHosts((currentHosts) => [hostWithLastConnected, ...currentHosts]);

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
      console.error('Error saving host:',error);
      toast.error('Failed to create host');
    }
  };

  const handleSelectHost = (id: string) => {
    setSelectedHosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

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
          <Button onClick={() => testAllHostsSequentially(hosts)} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isTestingAll ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddHost(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Host
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading hosts...</div>
      ) : hosts.length === 0 ? (
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
          onDelete={handleDelete}
          onTestConnection={handleTestConnection}
        />
      ) : (
        <HostTable hosts={hosts} onDelete={handleDelete} onTestConnection={handleTestConnection} />
      )}

      <Dialog open={showAddHost} onOpenChange={setShowAddHost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Host</DialogTitle>
          </DialogHeader>
          <ConnectForm
            formData={formData}
            onChange={setFormData}
            onSave={handleSaveHost}
            onTestSuccess={() => {
              // Do nothing special on test success
              // The save button will be enabled
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
