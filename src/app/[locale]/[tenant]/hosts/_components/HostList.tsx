'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HostCard } from './HostCard';
import { ConnectForm, FormData } from './ConnectForm';
import { Host } from '@/types/hosts';
import { hostsApi } from '@/lib/api/hosts';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Plus, RefreshCw, Grid, List } from 'lucide-react';
import { HostTable } from './HostTable';
import { HostGrid } from './HostGrid';

export default function HostList() {
  const { locale = 'en', tenant = 'default' } = useParams();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingHosts, setTestingHosts] = useState<Record<string, boolean>>({});
  const [showAddHost, setShowAddHost] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
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

  const fetchHosts = useCallback(async () => {
    console.log('Fetching hosts...');
    setLoading(true);
    try {
      // Fetch the hosts without testing connections
      const fetchedHosts = await hostsApi.getHosts(String(locale));
      console.log('Hosts fetched successfully:', fetchedHosts);
      
      // Update the hosts state
      setHosts([...fetchedHosts]);
      
      return fetchedHosts;
    } catch (error) {
      console.error('Error fetching hosts:', error);
      toast.error("Failed to fetch hosts");
      return [];
    } finally {
      setLoading(false);
    }
  }, [locale]);

  // Test a single host connection
  const testHostConnection = async (host: Host, silent: boolean = false) => {
    // Skip if already testing this host
    if (testingHosts[host.id]) return { success: false, message: 'Already testing' };
    
    // Set testing flag for this host
    setTestingHosts(prev => ({ ...prev, [host.id]: true }));
    
    // Set status to pending for this host
    setHosts(prevHosts => 
      prevHosts.map(h => 
        h.id === host.id ? { ...h, status: 'pending' } : h
      )
    );
    
    try {
      // Test this specific host
      const result = await hostsApi.testConnection(String(locale), {
        type: host.type,
        ip: host.ip,
        port: host.port,
        username: host.user,
        password: host.password,
        hostId: host.id,
      });
      
      // Update this host's status based on the result
      setHosts(prevHosts => 
        prevHosts.map(h => 
          h.id === host.id 
            ? { 
                ...h, 
                status: result.success ? 'connected' : 'failed',
                errorMessage: result.success ? null : (result.message || 'Unknown error'),
                lastConnected: result.success ? new Date().toISOString() : h.lastConnected
              } 
            : h
        )
      );
      
      if (!silent) {
        if (result.success) {
          toast.success(`Connection to ${host.name} successful`);
        } else {
          toast.error(`Connection to ${host.name} failed: ${result.message || 'Unknown error'}`);
        }
      }
      
      // Clear testing flag
      setTestingHosts(prev => ({ ...prev, [host.id]: false }));
      
      return result;
    } catch (error) {
      console.error(`Error testing connection for host ${host.name}:`, error);
      
      // Update this host as failed
      setHosts(prevHosts => 
        prevHosts.map(h => 
          h.id === host.id 
            ? { 
                ...h, 
                status: 'failed',
                errorMessage: 'Connection test failed'
              } 
            : h
        )
      );
      
      if (!silent) {
        toast.error(`Failed to test connection to ${host.name}`);
      }
      
      // Clear testing flag
      setTestingHosts(prev => ({ ...prev, [host.id]: false }));
      
      return { success: false, message: 'Connection test failed' };
    }
  };

  // Test all connections one by one
  const testAllHostsSequentially = async (hostsToTest?: Host[]) => {
    const currentHosts = hostsToTest || [...hosts];
    let testedCount = 0;
    
    // Process hosts one by one
    for (const host of currentHosts) {
      // Skip if already testing this host
      if (testingHosts[host.id]) continue;
      
      await testHostConnection(host, true); // Silent mode for bulk testing
      testedCount++;
      
      // Small delay between tests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // No toast needed - visual feedback is enough
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
  }, [locale]); // Only depend on locale

  const handleDelete = async (id: string) => {
    try {
      await hostsApi.deleteHost(String(locale), id);
      
      // Update local state directly instead of fetching all hosts again
      setHosts(currentHosts => currentHosts.filter(host => host.id !== id));
      
      toast.success("Host deleted successfully");
    } catch (error) {
      toast.error("Failed to delete host");
    }
  };

  const handleTestConnection = async (host: Host) => {
    console.log('Testing connection for host:', { id: host.id, name: host.name });
    await testHostConnection(host);
  };

  const handleSaveHost = async () => {
    try {
      // We only allow saving if the connection test was successful,
      // so we can set the status to 'connected' directly
      const newHost = await hostsApi.createHost(String(locale), {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        ip: formData.ip,
        port: parseInt(formData.port),
        user: formData.username, // API expects user, but form has username
        password: formData.password,
        status: 'connected', // Set status to connected since we've already tested it
        lastConnected: new Date().toISOString(), // Set lastConnected to current date
      });
      
      // Close dialog
      setShowAddHost(false);
      
      // Add the new host to the state directly
      setHosts(currentHosts => [newHost, ...currentHosts]);
      
      // Reset form data
      setFormData({
        name: '',
        description: '',
        type: 'ssh',
        ip: '',
        port: '22',
        username: '',
        password: '',
      });
      
      // No toast needed - visual feedback is enough
    } catch (error) {
      console.error('Error saving host:', error);
      toast.error("Failed to create host");
    }
  };

  const handleSelectHost = (id: string) => {
    setSelectedHosts(prev => {
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
          <Button onClick={() => testAllHostsSequentially()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
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
        <HostTable 
          hosts={hosts} 
          onDelete={handleDelete} 
          onTestConnection={handleTestConnection} 
        />
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