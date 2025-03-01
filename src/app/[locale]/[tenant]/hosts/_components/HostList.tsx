'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HostCard } from './HostCard';
import { ConnectForm, FormData } from './ConnectForm';
import { Host } from '@/types/hosts';
import { hostsApi } from '@/lib/api/hosts';
import { toast } from '@/components/shadcn/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Plus, RefreshCw } from 'lucide-react';

export default function HostList() {
  const { locale = 'en', tenant = 'default' } = useParams();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingHosts, setTestingHosts] = useState<Record<string, boolean>>({});
  const [showAddHost, setShowAddHost] = useState(false);
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
    
    // Show a single toast at the end
    if (testedCount > 0) {
      toast.success(`Tested connections for ${testedCount} hosts`);
    }
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
      
      toast.success("Host created successfully");
    } catch (error) {
      console.error('Error saving host:', error);
      toast.error("Failed to create host");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Hosts</h1>
        <div className="space-x-2">
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" key={hosts.map(h => h.id).join(',')}>
          {hosts.map((host) => (
            <HostCard
              key={host.id}
              host={host}
              onDelete={handleDelete}
              onTestConnection={handleTestConnection}
            />
          ))}
        </div>
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